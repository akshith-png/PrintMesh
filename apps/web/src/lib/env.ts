import { z } from "zod";

function optionalUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    return z.string().url().parse(trimmed);
  } catch {
    // A malformed dashboard value must not make the entire Vercel build fail.
    // Runtime health/configuration checks will report the deployment as unconfigured.
    return undefined;
  }
}

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  PRINTMESH_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(26214400),
});

export const env = envSchema.parse({
  // Vercel can materialize an unset secret as an empty string during build.
  // Normalize that representation so optional configuration remains optional
  // and route generation does not fail before runtime health checks can report it.
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined,
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
