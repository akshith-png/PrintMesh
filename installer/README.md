# PrintMesh Agent installer

`scripts/build-installer.ps1` publishes a self-contained win-x64 agent and packages it into `dist/PrintMeshAgentSetup.exe` using the Windows IExpress bootstrapper. The resulting executable installs into Program Files, keeps writable state in ProgramData, registers one auto-start task, and starts the agent. Re-running the installer upgrades in place without deleting the cloud job history. The package does not install a printer driver or require a separate .NET runtime.
