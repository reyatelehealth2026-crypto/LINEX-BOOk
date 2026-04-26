import { describe, it, expect } from "vitest";
import { formatDateTH, formatTimeRange, formatTime } from "./format";

describe("formatDateTH", () => {
  it("renders Thai day, month abbrev and Buddhist year", () => {
    const out = formatDateTH("2026-04-27T07:00:00+07:00");
    expect(out).toContain("จันทร์");
    expect(out).toContain("27");
    expect(out).toContain("เม.ย.");
    expect(out).toContain("2569"); // 2026 + 543
  });

  it("uses Thai month abbreviation, not numeric", () => {
    expect(formatDateTH("2026-12-31T07:00:00+07:00")).toContain("ธ.ค.");
  });
});

describe("formatTimeRange", () => {
  it("renders HH:mm – HH:mm", () => {
    const out = formatTimeRange(
      "2026-04-27T09:00:00+07:00",
      "2026-04-27T10:30:00+07:00",
    );
    expect(out).toBe("09:00 – 10:30");
  });

  it("zero-pads single-digit hours and minutes", () => {
    const out = formatTimeRange(
      "2026-04-27T08:05:00+07:00",
      "2026-04-27T09:09:00+07:00",
    );
    expect(out).toBe("08:05 – 09:09");
  });
});

describe("formatTime", () => {
  it("renders HH:mm in Asia/Bangkok regardless of input offset", () => {
    // 02:30 UTC = 09:30 in Asia/Bangkok
    expect(formatTime("2026-04-27T02:30:00Z")).toBe("09:30");
  });
});
