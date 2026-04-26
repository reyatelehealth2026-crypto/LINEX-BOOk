import { describe, it, expect } from "vitest";
import {
  issueImpersonationToken,
  issueImpersonationSession,
  verifyImpersonationToken,
  IMPERSONATION_COOKIE,
} from "./impersonation-token";

describe("impersonation tokens", () => {
  it("round-trips a one-time impersonation token", () => {
    const token = issueImpersonationToken(1, 42);
    expect(verifyImpersonationToken(token)).toEqual({ superAdminId: 1, shopId: 42 });
  });

  it("round-trips a longer-lived session token", () => {
    const token = issueImpersonationSession(1, 42);
    expect(verifyImpersonationToken(token)).toEqual({ superAdminId: 1, shopId: 42 });
  });

  it("rejects expired tokens", () => {
    const token = issueImpersonationToken(1, 1, -10);
    expect(verifyImpersonationToken(token)).toBeNull();
  });

  it("rejects tampered tokens", () => {
    const token = issueImpersonationToken(1, 1);
    const [body, mac] = token.split(".");
    const tampered = body + "X." + mac;
    expect(verifyImpersonationToken(tampered)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyImpersonationToken("")).toBeNull();
    expect(verifyImpersonationToken("only")).toBeNull();
  });

  it("exposes a stable cookie name constant", () => {
    expect(IMPERSONATION_COOKIE).toBe("super_admin_impersonation");
  });
});
