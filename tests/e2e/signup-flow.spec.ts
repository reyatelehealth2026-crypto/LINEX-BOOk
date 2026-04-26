import { test, expect } from "@playwright/test";

const ROOT = process.env.E2E_ROOT_URL || "https://xn--42cfc0k1a8b.net";

test.describe("signup wizard navigation (read-only — no POST /create)", () => {
  test("step 1: taken slug shows 'used' message and disables Next", async ({ page }) => {
    await page.goto(`${ROOT}/signup`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/ขั้นที่\s*1\s*\/\s*3/)).toBeVisible();

    await page.getByPlaceholder(/Salon Linda/).fill("Playwright Smoke Shop");
    await page.getByPlaceholder(/mysalon/).fill("hairx");
    await expect(page.getByText(/ถูกใช้แล้ว/)).toBeVisible({ timeout: 3000 });

    const next = page.getByRole("button", { name: /ถัดไป|ต่อไป|Next/i });
    await expect(next).toBeDisabled();
  });

  test("step 1 → step 2 with a fresh unused slug", async ({ page }) => {
    await page.goto(`${ROOT}/signup`, { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder(/Salon Linda/).fill("Playwright Smoke");
    const unique = `pw-smoke-${Date.now().toString(36)}`;
    await page.getByPlaceholder(/mysalon/).fill(unique);
    await expect(page.getByText(/ใช้ได้/)).toBeVisible({ timeout: 5000 });

    const next = page.getByRole("button", { name: /ถัดไป|ต่อไป|Next/i });
    await expect(next).toBeEnabled();
    await next.click();

    await expect(page.getByText(/ขั้นที่\s*2\s*\/\s*3/)).toBeVisible();
    await expect(page.getByText(/ประเภทร้าน/)).toBeVisible();
  });

  test("step 2 → step 3 by picking a preset", async ({ page }) => {
    await page.goto(`${ROOT}/signup`, { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder(/Salon Linda/).fill("Playwright Smoke");
    const unique = `pw-smoke2-${Date.now().toString(36)}`;
    await page.getByPlaceholder(/mysalon/).fill(unique);
    await expect(page.getByText(/ใช้ได้/)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /ถัดไป|ต่อไป|Next/i }).click();

    await page.getByText(/ร้านเสริมสวย/).click();

    const next = page.getByRole("button", { name: /ถัดไป|ต่อไป|Next/i });
    await expect(next).toBeEnabled();
    await next.click();

    await expect(page.getByText(/ขั้นที่\s*3\s*\/\s*3/)).toBeVisible();
    await expect(page.getByText(/สร้างบัญชีแอดมิน/)).toBeVisible();
  });
});

test.describe("admin login critical path (read-only)", () => {
  test("incorrect password keeps user on /admin (no crash)", async ({ page }) => {
    const SHOP = process.env.E2E_SHOP_BASE || "https://hairx.xn--42cfc0k1a8b.net";
    await page.goto(`${SHOP}/admin`, { waitUntil: "domcontentloaded" });
    await page.locator('input[type="password"]').fill("definitely-wrong-pw");
    await page.getByRole("button", { name: /เข้าสู่ระบบ/i }).click();
    await page.waitForTimeout(800);
    expect(page.url()).toContain("/admin");
  });
});
