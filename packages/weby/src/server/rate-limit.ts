const rateMap = new Map<string, { count: number; resetAt: number }>();

export const checkRateLimit = (ip: string, limit = 60, windowMs = 60_000): boolean => {
  const now = Date.now();
  const record = rateMap.get(ip);
  if (!record || now > record.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count += 1;
  return true;
};
