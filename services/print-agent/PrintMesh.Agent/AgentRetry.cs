namespace PrintMesh.Agent;

public static class AgentRetry
{
    public static async Task ExecuteAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken)
    {
        await ExecuteAsync(async token => { await operation(token); return true; }, cancellationToken);
    }

    public static async Task<T> ExecuteAsync<T>(Func<CancellationToken, Task<T>> operation, CancellationToken cancellationToken)
    {
        Exception? lastException = null;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                return await operation(cancellationToken);
            }
            catch (AgentApiException exception) when (exception.IsTransient)
            {
                lastException = exception;
            }
            catch (HttpRequestException exception)
            {
                lastException = exception;
            }
            catch (TaskCanceledException exception) when (!cancellationToken.IsCancellationRequested)
            {
                lastException = exception;
            }

            await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)), cancellationToken);
        }

        throw new InvalidOperationException("The PrintMesh API did not recover after three attempts.", lastException);
    }
}
