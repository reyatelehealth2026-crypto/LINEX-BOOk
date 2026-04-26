import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createRateLimiter, getClientIp } from "./rate-limit";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-27T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to max requests in the window", () => {
    const rl = createRateLimiter(3, 60_000);
    expect(rl.check("user-1").allowed).toBe(true);
    expect(rl.check("user-1").allowed).toBe(true);
    expect(rl.check("user-1").allowed).toBe(true);
  });

  it("blocks the (max+1)th request and reports retryAfterMs", () => {
    const rl = createRateLimiter(3, 60_000);
    rl.check("u"); rl.check("u"); rl.check("u");
    const blocked = rl.check("u");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("isolates buckets per id", () => {
    const rl = createRateLimiter(1, 60_000);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("b").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
  });

  it("rolls over after the window expires", () => {
    const rl = createRateLimiter(2, 60_000);
    rl.check("u"); rl.check("u");
    expect(rl.check("u").allowed).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(rl.check("u").allowed).toBe(true);
  });

  it("reset() clears the bucket immediately", () => {
    const rl = createRateLimiter(1, 60_000);
    rl.check("u");
    expect(rl.check("u").allowed).toBe(false);
    rl.reset("u");
    expect(rl.check("u").allowed).toBe(true);
  });

  it("remaining counter decrements correctly", () => {
    const rl = createRateLimiter(3, 60_000);
    expect(rl.check("u").remaining).toBe(2);
    expect(rl.check("u").remaining).toBe(1);
    expect(rl.check("u").remaining).toBe(0);
  });
});

describe("getClientIp", () => {
  function makeReq(headers: Record<string, string>) {
    return new NextRequest("http://test/", { headers });
  }

  it("prefers cf-connecting-ip", () => {
    const req = makeReq({
      "cf-connecting-ip": "1.2.3.4",
      "x-forwarded-for": "9.9.9.9",
      "x-real-ip": "8.8.8.8",
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to first IP in x-forwarded-for", () => {
    const req = makeReq({ "x-forwarded-for": "10.0.0.1, 10.0.0.2, 10.0.0.3" });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip when XFF absent", () => {
    const req = makeReq({ "x-real-ip": "5.5.5.5" });
    expect(getClientIp(req)).toBe("5.5.5.5");
  });

  it("returns 'unknown' when no proxy headers present", () => {
    const req = makeReq({});
    expect(getClientIp(req)).toBe("unknown");
  });
});
