# Windows Print Agent

The PrintMesh agent is a Windows console process for the V1 beta. It creates a stable installation ID in `%LOCALAPPDATA%\PrintMesh\Agent\agent.json`, authenticates with a server-issued agent token, and never stores the merchant enrollment token.

## Setup flow

1. A merchant administrator opens the dashboard and creates a one-hour setup token. The database keeps only its SHA-256 hash.
2. On the merchant PC, publish or run `PrintMesh.Agent`, then run it once with `--setup --api-url <PrintMesh URL> --enrollment-token <one-time token>`.
3. The agent saves its installation identity and a new agent credential in the local user profile, discovers installed Windows printers, and automatically selects the only valid printer. With multiple printers, run `--set-printer "Exact Windows printer name"`.
4. The normal agent loop heartbeats every 30 seconds, syncs printer availability, and polls for one job at a time.

## Safe job lifecycle

The server atomically changes `QUEUED` to `CLAIMED`, stores a hashed per-claim token, and returns that token once to the agent. The private PDF download and every status report require both the authenticated agent and that claim token.

Before giving a PDF to Windows, the agent saves a local journal and reports `PRINTING`. After Windows accepts the shell print request, it saves `SpoolerHandedOff` before reporting `COMPLETED`. If a process restart happens after handoff, the next run only retries the completion report; it never sends the PDF to Windows again. If it restarts before handoff, it fails the job instead of risking a duplicate.

Network calls retry transient failures three times with exponential backoff. Printing itself is never retried automatically. A failed or uncertain physical print must be reviewed and requeued deliberately by a merchant in a later hardening block.

## No-printer test boundary

`FileCopySpooler` is a test-only spooler implementation. It copies a claimed PDF and writes a JSON manifest containing the requested printer, copies, colour mode, duplex, and paper size. The automated agent tests use it, so Block 4 can be verified without a physical printer.

The production `WindowsPdfSpooler` invokes the registered Windows PDF handler with `printto`; the installed PDF handler submits to the Windows spooler. That is a successful Windows handoff, not physical-paper confirmation. Exact printer-driver application of copies/colour/duplex and paper-on-tray validation are deferred to the real-printer E2E in Block 7.
