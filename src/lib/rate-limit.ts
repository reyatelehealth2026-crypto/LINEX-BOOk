// Lightweight in-memory sliding-window rate limiter.
//
// NOTE: This is per-instance — on serverless platforms (Vercel) multiple cold-start
// instances each have their own store, so limits are best-effort. For strict
// distributed rate limiting, replace with @upstash/ratelimit + Redis.

import { NextRequest } from "next/server";

interface WindowEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, WindowEntry>();

  return {
    check(id: string): RateLimitResult {
      const now = Date.now();
      let entry = store.get(id);
      if (!entry || now > entry.resetAt) {
        entry = { count: 1, resetAt: now + windowMs };
        store.set(id, entry);
        return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
      }
      entry.count++;
      const allowed = entry.count <= maxRequests;
      return {
        allowed,
        remaining: Math.max(0, maxRequests - entry.count),
        retryAfterMs: allowed ? 0 : entry.resetAt - now,
      };
    },

    reset(id: string): void {
      store.delete(id);
    },
  };
}

/** Extract the real client IP from Vercel / reverse-proxy headers. */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
