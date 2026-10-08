using System.Text.Json;

namespace PrintMesh.Agent;

public sealed class AgentConfiguration
{
    public string? ApiBaseUrl { get; set; }
    public string InstallationId { get; set; } = Guid.NewGuid().ToString();
    public string? AgentId { get; set; }
    public string? AgentToken { get; set; }
    public string? SelectedPrinterName { get; set; }

    public bool IsRegistered => !string.IsNullOrWhiteSpace(AgentId) && !string.IsNullOrWhiteSpace(AgentToken);
}

public sealed class AgentConfigurationStore
{
    private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = true };
    private readonly string _configurationPath;

    public AgentConfigurationStore(string dataDirectory)
    {
        Directory.CreateDirectory(dataDirectory);
        _configurationPath = Path.Combine(dataDirectory, "agent.json");
    }

    public static string DefaultDataDirectory => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "PrintMesh",
        "Agent");

    public async Task<AgentConfiguration> LoadAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_configurationPath)) return new AgentConfiguration();
        await using var stream = File.OpenRead(_configurationPath);
        return await JsonSerializer.DeserializeAsync<AgentConfiguration>(stream, cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Agent configuration is malformed.");
    }

    public async Task SaveAsync(AgentConfiguration configuration, CancellationToken cancellationToken)
    {
        var temporaryPath = _configurationPath + ".new";
        await using (var stream = File.Create(temporaryPath))
            await JsonSerializer.SerializeAsync(stream, configuration, SerializerOptions, cancellationToken);
        File.Move(temporaryPath, _configurationPath, true);
    }
}
