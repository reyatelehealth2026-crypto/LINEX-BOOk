// Attach tenant subdomains to the Vercel project on signup so each shop gets
// its own HTTP-01-issued cert without needing a wildcard. This is the
// per-subdomain workaround for running on Vercel while DNS stays on a
// third-party nameserver (wildcard certs on Vercel require Vercel-hosted DNS).
//
// All three env vars must be set for attach to run. If any is missing the
// helper returns `{ attempted: false }` and signup proceeds — an operator
// can attach manually later via `scripts/vercel-setup-domains.mjs` or the
// Vercel dashboard.

type AttachResult =
  | { attempted: false; reason: string }
  | { attempted: true; ok: true; domain: string }
  | { attempted: true; ok: false; domain: string; error: string };

function env() {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId) return null;
  return { token, projectId, teamId: teamId || "" };
}

function toAscii(domain: string): string {
  try { return new URL(`http://${domain.toLowerCase()}`).hostname; }
  catch { return domain.toLowerCase(); }
}

export async function attachTenantDomain(slug: string, rootDomain: string): Promise<AttachResult> {
  const e = env();
  if (!e) return { attempted: false, reason: "missing VERCEL_TOKEN or VERCEL_PROJECT_ID" };

  const host = `${slug}.${toAscii(rootDomain)}`;
  const q = e.teamId ? `?teamId=${encodeURIComponent(e.teamId)}` : "";
  const H = {
    Authorization: `Bearer ${e.token}`,
    "Content-Type": "application/json",
  };

  try {
    const r = await fetch(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(e.projectId)}/domains${q}`,
      { method: "POST", headers: H, body: JSON.stringify({ name: host }) },
    );
    if (r.ok) return { attempted: true, ok: true, domain: host };
    const body = await r.json().catch(() => ({}));
    const code = body?.error?.code;
    // Treat "already attached to this project" as success.
    if (code === "domain_already_in_use" || code === "domain_already_exists") {
      return { attempted: true, ok: true, domain: host };
    }
    return {
      attempted: true,
      ok: false,
      domain: host,
      error: `${r.status} ${code || "unknown"}: ${body?.error?.message || ""}`.trim(),
    };
  } catch (err: any) {
    return { attempted: true, ok: false, domain: host, error: err?.message || String(err) };
  }
}
