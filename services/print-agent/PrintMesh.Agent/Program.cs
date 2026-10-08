using System.Reflection;
using PrintMesh.Agent;

var options = CommandLineOptions.Parse(args);
var dataDirectory = options.DataDirectory ?? AgentConfigurationStore.DefaultDataDirectory;
var configurationStore = new AgentConfigurationStore(dataDirectory);
var agentVersion = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "0.1.0";
var cancellation = new CancellationTokenSource();
Console.CancelKeyPress += (_, eventArgs) => { eventArgs.Cancel = true; cancellation.Cancel(); };

if (options.DiscoverPrinters)
{
    foreach (var printer in PrinterDiscovery.GetInstalled()) Console.WriteLine($"{printer.Name} | Valid: {printer.IsValid}");
    return;
}

var configuration = await configurationStore.LoadAsync(cancellation.Token);
if (options.SelectedPrinterName is not null)
{
    configuration.SelectedPrinterName = options.SelectedPrinterName;
    await configurationStore.SaveAsync(configuration, cancellation.Token);
    Console.WriteLine($"Selected Windows printer: {options.SelectedPrinterName}");
    if (!options.Setup && !options.Once) return;
}

if (options.Setup)
{
    if (string.IsNullOrWhiteSpace(options.ApiBaseUrl) || string.IsNullOrWhiteSpace(options.EnrollmentToken))
        throw new ArgumentException("--setup requires --api-url and --enrollment-token.");
    configuration.ApiBaseUrl = options.ApiBaseUrl;
    using var registrationApi = new AgentApiClient(configuration.ApiBaseUrl);
    var registration = await AgentRetry.ExecuteAsync(
        token => registrationApi.RegisterAsync(configuration, Environment.MachineName, agentVersion, options.EnrollmentToken, token),
        cancellation.Token);
    configuration.AgentId = registration.AgentId;
    configuration.AgentToken = registration.AgentToken;
    await configurationStore.SaveAsync(configuration, cancellation.Token);
    Console.WriteLine($"PrintMesh Agent registered: {registration.AgentId}");
    if (!options.Once) return;
}

if (string.IsNullOrWhiteSpace(configuration.ApiBaseUrl))
    throw new InvalidOperationException("Agent setup is required. Run with --setup --api-url <url> --enrollment-token <token>.");

using var api = new AgentApiClient(configuration.ApiBaseUrl);
IPdfSpooler spooler = options.MockSpoolDirectory is null
    ? new WindowsPdfSpooler()
    : new FileCopySpooler(options.MockSpoolDirectory);
var worker = new AgentWorker(
    configurationStore,
    api,
    spooler,
    new AgentJournal(dataDirectory),
    Path.Combine(dataDirectory, "jobs"),
    Environment.MachineName,
    agentVersion);

if (options.Once)
{
    Console.WriteLine(await worker.RunOnceAsync(cancellation.Token));
    return;
}

Console.WriteLine("PrintMesh Agent running. Press Ctrl+C to stop.");
while (!cancellation.IsCancellationRequested)
{
    try
    {
        Console.WriteLine(await worker.RunOnceAsync(cancellation.Token));
    }
    catch (Exception exception)
    {
        Console.Error.WriteLine($"Agent cycle failed: {exception.Message}");
    }

    await Task.Delay(TimeSpan.FromSeconds(30), cancellation.Token);
}

file sealed record CommandLineOptions(
    bool Setup,
    bool Once,
    bool DiscoverPrinters,
    string? ApiBaseUrl,
    string? EnrollmentToken,
    string? SelectedPrinterName,
    string? DataDirectory,
    string? MockSpoolDirectory)
{
    public static CommandLineOptions Parse(string[] args)
    {
        string? ValueAfter(string name)
        {
            var index = Array.FindIndex(args, argument => argument.Equals(name, StringComparison.OrdinalIgnoreCase));
            return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
        }

        return new CommandLineOptions(
            args.Contains("--setup", StringComparer.OrdinalIgnoreCase),
            args.Contains("--once", StringComparer.OrdinalIgnoreCase),
            args.Contains("--discover-printers", StringComparer.OrdinalIgnoreCase),
            ValueAfter("--api-url"),
            ValueAfter("--enrollment-token"),
            ValueAfter("--set-printer"),
            ValueAfter("--data-directory"),
            ValueAfter("--mock-spool-directory"));
    }
}
