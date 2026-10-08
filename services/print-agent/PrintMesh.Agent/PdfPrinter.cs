using System.Diagnostics;
using System.Text.Json;

namespace PrintMesh.Agent;

public sealed record PrintRequest(
    string JobId,
    string PdfPath,
    string PrinterName,
    int Copies,
    string ColorMode,
    bool Duplex,
    string PaperSize);

public interface IPdfSpooler
{
    Task SendAsync(PrintRequest request, CancellationToken cancellationToken);
}

/// <summary>
/// Hands a PDF to the installed Windows PDF handler, which in turn submits it to the Windows spooler.
/// Windows acknowledges handoff, not paper delivery; physical-paper confirmation is deliberately Block 7 work.
/// </summary>
public sealed class WindowsPdfSpooler : IPdfSpooler
{
    public async Task SendAsync(PrintRequest request, CancellationToken cancellationToken)
    {
        if (!OperatingSystem.IsWindows())
            throw new PlatformNotSupportedException("The production PrintMesh spooler runs on Windows only.");

        if (!File.Exists(request.PdfPath))
            throw new FileNotFoundException("The claimed PDF does not exist.", request.PdfPath);

        var info = new ProcessStartInfo
        {
            FileName = request.PdfPath,
            UseShellExecute = true,
            Verb = "printto",
            Arguments = $"\"{request.PrinterName}\"",
        };

        using var process = Process.Start(info)
            ?? throw new InvalidOperationException("Windows could not start the PDF print operation.");

        // Shell verbs return once the registered PDF application accepts the request. They cannot prove paper output.
        await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken);
    }
}

/// <summary>Test-only spooler boundary. It writes the PDF and requested options without requiring a printer.</summary>
public sealed class FileCopySpooler(string outputDirectory) : IPdfSpooler
{
    public async Task SendAsync(PrintRequest request, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(outputDirectory);
        var pdfDestination = Path.Combine(outputDirectory, $"{request.JobId}.pdf");
        var manifestDestination = Path.Combine(outputDirectory, $"{request.JobId}.json");
        await using (var source = File.OpenRead(request.PdfPath))
        await using (var destination = File.Create(pdfDestination))
            await source.CopyToAsync(destination, cancellationToken);

        await File.WriteAllTextAsync(
            manifestDestination,
            JsonSerializer.Serialize(new { request.PrinterName, request.Copies, request.ColorMode, request.Duplex, request.PaperSize }),
            cancellationToken);
    }
}
