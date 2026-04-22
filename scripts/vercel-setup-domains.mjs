#!/usr/bin/env node
// Vercel domain + env bootstrap for LineBook SaaS.
//
// Adds `likesms.net` and `*.likesms.net` to the Vercel project and writes
// ROOT_DOMAIN / NEXT_PUBLIC_APP_URL env vars. Idempotent — safe to re-run.
//
// Required env:
//   VERCEL_TOKEN      personal/team token with project:write
//   VERCEL_PROJECT    project name or id
//   VERCEL_TEAM_ID    (optional) team id if project lives under a team
//   ROOT_DOMAIN       (optional) defaults to likesms.net

const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT = process.env.VERCEL_PROJECT;
const TEAM_ID = process.env.VERCEL_TEAM_ID || "";
const ROOT = (process.env.ROOT_DOMAIN || "likesms.net").toLowerCase();

if (!TOKEN || !PROJECT) {
  console.error("Missing VERCEL_TOKEN or VERCEL_PROJECT");
  process.exit(1);
}

const teamQ = TEAM_ID ? `?teamId=${encodeURIComponent(TEAM_ID)}` : "";
const teamQAmp = TEAM_ID ? `&teamId=${encodeURIComponent(TEAM_ID)}` : "";
const base = "https://api.vercel.com";

async function api(path, init = {}) {
  const res = await fetch(base + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { ok: res.ok, status: res.status, body };
}

async function listProjectDomains() {
  const r = await api(`/v9/projects/${encodeURIComponent(PROJECT)}/domains${teamQ}`);
  return r.ok ? (r.body?.domains || []) : [];
}

async function addDomain(domain) {
  const r = await api(`/v10/projects/${encodeURIComponent(PROJECT)}/domains${teamQ}`, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
  if (r.ok) {
    console.log(`[domain] added ${domain}`);
    return;
  }
  const code = r.body?.error?.code;
  if (code === "domain_already_in_use" || code === "domain_already_exists") {
    // Could mean (a) already on THIS project (fine) or (b) attached to a
    // different project in the same account — in (b) wildcard resolves to
    // wrong/no deployment and you get DEPLOYMENT_NOT_FOUND.
    const mine = await listProjectDomains();
    const here = mine.find((d) => d.name === domain);
    if (here) {
      console.log(`[domain] ${domain} already on this project`);
      return;
    }
    console.error(
      `[domain] ${domain} is attached to a DIFFERENT project in this account/team.\n` +
      `         Go to https://vercel.com -> other project -> Settings -> Domains -> remove ${domain}, then re-run.`
    );
    process.exitCode = 1;
    return;
  }
  console.error(`[domain] failed ${domain}:`, r.status, r.body);
  process.exitCode = 1;
}

async function verifyDomain(domain) {
  const r = await api(
    `/v9/projects/${encodeURIComponent(PROJECT)}/domains/${encodeURIComponent(domain)}/verify${teamQ}`,
    { method: "POST" }
  );
  if (r.ok) {
    console.log(`[verify] ${domain}: verified=${r.body?.verified ?? "?"}`);
  } else {
    console.log(`[verify] ${domain}: status=${r.status}`, r.body?.error?.message || "");
  }
}

async function domainConfig(domain) {
  const r = await api(`/v6/domains/${encodeURIComponent(domain)}/config${teamQ}`);
  if (r.ok) {
    console.log(`[config] ${domain}:`, JSON.stringify(r.body));
  }
}

async function upsertEnv(key, value) {
  // Remove any existing entries for this key across all envs, then create fresh
  // (plan/prod/preview/development). This keeps the script idempotent.
  const list = await api(`/v9/projects/${encodeURIComponent(PROJECT)}/env${teamQ}`);
  if (list.ok && Array.isArray(list.body?.envs)) {
    for (const e of list.body.envs.filter((x) => x.key === key)) {
      await api(`/v9/projects/${encodeURIComponent(PROJECT)}/env/${e.id}${teamQ}`, {
        method: "DELETE",
      });
    }
  }
  const r = await api(`/v10/projects/${encodeURIComponent(PROJECT)}/env${teamQ}`, {
    method: "POST",
    body: JSON.stringify({
      key,
      value,
      type: "plain",
      target: ["production", "preview", "development"],
    }),
  });
  if (r.ok) console.log(`[env] set ${key}=${value}`);
  else console.error(`[env] failed ${key}:`, r.status, r.body);
}

(async () => {
  console.log(`Project: ${PROJECT}${TEAM_ID ? ` (team ${TEAM_ID})` : ""}`);
  console.log(`Root domain: ${ROOT}`);

  await addDomain(ROOT);
  await addDomain(`*.${ROOT}`);

  await verifyDomain(ROOT);
  await verifyDomain(`*.${ROOT}`);

  await domainConfig(ROOT);
  await domainConfig(`*.${ROOT}`);

  await upsertEnv("ROOT_DOMAIN", ROOT);
  await upsertEnv("NEXT_PUBLIC_APP_URL", `https://${ROOT}`);

  console.log("Done. If Vercel shows 'Invalid Configuration', point DNS:");
  console.log(`  ${ROOT}         A      76.76.21.21`);
  console.log(`  *.${ROOT}       CNAME  cname.vercel-dns.com`);
})();
