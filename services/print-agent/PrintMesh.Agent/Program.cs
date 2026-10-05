using PrintMesh.Agent;

Console.WriteLine("PrintMesh Agent");
Console.WriteLine("================");
Console.WriteLine($"Runtime: {Environment.Version}");
Console.WriteLine();

if (args.Contains("--discover-printers", StringComparer.OrdinalIgnoreCase))
{
    var printers = PrinterDiscovery.GetInstalled();
    Console.WriteLine("=== WINDOWS PRINTERS ===");
    foreach (var printer in printers)
        Console.WriteLine($"- {printer.Name} | Valid: {printer.IsValid}");
    Console.WriteLine($"Printer count: {printers.Count}");
    return;
}

Console.WriteLine("Agent startup: OK");
Console.WriteLine("Printer discovery component: READY");