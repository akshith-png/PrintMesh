using System.Drawing.Printing;

namespace PrintMesh.Agent;

public sealed record PrinterInfo(string Name, bool IsValid);

public static class PrinterDiscovery
{
    public static IReadOnlyList<PrinterInfo> GetInstalled()
    {
        return PrinterSettings.InstalledPrinters.Cast<string>().Select(name =>
        {
            var settings = new PrinterSettings { PrinterName = name };
            return new PrinterInfo(name, settings.IsValid);
        }).ToList();
    }
}