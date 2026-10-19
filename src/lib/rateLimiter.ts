/**
 * Rate Limiter Engine
 * Implements sliding-window and token-bucket algorithms to protect against:
 * 1. Brute-force authentication attacks
 * 2. Rapid dead-lead claiming bot attacks / race conditions
 * 3. Password reset spamming
 * 4. Resource exhaustion
 */

interface RateLimitEntry {
  timestamps: number[];
  lockUntil?: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();

  /**
   * Evaluates if a request is permitted under sliding window constraints.
   * @param key Unique identifier (e.g., `login:${email}` or `claim:${userId}`)
   * @param maxAttempts Maximum permitted attempts in the time window
   * @param windowMs Duration of the sliding window in milliseconds
   * @param lockDurationMs Optional lockout duration if limit exceeded
   */
  checkLimit(
    key: string,
    maxAttempts: number,
    windowMs: number,
    lockDurationMs = 0
  ): { allowed: boolean; remaining: number; retryAfterSeconds?: number } {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Check if currently locked out
    if (entry.lockUntil && entry.lockUntil > now) {
      const retryAfterSeconds = Math.ceil((entry.lockUntil - now) / 1000);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    // Filter out timestamps outside the sliding window
    const windowStart = now - windowMs;
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= maxAttempts) {
      if (lockDurationMs > 0) {
        entry.lockUntil = now + lockDurationMs;
      }
      const oldestInWindow = entry.timestamps[0];
      const retryAfterSeconds = Math.ceil((oldestInWindow + windowMs - now) / 1000);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    const remaining = maxAttempts - entry.timestamps.length;
    return { allowed: true, remaining };
  }

  /**
   * Records an attempt under a key
   */
  recordAttempt(key: string): void {
    const now = Date.now();
    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }
    entry.timestamps.push(now);
  }

  /**
   * Resets rate limit for a key upon successful authentication
   */
  resetLimit(key: string): void {
    this.store.delete(key);
  }

  /**
   * Specialized helpers
   */
  checkLoginAttempt(email: string): { allowed: boolean; retryAfterSeconds?: number } {
    const key = `auth:login:${email.toLowerCase().trim()}`;
    const result = this.checkLimit(key, 5, 15 * 60 * 1000, 15 * 60 * 1000); // 5 attempts per 15 min
    return { allowed: result.allowed, retryAfterSeconds: result.retryAfterSeconds };
  }

  recordFailedLogin(email: string): void {
    this.recordAttempt(`auth:login:${email.toLowerCase().trim()}`);
  }

  resetLogin(email: string): void {
    this.resetLimit(`auth:login:${email.toLowerCase().trim()}`);
  }

  checkLeadClaim(userId: string): { allowed: boolean; retryAfterSeconds?: number } {
    const key = `crm:claim:${userId}`;
    const result = this.checkLimit(key, 10, 60 * 1000, 60 * 1000); // 10 claims per minute
    return { allowed: result.allowed, retryAfterSeconds: result.retryAfterSeconds };
  }

  recordLeadClaim(userId: string): void {
    this.recordAttempt(`crm:claim:${userId}`);
  }

  checkPasswordReset(email: string): { allowed: boolean; retryAfterSeconds?: number } {
    const key = `auth:reset:${email.toLowerCase().trim()}`;
    const result = this.checkLimit(key, 3, 10 * 60 * 1000, 10 * 60 * 1000); // 3 attempts per 10 min
    return { allowed: result.allowed, retryAfterSeconds: result.retryAfterSeconds };
  }

  recordPasswordReset(email: string): void {
    this.recordAttempt(`auth:reset:${email.toLowerCase().trim()}`);
  }
}

export const rateLimiter = new RateLimiter();
