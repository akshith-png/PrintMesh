import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { env, hasSupabaseConfig } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { distributedRateLimit } from "@/lib/distributed-rate-limit";
import { requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optionsSchema = z.object({
  copies: z.coerce.number().int().min(1).max(100).default(1),
  colorMode: z.enum(["BW", "COLOR"]).default("BW"),
  duplex: z.coerce.boolean().default(false),
  paperSize: z.enum(["A4", "A3", "LETTER"]).default("A4"),
});
const idempotencyKeySchema = z.string().uuid();
const demoMerchantId = "00000000-0000-0000-0000-000000000001";
const demoJobId = "pmj_00000000000000000000000000000001";

function safeFilename(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

export async function POST(request: Request) {
  try {
    const previewForm = request.clone();
    const previewData = await previewForm.formData();
    const previewMerchantId = String(previewData.get("merchantId") ?? "").trim();
    const requestLimit = previewMerchantId === demoMerchantId ? { allowed: true, retryAfterSeconds: 0 } : await distributedRateLimit(requestKey(request, "customer-job"), 10);
    if (!requestLimit.allowed) {
      return NextResponse.json({ error: "Too many upload attempts. Try again shortly." }, {
        status: 429,
        headers: { "retry-after": String(requestLimit.retryAfterSeconds) },
      });
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
    const supportedImage = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
    if (file.type !== "application/pdf" && !supportedImage) return NextResponse.json({ error: "Upload a PDF, PNG, JPEG, or WebP image." }, { status: 400 });
    if (file.size <= 0) return NextResponse.json({ error: "The PDF is empty." }, { status: 400 });
    if (file.size > env.PRINTMESH_MAX_UPLOAD_BYTES) return NextResponse.json({ error: "PDF exceeds the configured size limit." }, { status: 413 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const signature = new TextDecoder().decode(bytes.slice(0, 5));
    if (file.type === "application/pdf" && signature !== "%PDF-") return NextResponse.json({ error: "Invalid PDF signature." }, { status: 400 });

    const options = optionsSchema.parse({
      copies: form.get("copies") ?? 1,
      colorMode: form.get("colorMode") ?? "BW",
      duplex: form.get("duplex") ?? false,
      paperSize: form.get("paperSize") ?? "A4",
    });

    const merchantId = String(form.get("merchantId") ?? "").trim();
    if (!merchantId || !z.string().uuid().safeParse(merchantId).success) {
      return NextResponse.json({ error: "A valid merchantId is required." }, { status: 400 });
    }

    if (!hasSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      if (merchantId === demoMerchantId) {
        return NextResponse.json({ status: "QUEUED", jobId: demoJobId, merchant: "PrintMesh Demo Store", originalFilename: file.name, sizeBytes: file.size, options, demo: true }, { status: 201 });
      }
      return NextResponse.json({
        status: "VALIDATED_DEV_ONLY",
        originalFilename: file.name,
        sizeBytes: file.size,
        options,
        message: "PDF validation passed. Configure Supabase environment variables to persist the job."
      }, { status: 202 });
    }

    const requestedIdempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (requestedIdempotencyKey && !idempotencyKeySchema.safeParse(requestedIdempotencyKey).success) {
      return NextResponse.json({ error: "Idempotency-Key must be a UUID." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const cleanName = safeFilename(file.name);
    const jobSeed = requestedIdempotencyKey ?? crypto.randomUUID();
    const storagePath = `${merchantId}/${jobSeed}/${cleanName}`;

    const { data: merchant, error: merchantError } = await supabase
      .from("merchants").select("id,name").eq("id", merchantId).single();
    if (merchantError || !merchant) return NextResponse.json({ error: "Merchant not found." }, { status: 404 });

    if (requestedIdempotencyKey) {
      const { data: existingJob, error: existingJobError } = await supabase
        .from("print_jobs")
        .select("id,public_id,status,merchant_id,print_files(original_filename,size_bytes)")
        .eq("merchant_id", merchantId)
        .eq("idempotency_key", requestedIdempotencyKey)
        .maybeSingle();
      if (existingJobError) return NextResponse.json({ error: existingJobError.message }, { status: 502 });
      if (existingJob) {
        return NextResponse.json({
          status: existingJob.status,
          jobId: existingJob.public_id,
          merchant: merchant.name,
          idempotentReplay: true,
        }, { status: 200 });
      }
    }

    const { error: uploadError } = await supabase.storage
      .from("print-files").upload(storagePath, bytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadError) return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 502 });

    const { data: jobId, error: rpcError } = await supabase.rpc("create_customer_print_job", {
      p_merchant_id: merchantId,
      p_original_filename: file.name,
      p_storage_path: storagePath,
      p_size_bytes: file.size,
      p_sha256: createHash("sha256").update(bytes).digest("hex"),
      p_idempotency_key: jobSeed,
      p_copies: options.copies,
      p_color_mode: options.colorMode,
      p_duplex: options.duplex,
      p_paper_size: options.paperSize,
    });

    if (rpcError || !jobId) {
      await supabase.storage.from("print-files").remove([storagePath]);
      return NextResponse.json({ error: `Job creation failed: ${rpcError?.message ?? "Unknown error"}` }, { status: 502 });
    }

    const { data: publicJob, error: publicJobError } = await supabase
      .from("print_jobs")
      .select("public_id,status")
      .eq("id", jobId)
      .single();
    if (publicJobError || !publicJob) return NextResponse.json({ error: "Job was created but could not be loaded." }, { status: 502 });

    return NextResponse.json({
      status: publicJob.status,
      jobId: publicJob.public_id,
      merchant: merchant.name,
      originalFilename: file.name,
      sizeBytes: file.size,
      options,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
