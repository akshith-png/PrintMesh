import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    service: "PrintMesh API",
    status: "ok",
    supabaseConfigured: hasSupabaseConfig(),
    timestamp: new Date().toISOString(),
  });
}