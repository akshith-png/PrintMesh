# PrintMesh V1 Architecture

Customer browser -> Next.js application/API -> Supabase PostgreSQL + private Storage -> print job queue -> Windows PrintMesh Agent -> Windows Print Spooler -> physical printer.

The first production target is one customer, one merchant, one Windows agent, and one printer. The architecture must support multiple merchants and printers without redesigning the job lifecycle.
