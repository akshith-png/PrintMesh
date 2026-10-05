using System;
using System.Drawing.Printing;

Console.WriteLine("PrintMesh Agent");
Console.WriteLine("================");
Console.WriteLine($"Runtime: {Environment.Version}");
Console.WriteLine();
Console.WriteLine("=== WINDOWS PRINTERS ===");

foreach (string printer in PrinterSettings.InstalledPrinters)
{
    using var settings = new PrinterSettings { PrinterName = printer };
    Console.WriteLine($"- {printer} | Valid: {settings.IsValid}");
}

Console.WriteLine();
Console.WriteLine($"Printer count: {PrinterSettings.InstalledPrinters.Count}");
