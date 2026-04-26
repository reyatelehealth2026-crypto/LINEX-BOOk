import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  issueAdminSession,
  issueAdminBootstrap,
  verifyAdminSession,
  ADMIN_SESSION_TTL_SEC,
} from "./admin-session-token";

describe("admin session token (HMAC sign/verify)", () => {
  it("round-trips a session token: issue → verify returns same {adminUserId, shopId}", () => {
    const token = issueAdminSession(42, 7);
    expect(verifyAdminSession(token)).toEqual({ adminUserId: 42, shopId: 7 });
  });

  it("round-trips a bootstrap token", () => {
    const token = issueAdminBootstrap(11, 3);
    expect(verifyAdminSession(token)).toEqual({ adminUserId: 11, shopId: 3 });
  });

  it("rejects a tampered payload (signature mismatch)", () => {
    const token = issueAdminSession(1, 1);
    const [body, mac] = token.split(".");
    const tampered = body.slice(0, -1) + (body.endsWith("A") ? "B" : "A") + "." + mac;
    expect(verifyAdminSession(tampered)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyAdminSession("")).toBeNull();
    expect(verifyAdminSession("not-a-token")).toBeNull();
    expect(verifyAdminSession("only.one")).toBeNull();
  });

  it("rejects an expired token (exp in the past)", () => {
    const token = issueAdminSession(1, 1, -10);
    expect(verifyAdminSession(token)).toBeNull();
  });

  it("rejects tokens whose typ is neither admin_session nor admin_bootstrap", () => {
    const secret = process.env.SUPER_ADMIN_SESSION_SECRET ?? "";
    const body = Buffer.from(
      JSON.stringify({
        sub: 1,
        typ: "evil_type",
        shop: 1,
        exp: Math.floor(Date.now() / 1000) + 60,
      }),
      "utf8",
    ).toString("base64url");
    const mac = crypto.createHmac("sha256", secret).update(body).digest("base64url");
    expect(verifyAdminSession(`${body}.${mac}`)).toBeNull();
  });

  it("ADMIN_SESSION_TTL_SEC is 30 days", () => {
    expect(ADMIN_SESSION_TTL_SEC).toBe(60 * 60 * 24 * 30);
  });
});
