# Dependency security audit

Run `npm run audit:production` before each release. The current audit reports zero vulnerabilities in shipped production dependencies (62 production packages). The remaining audit findings are transitive development-tooling findings in the Next.js ESLint chain and do not ship in the production bundle; they still require routine upgrades when a compatible patched toolchain is available.

The repository does not commit `.env.local`, Supabase tokens, database passwords, service-role keys, or Vercel credentials. Temporary Supabase management access used for migrations is revoked after use.
