import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./admin-auth";

describe("hashPassword + verifyPassword (scrypt)", () => {
  it("returns a string in scrypt$<salt>$<hash> format", () => {
    const hashed = hashPassword("hello");
    expect(hashed.split("$")).toHaveLength(3);
    expect(hashed.startsWith("scrypt$")).toBe(true);
  });

  it("produces different hashes for the same password (random salt)", () => {
    const a = hashPassword("same-pass");
    const b = hashPassword("same-pass");
    expect(a).not.toBe(b);
  });

  it("verifies the original password against its hash", () => {
    const hashed = hashPassword("correct-horse-battery-staple");
    expect(verifyPassword("correct-horse-battery-staple", hashed)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hashed = hashPassword("real-password");
    expect(verifyPassword("wrong-password", hashed)).toBe(false);
  });

  it("rejects an empty password against a real hash", () => {
    const hashed = hashPassword("real-password");
    expect(verifyPassword("", hashed)).toBe(false);
  });

  it("rejects malformed stored hash strings without throwing", () => {
    expect(verifyPassword("any", "not-a-valid-hash")).toBe(false);
    expect(verifyPassword("any", "scrypt$onlyonepart")).toBe(false);
    expect(verifyPassword("any", "")).toBe(false);
  });

  it("rejects a non-scrypt algorithm prefix", () => {
    expect(verifyPassword("any", "bcrypt$abc$def")).toBe(false);
  });

  it("handles unicode passwords (Thai chars) round-trip", () => {
    const pw = "ร้านตัดผม-ของฉัน-2024";
    const hashed = hashPassword(pw);
    expect(verifyPassword(pw, hashed)).toBe(true);
    expect(verifyPassword("ร้านอื่น", hashed)).toBe(false);
  });
});
