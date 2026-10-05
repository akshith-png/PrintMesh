using PrintMesh.Agent;

namespace PrintMesh.Agent.Tests;

public class UnitTest1
{
    [Fact]
    public async Task MockPrinterCopiesPdf()
    {
        var root = Path.Combine(Path.GetTempPath(), "PrintMeshTests", Guid.NewGuid().ToString("N"));
        var output = Path.Combine(root, "output");
        Directory.CreateDirectory(root);
        var source = Path.Combine(root, "test.pdf");
        await File.WriteAllTextAsync(source, "%PDF-1.7`r`n%%EOF");
        try
        {
            var printer = new PdfPrinter("mock", output, null);
            await printer.PrintAsync(source, CancellationToken.None);
            Assert.True(File.Exists(Path.Combine(output, "test.pdf")));
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }
}