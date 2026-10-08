# PrintMesh V1 operations

Build the self-contained Windows package with `scripts/publish-agent.ps1`. Run `scripts/install-agent.ps1` on the merchant PC using the production API URL and the one-time enrollment token from the dashboard. It installs the agent under Program Files, stores configuration under ProgramData, and creates an auto-start task. No secrets are committed.

After setup, run the published executable with `--discover-printers`, then `--set-printer "<exact Windows printer name>"`. Windows virtual printers are valid software-test targets; physical paper is a separate hardware acceptance test.

Set Supabase and hosting secrets only in the provider secret store. Apply `database/migrations` in numeric order and keep Storage private. The durable agent journal prevents a restart from printing a handed-off job twice. Failed API calls retry with bounded backoff; spooler failures are reported as failed without silent duplication.

Schedule `select public.prune_old_job_events(90);` in Supabase and back up the database and private Storage bucket before schema changes.
