import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const objectPath = path.join("/");
  const { data, error } = await createSupabaseAdminClient().storage.from("store-images").download(objectPath);
  if (error || !data) return NextResponse.json({ error: `Image unavailable: ${error?.message ?? "Not found"}` }, { status: 404 });
  return new NextResponse(data, { headers: { "content-type": data.type || "image/jpeg", "cache-control": "public, max-age=3600" } });
}
