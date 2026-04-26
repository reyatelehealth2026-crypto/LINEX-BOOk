import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: () => ({
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ available: true }),
  }) as any;
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/signup");
});

import SignupPage from "./page";

describe("SignupPage", () => {
  it("renders step 1 by default with shop info form", () => {
    render(<SignupPage />);
    expect(screen.getByRole("heading", { name: /ข้อมูลร้าน/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Salon Linda/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mysalon/)).toBeInTheDocument();
  });

  it("step indicator shows '1 / 3' on first load", () => {
    render(<SignupPage />);
    expect(screen.getByText(/ขั้นที่\s*1\s*\/\s*3/)).toBeInTheDocument();
  });

  it("disables Next button when shop name is empty", () => {
    render(<SignupPage />);
    const next = screen.getByRole("button", { name: /ถัดไป|Next|ต่อไป/i });
    expect(next).toBeDisabled();
  });

  it("validates slug via fetch and enables Next when both name and slug are valid", async () => {
    render(<SignupPage />);
    fireEvent.change(screen.getByPlaceholderText(/Salon Linda/), {
      target: { value: "Test Shop" },
    });
    fireEvent.change(screen.getByPlaceholderText(/mysalon/), {
      target: { value: "test-shop" },
    });
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/signup/check-slug?slug=test-shop"),
      );
    }, { timeout: 1500 });
    await waitFor(() => {
      const next = screen.getByRole("button", { name: /ถัดไป|Next|ต่อไป/i });
      expect(next).not.toBeDisabled();
    });
  });

  it("shows 'taken' error message when slug is unavailable", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ available: false, reason: "taken" }),
    }) as any;
    render(<SignupPage />);
    fireEvent.change(screen.getByPlaceholderText(/mysalon/), {
      target: { value: "hairx" },
    });
    await waitFor(() => {
      expect(screen.getByText(/ถูกใช้แล้ว/)).toBeInTheDocument();
    }, { timeout: 1500 });
  });
});
