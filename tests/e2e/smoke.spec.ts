import { test, expect } from "@playwright/test";

const ROOT = process.env.E2E_ROOT_URL || "https://xn--42cfc0k1a8b.net";
const SHOP = process.env.E2E_SHOP_BASE || "https://hairx.xn--42cfc0k1a8b.net";

test.describe("public pages reachable", () => {
  test("root landing renders without error", async ({ page }) => {
    const res = await page.goto(`${ROOT}/`, { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("/signup wizard reaches step 1", async ({ page }) => {
    await page.goto(`${ROOT}/signup`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/ขั้นที่\s*1\s*\/\s*3/)).toBeVisible();
  });

  test("super login form renders on root domain", async ({ page }) => {
    await page.goto(`${ROOT}/super/login`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Super Admin/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe("admin login form on a tenant subdomain", () => {
  test("hairx /admin shows password form (no Google button)", async ({ page }) => {
    await page.goto(`${SHOP}/admin`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /เข้าสู่ร้าน/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    // Earlier removal: no Google sign-in button on admin
    await expect(page.getByText(/เข้าสู่ระบบด้วย Google/i)).toHaveCount(0);
    // Earlier removal: no "เปลี่ยนร้าน" link in footer
    await expect(page.getByText(/เปลี่ยนร้าน/i)).toHaveCount(0);
  });
});
