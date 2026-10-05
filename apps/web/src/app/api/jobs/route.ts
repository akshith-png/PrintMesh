import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadSchema = z.object({
  copies: z.coerce.number().int().min(1).max(100).default(1),
  colorMode: z.enum(["BW", "COLOR"]).default("BW"),
  duplex: z.coerce.boolean().default(false),
  paperSize: z.enum(["A4", "A3", "LETTER"]).default("A4"),
});

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Only application/pdf is accepted." }, { status: 400 });
  if (file.size > env.PRINTMESH_MAX_UPLOAD_BYTES) return NextResponse.json({ error: "PDF exceeds the configured size limit." }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = new TextDecoder().decode(bytes.slice(0, 5));
  if (signature !== "%PDF-") return NextResponse.json({ error: "Invalid PDF signature." }, { status: 400 });
  const options = uploadSchema.parse({
    copies: form.get("copies") ?? 1,
    colorMode: form.get("colorMode") ?? "BW",
    duplex: form.get("duplex") ?? false,
    paperSize: form.get("paperSize") ?? "A4",
  });
  return NextResponse.json({
    status: "ACCEPTED_FOR_BACKEND",
    originalFilename: file.name,
    sizeBytes: file.size,
    options,
    message: "Supabase persistence is wired in Block 1; job persistence is enabled in the next backend implementation block.",
  }, { status: 202 });
}

export async function GET() {
  return NextResponse.json({ jobs: [], message: "Job listing is enabled after Supabase persistence is connected." });
}