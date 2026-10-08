using System.Net;
using System.Text.Json;
using PrintMesh.Agent;

namespace PrintMesh.Agent.Tests;

public class AgentWorkerTests
{
    [Fact]
    public async Task FileCopySpoolerCopiesPdfAndRecordsRequestedSettings()
    {
        var root = CreateTemporaryDirectory();
        try
        {
            var pdf = Path.Combine(root, "input.pdf");
            await File.WriteAllTextAsync(pdf, "%PDF-1.7\n%%EOF");
            var spooler = new FileCopySpooler(Path.Combine(root, "spool"));

            await spooler.SendAsync(new PrintRequest("job-1", pdf, "Mock Printer", 2, "COLOR", true, "A4"), CancellationToken.None);

            Assert.True(File.Exists(Path.Combine(root, "spool", "job-1.pdf")));
            var manifest = await File.ReadAllTextAsync(Path.Combine(root, "spool", "job-1.json"));
            Assert.Contains("Mock Printer", manifest);
            Assert.Contains("COLOR", manifest);
        }
        finally
        {
            DeleteTemporaryDirectory(root);
        }
    }

    [Fact]
    public async Task PdfValidatorRejectsAChangedDownloadedFile()
    {
        var root = CreateTemporaryDirectory();
        try
        {
            var pdf = Path.Combine(root, "input.pdf");
            await File.WriteAllTextAsync(pdf, "%PDF-1.7\n%%EOF");
            await Assert.ThrowsAsync<InvalidDataException>(() => PdfDocumentValidator.ValidateAsync(pdf, new string('0', 64), CancellationToken.None));
        }
        finally
        {
            DeleteTemporaryDirectory(root);
        }
    }

    [Fact]
    public async Task ConfigurationPersistsTheInstallationIdentity()
    {
        var root = CreateTemporaryDirectory();
        try
        {
            var store = new AgentConfigurationStore(root);
            var configuration = await store.LoadAsync(CancellationToken.None);
            var initialInstallationId = configuration.InstallationId;
            configuration.ApiBaseUrl = "https://printmesh.example";
            await store.SaveAsync(configuration, CancellationToken.None);

            var loaded = await store.LoadAsync(CancellationToken.None);
            Assert.Equal(initialInstallationId, loaded.InstallationId);
            Assert.Equal("https://printmesh.example", loaded.ApiBaseUrl);
        }
        finally
        {
            DeleteTemporaryDirectory(root);
        }
    }

    [Fact]
    public async Task TransientApiFailureIsRetried()
    {
        var attempts = 0;
        await AgentRetry.ExecuteAsync(_ =>
        {
            attempts++;
            if (attempts < 2) throw new AgentApiException(HttpStatusCode.ServiceUnavailable, "Temporary outage");
            return Task.CompletedTask;
        }, CancellationToken.None);

        Assert.Equal(2, attempts);
    }

    [Fact]
    public async Task RestartAfterSpoolerHandoffReportsCompletionWithoutPrintingAgain()
    {
        var root = CreateTemporaryDirectory();
        try
        {
            var store = new AgentConfigurationStore(root);
            var configuration = new AgentConfiguration
            {
                ApiBaseUrl = "https://printmesh.example",
                AgentId = Guid.NewGuid().ToString(),
                AgentToken = "agent.token",
            };
            await store.SaveAsync(configuration, CancellationToken.None);
            var job = new ClaimedPrintJob(Guid.NewGuid().ToString(), "input.pdf", new string('0', 64), 1, "BW", false, "A4", "claim-token-value-at-least-twenty");
            var pdfPath = Path.Combine(root, "jobs", $"{job.Id}.pdf");
            Directory.CreateDirectory(Path.GetDirectoryName(pdfPath)!);
            await File.WriteAllTextAsync(pdfPath, "%PDF-1.7\n%%EOF");
            var journal = new AgentJournal(root);
            await journal.SaveAsync(new PendingAgentJob(job, AgentWorkStage.SpoolerHandedOff, pdfPath), CancellationToken.None);
            var api = new FakeAgentApi();
            var spooler = new CountingSpooler();
            var worker = new AgentWorker(store, api, spooler, journal, Path.Combine(root, "jobs"), "test-machine", "test-version");

            await worker.RunOnceAsync(CancellationToken.None);

            Assert.Contains(api.Statuses, report => report.Status == "COMPLETED");
            Assert.Equal(0, spooler.SendCount);
            Assert.False(File.Exists(pdfPath));
        }
        finally
        {
            DeleteTemporaryDirectory(root);
        }
    }

    private static string CreateTemporaryDirectory()
    {
        var root = Path.Combine(Path.GetTempPath(), "PrintMeshTests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        return root;
    }

    private static void DeleteTemporaryDirectory(string root)
    {
        if (Directory.Exists(root)) Directory.Delete(root, true);
    }

    private sealed class FakeAgentApi : IAgentApi
    {
        public List<(string Status, string? ErrorCode)> Statuses { get; } = [];

        public Task<RegistrationResult> RegisterAsync(AgentConfiguration configuration, string machineName, string version, string enrollmentToken, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<HeartbeatResult> HeartbeatAsync(AgentConfiguration configuration, string machineName, string version, IReadOnlyList<RemotePrinter> printers, CancellationToken cancellationToken) => Task.FromResult(new HeartbeatResult("ONLINE", null));
        public Task<ClaimedPrintJob?> ClaimNextJobAsync(AgentConfiguration configuration, CancellationToken cancellationToken) => Task.FromResult<ClaimedPrintJob?>(null);
        public Task DownloadPdfAsync(AgentConfiguration configuration, ClaimedPrintJob job, string destinationPath, CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task ReportStatusAsync(AgentConfiguration configuration, ClaimedPrintJob job, string status, string? errorCode, string? errorMessage, CancellationToken cancellationToken)
        {
            Statuses.Add((status, errorCode));
            return Task.CompletedTask;
        }
    }

    private sealed class CountingSpooler : IPdfSpooler
    {
        public int SendCount { get; private set; }
        public Task SendAsync(PrintRequest request, CancellationToken cancellationToken)
        {
            SendCount++;
            return Task.CompletedTask;
        }
    }
}
