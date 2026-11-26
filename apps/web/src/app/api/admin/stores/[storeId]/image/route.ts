import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  if (!(await requireOwner())) return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  const { storeId } = await params;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "An image file is required." }, { status: 400 });
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return NextResponse.json({ error: "Use a PNG, JPEG, or WebP image." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 413 });
  const db = createSupabaseAdminClient();
  const { data: store } = await db.from("merchants").select("id").eq("id", storeId).maybeSingle();
  if (!store) return NextResponse.json({ error: "Store not found." }, { status: 404 });
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${store.id}/${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const upload = await db.storage.from("store-images").upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "3600" });
  if (upload.error) return NextResponse.json({ error: `Image upload failed: ${upload.error.message}` }, { status: 502 });
  const verify = await db.storage.from("store-images").download(path);
  if (verify.error || !verify.data) return NextResponse.json({ error: `Image verification failed: ${verify.error?.message ?? "Object was not readable after upload."}` }, { status: 502 });
  const { data: url } = await db.storage.from("store-images").createSignedUrl(path, 60 * 60 * 24 * 365);
  if (!url?.signedUrl) return NextResponse.json({ error: "Image uploaded but could not create a display URL." }, { status: 502 });
  const { error } = await db.from("merchants").update({ image_url: path }).eq("id", store.id);
  if (error) return NextResponse.json({ error: `Image record update failed: ${error.message}` }, { status: 400 });
  return NextResponse.json({ imageUrl: url.signedUrl });
}
