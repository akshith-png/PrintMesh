namespace PrintMesh.Agent;

public sealed class AgentWorker
{
    private readonly AgentConfigurationStore _configurationStore;
    private readonly IAgentApi _api;
    private readonly IPdfSpooler _spooler;
    private readonly AgentJournal _journal;
    private readonly string _workDirectory;
    private readonly string _machineName;
    private readonly string _version;

    public AgentWorker(
        AgentConfigurationStore configurationStore,
        IAgentApi api,
        IPdfSpooler spooler,
        AgentJournal journal,
        string workDirectory,
        string machineName,
        string version)
    {
        _configurationStore = configurationStore;
        _api = api;
        _spooler = spooler;
        _journal = journal;
        _workDirectory = workDirectory;
        _machineName = machineName;
        _version = version;
    }

    public async Task<string> RunOnceAsync(CancellationToken cancellationToken)
    {
        var configuration = await _configurationStore.LoadAsync(cancellationToken);
        if (!configuration.IsRegistered) throw new InvalidOperationException("The agent is not registered. Run with --setup and a one-time enrollment token.");

        await RecoverPendingJobAsync(configuration, cancellationToken);

        var discovered = PrinterDiscovery.GetInstalled();
        var selected = SelectPrinter(configuration.SelectedPrinterName, discovered);
        if (selected != configuration.SelectedPrinterName)
        {
            configuration.SelectedPrinterName = selected;
            await _configurationStore.SaveAsync(configuration, cancellationToken);
        }

        var heartbeat = await AgentRetry.ExecuteAsync(
            token => _api.HeartbeatAsync(configuration, _machineName, _version, discovered.Select(printer => new RemotePrinter(printer.Name, printer.IsValid)).ToList(), token),
            cancellationToken);
        if (!string.IsNullOrWhiteSpace(heartbeat.DesiredPrinterName) && discovered.Any(printer => printer.Name == heartbeat.DesiredPrinterName && printer.IsValid) && configuration.SelectedPrinterName != heartbeat.DesiredPrinterName)
        {
            configuration.SelectedPrinterName = heartbeat.DesiredPrinterName;
            await _configurationStore.SaveAsync(configuration, cancellationToken);
        }
        if (heartbeat.SelectedPrinterId is null) return "No valid selected Windows printer; queue polling skipped.";

        var job = await AgentRetry.ExecuteAsync(token => _api.ClaimNextJobAsync(configuration, token), cancellationToken);
        if (job is null) return "No queued job.";

        await ProcessClaimedJobAsync(configuration, job, cancellationToken);
        return $"Job {job.Id} handed to Windows.";
    }

    private async Task ProcessClaimedJobAsync(AgentConfiguration configuration, ClaimedPrintJob job, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(_workDirectory);
        var pdfPath = Path.Combine(_workDirectory, $"{job.Id}.pdf");
        var pending = new PendingAgentJob(job, AgentWorkStage.Claimed, pdfPath);
        await _journal.SaveAsync(pending, cancellationToken);

        try
        {
            await AgentRetry.ExecuteAsync(token => _api.DownloadPdfAsync(configuration, job, pdfPath, token), cancellationToken);
            await PdfDocumentValidator.ValidateAsync(pdfPath, job.Sha256, cancellationToken);
            pending = pending with { Stage = AgentWorkStage.Downloaded };
            await _journal.SaveAsync(pending, cancellationToken);

            await AgentRetry.ExecuteAsync(token => _api.ReportStatusAsync(configuration, job, "PRINTING", null, null, token), cancellationToken);
            pending = pending with { Stage = AgentWorkStage.PrintingReported };
            await _journal.SaveAsync(pending, cancellationToken);

            await SendToSpoolerAsync(configuration, pending, cancellationToken);
        }
        catch (Exception exception) when (pending.Stage < AgentWorkStage.SpoolerHandedOff)
        {
            await ReportFailureBestEffortAsync(configuration, job, exception, cancellationToken);
            DeletePrivateFile(pdfPath);
            await _journal.ClearAsync();
            throw;
        }
    }

    private async Task SendToSpoolerAsync(AgentConfiguration configuration, PendingAgentJob pending, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(configuration.SelectedPrinterName))
            throw new InvalidOperationException("A Windows printer must be selected before printing.");

        await _spooler.SendAsync(new PrintRequest(
            pending.Job.Id,
            pending.PdfPath,
            configuration.SelectedPrinterName,
            pending.Job.Copies,
            pending.Job.ColorMode,
            pending.Job.Duplex,
            pending.Job.PaperSize), cancellationToken);

        pending = pending with { Stage = AgentWorkStage.SpoolerHandedOff };
        await _journal.SaveAsync(pending, cancellationToken);
        await AgentRetry.ExecuteAsync(token => _api.ReportStatusAsync(configuration, pending.Job, "COMPLETED", null, null, token), cancellationToken);
        DeletePrivateFile(pending.PdfPath);
        await _journal.ClearAsync();
    }

    private async Task RecoverPendingJobAsync(AgentConfiguration configuration, CancellationToken cancellationToken)
    {
        var pending = await _journal.LoadAsync(cancellationToken);
        if (pending is null) return;

        if (pending.Stage == AgentWorkStage.SpoolerHandedOff)
        {
            await AgentRetry.ExecuteAsync(token => _api.ReportStatusAsync(configuration, pending.Job, "COMPLETED", null, null, token), cancellationToken);
            DeletePrivateFile(pending.PdfPath);
            await _journal.ClearAsync();
            return;
        }

        // The agent never re-sends a job after a restart unless it can prove no spooler handoff happened.
        // Failing it is safer than risking a duplicate physical document.
        await ReportFailureBestEffortAsync(
            configuration,
            pending.Job,
            new InvalidOperationException("The agent restarted before safely completing the Windows spooler handoff."),
            cancellationToken);
        DeletePrivateFile(pending.PdfPath);
        await _journal.ClearAsync();
    }

    private async Task ReportFailureBestEffortAsync(AgentConfiguration configuration, ClaimedPrintJob job, Exception exception, CancellationToken cancellationToken)
    {
        try
        {
            await AgentRetry.ExecuteAsync(
                token => _api.ReportStatusAsync(configuration, job, "FAILED", "AGENT_PROCESSING_FAILED", exception.Message, token),
                cancellationToken);
        }
        catch (Exception reportException)
        {
            Console.Error.WriteLine($"Could not report job failure: {reportException.Message}");
        }
    }

    private static string? SelectPrinter(string? configuredName, IReadOnlyList<PrinterInfo> printers)
    {
        if (!string.IsNullOrWhiteSpace(configuredName) && printers.Any(printer => printer.IsValid && printer.Name == configuredName)) return configuredName;
        return printers.Count(printer => printer.IsValid) == 1 ? printers.Single(printer => printer.IsValid).Name : null;
    }

    private static void DeletePrivateFile(string path)
    {
        if (File.Exists(path)) File.Delete(path);
    }
}
