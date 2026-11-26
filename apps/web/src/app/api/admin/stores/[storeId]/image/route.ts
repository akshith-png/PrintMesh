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
  const path = `${store.id}/${crypto.randomUUID()}`;
  const upload = await db.storage.from("store-images").upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (upload.error) return NextResponse.json({ error: `Image upload failed: ${upload.error.message}` }, { status: 502 });
  const { data: url } = db.storage.from("store-images").getPublicUrl(path);
  const { error } = await db.from("merchants").update({ image_url: url.publicUrl }).eq("id", store.id);
  if (error) return NextResponse.json({ error: `Image record update failed: ${error.message}` }, { status: 400 });
  return NextResponse.json({ imageUrl: url.publicUrl });
}
