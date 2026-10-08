type Window = { startedAt: number; count: number };

const windows = new Map<string, Window>();
const WINDOW_MS = 60_000;
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number) {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    if (windows.size >= MAX_KEYS) windows.delete(windows.keys().next().value as string);
    windows.set(key, { startedAt: now, count: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - current.startedAt)) / 1000)),
  };
}

export function requestKey(request: Request, namespace: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${namespace}:${forwarded || request.headers.get("x-real-ip") || "unknown"}`;
}
