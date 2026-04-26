// Capture screenshots of every page for landing-page assets.
// Outputs PNGs to public/landing/screens/<page>-<viewport>.png
//
// Usage:
//   node scripts/screenshot-pages.mjs
//
// Env (.env.local or shell):
//   SCREENSHOT_BASE        default: https://hairx.xn--42cfc0k1a8b.net
//   SCREENSHOT_ROOT        default: https://xn--42cfc0k1a8b.net
//   SCREENSHOT_ADMIN_PW    default: Jame@2538
//   SCREENSHOT_SUPER_EMAIL default: newyannakon@gmail.com
//   SCREENSHOT_SUPER_PW    default: Jame@2538

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE  = process.env.SCREENSHOT_BASE  || "https://hairx.xn--42cfc0k1a8b.net";
const ROOT  = process.env.SCREENSHOT_ROOT  || "https://xn--42cfc0k1a8b.net";
const ADMIN_PW    = process.env.SCREENSHOT_ADMIN_PW    || "Jame@2538";
const SUPER_EMAIL = process.env.SCREENSHOT_SUPER_EMAIL || "newyannakon@gmail.com";
const SUPER_PW    = process.env.SCREENSHOT_SUPER_PW    || "Jame@2538";

const OUT = path.resolve("public/landing/screens");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile",  width: 390,  height: 844, isMobile: true, deviceScaleFactor: 2 },
];

const PUBLIC_PAGES = [
  { id: "landing",      url: `${BASE}/` },
  { id: "signup",       url: `${BASE}/signup` },
  { id: "admin-login",  url: `${BASE}/admin` },
  { id: "super-login",  url: `${ROOT}/super/login` },
];

const ADMIN_PAGES = [
  { id: "admin-queue",         url: `${BASE}/admin` },
  { id: "admin-dashboard",     url: `${BASE}/admin/dashboard` },
  { id: "admin-analytics",     url: `${BASE}/admin/analytics` },
  { id: "admin-services",      url: `${BASE}/admin/services` },
  { id: "admin-staff",         url: `${BASE}/admin/staff` },
  { id: "admin-customers",     url: `${BASE}/admin/customers` },
  { id: "admin-working-hours", url: `${BASE}/admin/working-hours` },
  { id: "admin-coupons",       url: `${BASE}/admin/coupons` },
  { id: "admin-reviews",       url: `${BASE}/admin/reviews` },
  { id: "admin-templates",     url: `${BASE}/admin/templates` },
  { id: "admin-linex-studio",  url: `${BASE}/admin/linex-studio` },
  { id: "admin-ai-settings",   url: `${BASE}/admin/ai-settings` },
  { id: "admin-theme",         url: `${BASE}/admin/theme` },
  { id: "admin-setup",         url: `${BASE}/admin/setup` },
  { id: "admin-shop-info",     url: `${BASE}/admin/shop-info` },
];

const LIFF_PAGES = [
  { id: "liff-home",        url: `${BASE}/liff` },
  { id: "liff-services",    url: `${BASE}/liff/services` },
  { id: "liff-staff",       url: `${BASE}/liff/staff` },
  { id: "liff-datetime",    url: `${BASE}/liff/datetime` },
  { id: "liff-my-bookings", url: `${BASE}/liff/my-bookings` },
];

const SUPER_PAGES = [
  { id: "super-list", url: `${ROOT}/super` },
];

async function shoot(context, viewport, page, file) {
  const p = await context.newPage();
  const filename = path.join(OUT, `${file}-${viewport.name}.png`);
  try {
    await p.goto(page.url, { waitUntil: "networkidle", timeout: 30_000 });
  } catch (e) {
    console.warn(`[warn] ${page.id} (${viewport.name}) navigate: ${e.message}`);
  }
  await p.waitForTimeout(800); // settle animations
  try {
    await p.screenshot({ path: filename, fullPage: true });
    console.log(`✓ ${file}-${viewport.name}.png`);
  } catch (e) {
    console.error(`✗ ${file}-${viewport.name}: ${e.message}`);
  }
  await p.close();
}

async function captureForViewport(browser, viewport) {
  console.log(`\n── viewport: ${viewport.name} (${viewport.width}x${viewport.height}) ──`);

  // ── 1. Public pages — clean context, no auth ──
  const pubCtx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor || 1,
    isMobile: viewport.isMobile || false,
    ignoreHTTPSErrors: true,
  });
  for (const page of PUBLIC_PAGES) {
    await shoot(pubCtx, viewport, page, page.id);
  }
  await pubCtx.close();

  // ── 2. Admin pages — set sessionStorage.adminPw before each navigate ──
  const adminCtx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor || 1,
    isMobile: viewport.isMobile || false,
    ignoreHTTPSErrors: true,
  });
  await adminCtx.addInitScript((pw) => {
    try { window.sessionStorage.setItem("adminPw", pw); } catch {}
  }, ADMIN_PW);

  for (const page of ADMIN_PAGES) {
    await shoot(adminCtx, viewport, page, page.id);
  }

  // ── 3. LIFF pages — stub window.liff so SDK init doesn't fail outside LINE app ──
  await adminCtx.addInitScript(() => {
    const fakeUserId = "Udemoxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    const fakeProfile = { userId: fakeUserId, displayName: "ลูกค้าตัวอย่าง" };
    window.liff = {
      init: () => Promise.resolve(),
      isLoggedIn: () => true,
      isInClient: () => false,
      ready: Promise.resolve(),
      getProfile: () => Promise.resolve(fakeProfile),
      getIDToken: () => "demo-id-token",
      login: () => {},
      logout: () => {},
      closeWindow: () => {},
      sendMessages: () => Promise.resolve(),
    };
    try {
      window.localStorage.setItem("liff:demo:userId", fakeUserId);
      window.localStorage.setItem("liff:demo:displayName", fakeProfile.displayName);
    } catch {}
  });
  for (const page of LIFF_PAGES) {
    await shoot(adminCtx, viewport, page, page.id);
  }
  await adminCtx.close();

  // ── 4. Super admin — login via form, then visit list ──
  const superCtx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor || 1,
    isMobile: viewport.isMobile || false,
    ignoreHTTPSErrors: true,
  });
  const sp = await superCtx.newPage();
  try {
    await sp.goto(`${ROOT}/super/login`, { waitUntil: "networkidle", timeout: 30_000 });
    await sp.fill('input[type="email"]', SUPER_EMAIL);
    await sp.fill('input[type="password"]', SUPER_PW);
    // Submit by pressing Enter — the form has <button> without explicit type="submit"
    await sp.press('input[type="password"]', "Enter");
    await sp.waitForURL(/\/super(\/|$)/, { timeout: 15_000 }).catch(() => {});
    await sp.waitForTimeout(800);
  } catch (e) {
    console.warn(`[warn] super login: ${e.message}`);
  }
  await sp.close();

  for (const page of SUPER_PAGES) {
    await shoot(superCtx, viewport, page, page.id);
  }
  await superCtx.close();
}

(async () => {
  console.log(`Output: ${OUT}`);
  console.log(`Base:   ${BASE}`);
  console.log(`Root:   ${ROOT}`);

  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWPORTS) {
      await captureForViewport(browser, viewport);
    }
  } finally {
    await browser.close();
  }
  console.log("\nDone.");
})();
