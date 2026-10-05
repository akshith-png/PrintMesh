using System.Diagnostics;

namespace PrintMesh.Agent;

public sealed class PdfPrinter
{
    private readonly string _mode;
    private readonly string _outputDirectory;
    private readonly string? _printerName;

    public PdfPrinter(string mode, string outputDirectory, string? printerName)
    {
        _mode = mode;
        _outputDirectory = outputDirectory;
        _printerName = printerName;
    }

    public async Task PrintAsync(string pdfPath, CancellationToken cancellationToken)
    {
        if (_mode.Equals("mock", StringComparison.OrdinalIgnoreCase))
        {
            Directory.CreateDirectory(_outputDirectory);
            File.Copy(pdfPath, Path.Combine(_outputDirectory, Path.GetFileName(pdfPath)), true);
            return;
        }

        var info = new ProcessStartInfo
        {
            FileName = pdfPath,
            UseShellExecute = true,
            Verb = string.IsNullOrWhiteSpace(_printerName) ? "print" : "printto",
            Arguments = string.IsNullOrWhiteSpace(_printerName) ? string.Empty : $"\"{_printerName}\""
        };
        using var process = Process.Start(info) ?? throw new InvalidOperationException("Windows could not start the PDF print operation.");
        await Task.Delay(1000, cancellationToken);
    }
}