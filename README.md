# PrintMesh

Real-time local PrintMesh: customer browser -> backend -> print queue -> Windows print agent -> physical printer.

## Repository

This is a private monorepo for the PrintMesh V1 platform.

## Development

Development is local-first. GitHub is used for source control, backup, and CI/CD.

## V1 Scope

- Customer PDF upload
- Print job queue
- Windows print agent
- Existing Windows printer support
- Merchant printer/job management

## Security

Never commit secrets, customer documents, production database contents, or private uploaded PDFs.

## Verification and local site

The normal verification sequence is:

```text
npm --workspace apps/web run lint
npm --workspace apps/web run typecheck
npm test -- --run
npm run build
dotnet build services/print-agent/PrintMesh.Agent.Tests/PrintMesh.Agent.Tests.csproj --configuration Release
dotnet test services/print-agent/PrintMesh.Agent.Tests/PrintMesh.Agent.Tests.csproj --configuration Release --no-build
```

Run `npm run dev` and open `http://localhost:3000` to inspect the site. Use the merchant dashboard to create a one-time Windows-agent enrollment token. The agent publishing helper is `scripts/publish-agent.ps1`; it produces a Windows x64 package without embedding secrets.

