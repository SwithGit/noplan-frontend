function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createRateLimiter({ windowMs, max, keyGenerator, message = '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }) {
  const buckets = new Map();
  let lastCleanup = 0;

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastCleanup > windowMs) {
      lastCleanup = now;
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
    }

    const key = String(keyGenerator?.(req) || req.auth?.userId || req.ip || 'unknown');
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
}

function createConcurrencyLimiter(maxConcurrent) {
  let active = 0;
  return (_req, res, next) => {
    if (active >= maxConcurrent) {
      return res.status(503).json({
        success: false,
        message: '현재 코스 요청이 몰리고 있어요. 잠시 후 다시 시도해 주세요.',
      });
    }

    active += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active = Math.max(0, active - 1);
    };
    res.once('finish', release);
    res.once('close', release);
    next();
  };
}

module.exports = { createConcurrencyLimiter, createRateLimiter, positiveInteger };
