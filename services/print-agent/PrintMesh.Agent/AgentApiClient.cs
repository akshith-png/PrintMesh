using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace PrintMesh.Agent;

public sealed record RemotePrinter(string Name, bool IsValid);
public sealed record RegistrationResult(string AgentId, string AgentToken, int HeartbeatIntervalSeconds);
public sealed record HeartbeatResult(string Status, string? SelectedPrinterId);
public sealed record ClaimedPrintJob(
    string Id,
    string OriginalFilename,
    string Sha256,
    int Copies,
    string ColorMode,
    bool Duplex,
    string PaperSize,
    string ClaimToken);

public interface IAgentApi
{
    Task<RegistrationResult> RegisterAsync(AgentConfiguration configuration, string machineName, string version, string enrollmentToken, CancellationToken cancellationToken);
    Task<HeartbeatResult> HeartbeatAsync(AgentConfiguration configuration, string machineName, string version, IReadOnlyList<RemotePrinter> printers, CancellationToken cancellationToken);
    Task<ClaimedPrintJob?> ClaimNextJobAsync(AgentConfiguration configuration, CancellationToken cancellationToken);
    Task DownloadPdfAsync(AgentConfiguration configuration, ClaimedPrintJob job, string destinationPath, CancellationToken cancellationToken);
    Task ReportStatusAsync(AgentConfiguration configuration, ClaimedPrintJob job, string status, string? errorCode, string? errorMessage, CancellationToken cancellationToken);
}

public sealed class AgentApiException(HttpStatusCode statusCode, string message) : Exception(message)
{
    public HttpStatusCode StatusCode { get; } = statusCode;
    public bool IsTransient => (int)StatusCode >= 500 || StatusCode == HttpStatusCode.TooManyRequests;
}

public sealed class AgentApiClient : IAgentApi, IDisposable
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private readonly HttpClient _httpClient;

    public AgentApiClient(string apiBaseUrl)
    {
        if (!Uri.TryCreate(apiBaseUrl, UriKind.Absolute, out var uri))
            throw new ArgumentException("The API base URL must be absolute.", nameof(apiBaseUrl));
        _httpClient = new HttpClient { BaseAddress = new Uri(uri.ToString().TrimEnd('/') + "/"), Timeout = TimeSpan.FromSeconds(30) };
    }

    public async Task<RegistrationResult> RegisterAsync(AgentConfiguration configuration, string machineName, string version, string enrollmentToken, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "api/agent/register")
        {
            Content = JsonContent.Create(new { installationId = configuration.InstallationId, machineName, version }),
        };
        request.Headers.Add("X-PrintMesh-Enrollment-Token", enrollmentToken);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        return await ReadJsonAsync<RegistrationResult>(response, cancellationToken);
    }

    public async Task<HeartbeatResult> HeartbeatAsync(AgentConfiguration configuration, string machineName, string version, IReadOnlyList<RemotePrinter> printers, CancellationToken cancellationToken)
    {
        using var request = AuthenticatedRequest(HttpMethod.Post, "api/agent/heartbeat", configuration);
        request.Content = JsonContent.Create(new
        {
            machineName,
            version,
            selectedWindowsPrinterName = configuration.SelectedPrinterName,
            printers = printers.Select(printer => new { name = printer.Name, isValid = printer.IsValid }),
        });
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        return await ReadJsonAsync<HeartbeatResult>(response, cancellationToken);
    }

    public async Task<ClaimedPrintJob?> ClaimNextJobAsync(AgentConfiguration configuration, CancellationToken cancellationToken)
    {
        using var request = AuthenticatedRequest(HttpMethod.Post, "api/agent/jobs/claim", configuration);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var payload = await ReadJsonAsync<ClaimResponse>(response, cancellationToken);
        return payload.Job;
    }

    public async Task DownloadPdfAsync(AgentConfiguration configuration, ClaimedPrintJob job, string destinationPath, CancellationToken cancellationToken)
    {
        using var request = AuthenticatedRequest(HttpMethod.Get, $"api/agent/jobs/{job.Id}/download", configuration);
        request.Headers.Add("X-PrintMesh-Claim-Token", job.ClaimToken);
        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        if (!response.IsSuccessStatusCode) throw await ToExceptionAsync(response, cancellationToken);
        await using var source = await response.Content.ReadAsStreamAsync(cancellationToken);
        await using var destination = File.Create(destinationPath);
        await source.CopyToAsync(destination, cancellationToken);
    }

    public async Task ReportStatusAsync(AgentConfiguration configuration, ClaimedPrintJob job, string status, string? errorCode, string? errorMessage, CancellationToken cancellationToken)
    {
        using var request = AuthenticatedRequest(HttpMethod.Post, $"api/agent/jobs/{job.Id}/status", configuration);
        request.Content = JsonContent.Create(new { claimToken = job.ClaimToken, status, errorCode, errorMessage });
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
    }

    private HttpRequestMessage AuthenticatedRequest(HttpMethod method, string path, AgentConfiguration configuration)
    {
        if (string.IsNullOrWhiteSpace(configuration.AgentToken))
            throw new InvalidOperationException("The agent is not registered.");
        var request = new HttpRequestMessage(method, path);
        request.Headers.Add("Authorization", $"Bearer {configuration.AgentToken}");
        return request;
    }

    private static async Task<T> ReadJsonAsync<T>(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (!response.IsSuccessStatusCode) throw await ToExceptionAsync(response, cancellationToken);
        return await response.Content.ReadFromJsonAsync<T>(JsonOptions, cancellationToken)
            ?? throw new AgentApiException(response.StatusCode, "The PrintMesh API returned an empty response.");
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (!response.IsSuccessStatusCode) throw await ToExceptionAsync(response, cancellationToken);
    }

    private static async Task<AgentApiException> ToExceptionAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var message = await response.Content.ReadAsStringAsync(cancellationToken);
        return new AgentApiException(response.StatusCode, string.IsNullOrWhiteSpace(message) ? "The PrintMesh API request failed." : message);
    }

    public void Dispose() => _httpClient.Dispose();

    private sealed record ClaimResponse(ClaimedPrintJob? Job);
}
