import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let supaResult: { data: any; error?: any } = { data: null };

function buildChain() {
  const chain: any = {
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(supaResult)),
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: () => buildChain(),
}));

import { GET } from "./route";

function reqWith(slug: string | null) {
  const url = slug === null
    ? "http://test/api/signup/check-slug"
    : `http://test/api/signup/check-slug?slug=${encodeURIComponent(slug)}`;
  return new NextRequest(url);
}

describe("GET /api/signup/check-slug", () => {
  beforeEach(() => {
    supaResult = { data: null };
  });

  it("returns missing when slug param is absent", async () => {
    const res = await GET(reqWith(null));
    expect(await res.json()).toEqual({ available: false, reason: "missing" });
  });

  it("returns missing when slug is empty", async () => {
    const res = await GET(reqWith(""));
    expect(await res.json()).toEqual({ available: false, reason: "missing" });
  });

  it("rejects slug shorter than 3 chars", async () => {
    expect(await (await GET(reqWith("ab"))).json()).toEqual({ available: false, reason: "length" });
  });

  it("rejects slug longer than 30 chars", async () => {
    expect(await (await GET(reqWith("a".repeat(31)))).json()).toEqual({ available: false, reason: "length" });
  });

  it("rejects invalid format: spaces, underscores, leading/trailing dashes", async () => {
    expect(await (await GET(reqWith("my shop"))).json()).toEqual({ available: false, reason: "format" });
    expect(await (await GET(reqWith("my_shop"))).json()).toEqual({ available: false, reason: "format" });
    expect(await (await GET(reqWith("-leading"))).json()).toEqual({ available: false, reason: "format" });
    expect(await (await GET(reqWith("trailing-"))).json()).toEqual({ available: false, reason: "format" });
  });

  it("normalizes uppercase to lowercase (so 'MyShop' becomes valid 'myshop')", async () => {
    expect(await (await GET(reqWith("MyShop"))).json()).toEqual({ available: true });
  });

  it("rejects reserved slugs", async () => {
    for (const reserved of ["admin", "api", "www", "signup", "login", "linebook"]) {
      expect(await (await GET(reqWith(reserved))).json()).toEqual({ available: false, reason: "reserved" });
    }
  });

  it("returns taken when DB has a shop with that slug", async () => {
    supaResult = { data: { id: 7 } };
    expect(await (await GET(reqWith("hairx"))).json()).toEqual({ available: false, reason: "taken" });
  });

  it("returns available when slug passes all checks and DB is empty", async () => {
    supaResult = { data: null };
    expect(await (await GET(reqWith("brand-new-salon"))).json()).toEqual({ available: true });
  });

  it("normalizes uppercase to lowercase before validation (reserved still wins)", async () => {
    expect(await (await GET(reqWith("ADMIN"))).json()).toEqual({ available: false, reason: "reserved" });
  });
});
