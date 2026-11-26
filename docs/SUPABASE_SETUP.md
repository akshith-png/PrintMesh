# Supabase setup

The repository contains the complete migration sequence under `database/migrations`. Apply the files in numeric order to a new Supabase project using the Supabase SQL editor or CLI. The `store-images` bucket is created by migration `011_store_images.sql` as public; image rendering still goes through the app's same-origin proxy.

Configure these values only in the hosting provider's secret store or an ignored local `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
APP_BASE_URL=https://<production-domain>
NEXT_PUBLIC_SITE_URL=https://<production-domain>
PRINTMESH_OWNER_EMAILS=owner@example.com
```

The application rejects the repository's example placeholders as a valid production configuration. After applying migrations, validate `/api/health`, customer upload, merchant authentication, agent enrollment, private Storage download, and the retention functions against the live project. No live Supabase project credentials are present in this repository, so live validation cannot be truthfully performed from this machine.
