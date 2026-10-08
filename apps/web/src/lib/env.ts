import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  PRINTMESH_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(26214400),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  PRINTMESH_MAX_UPLOAD_BYTES: process.env.PRINTMESH_MAX_UPLOAD_BYTES ?? "26214400",
});

export function hasSupabaseConfig() {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !env.NEXT_PUBLIC_SUPABASE_URL.includes("example.supabase.co") &&
      !env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("example") &&
      !env.SUPABASE_SERVICE_ROLE_KEY?.includes("example"),
  );
}
