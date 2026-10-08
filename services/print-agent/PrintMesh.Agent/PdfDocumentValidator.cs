using System.Security.Cryptography;

namespace PrintMesh.Agent;

public static class PdfDocumentValidator
{
    public static async Task ValidateAsync(string path, string expectedSha256, CancellationToken cancellationToken)
    {
        await using var stream = File.OpenRead(path);
        var signature = new byte[5];
        var bytesRead = await stream.ReadAsync(signature, cancellationToken);
        if (bytesRead != signature.Length || System.Text.Encoding.ASCII.GetString(signature) != "%PDF-")
            throw new InvalidDataException("The downloaded file is not a PDF.");

        stream.Position = 0;
        var actualHash = Convert.ToHexString(await SHA256.HashDataAsync(stream, cancellationToken)).ToLowerInvariant();
        if (!CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.ASCII.GetBytes(actualHash),
                System.Text.Encoding.ASCII.GetBytes(expectedSha256.ToLowerInvariant())))
        {
            throw new InvalidDataException("The downloaded PDF checksum does not match the queued job.");
        }
    }
}
