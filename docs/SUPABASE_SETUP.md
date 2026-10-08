# Supabase setup

The repository contains the complete migration sequence under `database/migrations`. Apply the files in numeric order to a new Supabase project using the Supabase SQL editor or CLI. The Storage bucket and row-level policies are defined by `002_security_storage.sql`; keep the bucket private.

Configure these values only in the hosting provider's secret store or an ignored local `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
APP_BASE_URL=https://<production-domain>
```

The application rejects the repository's example placeholders as a valid production configuration. After applying migrations, validate `/api/health`, customer upload, merchant authentication, agent enrollment, private Storage download, and the retention functions against the live project. No live Supabase project credentials are present in this repository, so live validation cannot be truthfully performed from this machine.
