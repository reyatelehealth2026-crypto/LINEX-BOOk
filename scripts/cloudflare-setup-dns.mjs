#!/usr/bin/env node
// Cloudflare DNS bootstrap for LineBook on Vercel.
//
// For each zone in CF_ZONE_NAMES, ensure:
//   - apex + `*` CNAME pointing at the Vercel target
//   - all Vercel-bound CNAMEs have `proxied=false` (orange cloud OFF)
//
// Vercel requires DNS-only (grey cloud) on Cloudflare. Orange-cloud breaks
// ACME cert issuance and routing. This script fixes any records that drifted.
// Idempotent — safe to re-run.
//
// Required env:
//   CF_API_TOKEN    token with Zone:DNS:Edit on the target zones
//   CF_ZONE_NAMES   comma-separated, e.g. "จองคิว.net,likesms.net"
// Optional env:
//   CF_VERCEL_CNAME target to set on new records (default "cname.vercel-dns.com")
//                  Existing records are preserved as-is — only `proxied` is
//                  toggled off. Set this only when creating records for the
//                  first time.

const TOKEN = process.env.CF_API_TOKEN;
const ZONE_NAMES = (process.env.CF_ZONE_NAMES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const VERCEL_CNAME = process.env.CF_VERCEL_CNAME || "cname.vercel-dns.com";

if (!TOKEN || ZONE_NAMES.length === 0) {
  console.error("Missing CF_API_TOKEN or CF_ZONE_NAMES");
  process.exit(1);
}

const base = "https://api.cloudflare.com/client/v4";
const H = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function api(path, init = {}) {
  const res = await fetch(base + path, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { ok: res.ok && body?.success !== false, status: res.status, body };
}

function isVercelTarget(content) {
  const t = (content || "").toLowerCase();
  return t.endsWith("vercel-dns.com") || /\.vercel-dns-\d+\.com$/.test(t);
}

async function findZoneId(name) {
  // Cloudflare stores IDN zones under their Unicode name, so pass name as-is.
  const q = encodeURIComponent(name);
  const r = await api(`/zones?name=${q}`);
  if (!r.ok) throw new Error(`zone lookup failed for ${name}: ${JSON.stringify(r.body?.errors)}`);
  const z = r.body.result?.[0];
  if (!z) throw new Error(`zone not found: ${name}`);
  return z.id;
}

async function listDns(zoneId) {
  const r = await api(`/zones/${zoneId}/dns_records?per_page=100`);
  if (!r.ok) throw new Error(`list dns failed: ${JSON.stringify(r.body?.errors)}`);
  return r.body.result || [];
}

async function createCname(zoneId, name, content) {
  const r = await api(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify({ type: "CNAME", name, content, proxied: false, ttl: 1 }),
  });
  if (!r.ok) throw new Error(`create ${name} failed: ${JSON.stringify(r.body?.errors)}`);
  return r.body.result;
}

async function patchProxyOff(zoneId, recordId) {
  const r = await api(`/zones/${zoneId}/dns_records/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ proxied: false }),
  });
  if (!r.ok) throw new Error(`patch failed: ${JSON.stringify(r.body?.errors)}`);
}

async function ensureZone(zoneName) {
  console.log(`\n=== ${zoneName} ===`);
  const zoneId = await findZoneId(zoneName);
  const records = await listDns(zoneId);

  const cnames = records.filter((r) => r.type === "CNAME");
  const byName = new Map(cnames.map((r) => [r.name.toLowerCase(), r]));

  // Cloudflare returns IDN record names in their A-label form. The zone
  // identifies itself by Unicode, so we derive the expected record names
  // from the first CNAME we see (if any) — otherwise we ask Cloudflare
  // via URL normalization.
  const asciiZone = new URL(`http://${zoneName}`).hostname;
  const apex = asciiZone;
  const wildcard = `*.${asciiZone}`;

  for (const want of [apex, wildcard]) {
    const existing = byName.get(want);
    if (!existing) {
      console.log(`[create] ${want} -> ${VERCEL_CNAME} (DNS-only)`);
      await createCname(zoneId, want, VERCEL_CNAME);
      continue;
    }
    if (!isVercelTarget(existing.content)) {
      console.log(`[skip]   ${want} points at '${existing.content}' (not Vercel) — leaving alone`);
      continue;
    }
    if (existing.proxied) {
      console.log(`[fix]    ${want} -> proxied=false`);
      await patchProxyOff(zoneId, existing.id);
    } else {
      console.log(`[ok]     ${want} already DNS-only -> ${existing.content}`);
    }
  }

  // Also fix any other Vercel-bound CNAMEs that happen to be proxied (e.g. www).
  for (const r of cnames) {
    if (r.name.toLowerCase() === apex || r.name.toLowerCase() === wildcard) continue;
    if (!isVercelTarget(r.content)) continue;
    if (r.proxied) {
      console.log(`[fix]    ${r.name} -> proxied=false`);
      await patchProxyOff(zoneId, r.id);
    }
  }
}

(async () => {
  for (const z of ZONE_NAMES) {
    try { await ensureZone(z); }
    catch (e) {
      console.error(`[error] ${z}: ${e.message}`);
      process.exitCode = 1;
    }
  }
  console.log("\nDone.");
})();
