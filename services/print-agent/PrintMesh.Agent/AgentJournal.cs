using System.Text.Json;

namespace PrintMesh.Agent;

public enum AgentWorkStage
{
    Claimed,
    Downloaded,
    PrintingReported,
    SpoolerHandedOff,
}

public sealed record PendingAgentJob(ClaimedPrintJob Job, AgentWorkStage Stage, string PdfPath);

public sealed class AgentJournal
{
    private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = true };
    private readonly string _journalPath;

    public AgentJournal(string dataDirectory)
    {
        Directory.CreateDirectory(dataDirectory);
        _journalPath = Path.Combine(dataDirectory, "pending-job.json");
    }

    public async Task<PendingAgentJob?> LoadAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_journalPath)) return null;
        await using var stream = File.OpenRead(_journalPath);
        return await JsonSerializer.DeserializeAsync<PendingAgentJob>(stream, cancellationToken: cancellationToken);
    }

    public async Task SaveAsync(PendingAgentJob pendingJob, CancellationToken cancellationToken)
    {
        var temporaryPath = _journalPath + ".new";
        await using (var stream = File.Create(temporaryPath))
            await JsonSerializer.SerializeAsync(stream, pendingJob, SerializerOptions, cancellationToken);
        File.Move(temporaryPath, _journalPath, true);
    }

    public Task ClearAsync()
    {
        if (File.Exists(_journalPath)) File.Delete(_journalPath);
        return Task.CompletedTask;
    }
}
