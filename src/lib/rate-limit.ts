interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

const globalForRateLimit = globalThis as unknown as {
  cobrefacilRateLimitBuckets?: Map<string, Bucket>;
};

const buckets =
  globalForRateLimit.cobrefacilRateLimitBuckets ?? new Map<string, Bucket>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.cobrefacilRateLimitBuckets = buckets;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    forwarded ??
    "unknown"
  );
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  const existing = buckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + windowMs };

  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(0, limit - bucket.count);
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfter,
  };
}

export function clearRateLimitBuckets() {
  buckets.clear();
}
