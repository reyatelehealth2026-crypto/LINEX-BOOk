// Seed / upsert a super-admin row.
// Usage:
//   node scripts/create-super-admin.mjs --email you@example.com --password s3cret
//   node scripts/create-super-admin.mjs --line U1234... --name "Ops Lead"
//   (any combination — email/password and line_user_id can coexist)
//
// Reads env from .env.local. Requires SUPABASE_SERVICE_ROLE_KEY.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
function flag(name) {
  const i = args.findIndex((a) => a === `--${name}`);
  return i >= 0 ? args[i + 1] : null;
}

let email = flag("email");
let password = flag("password");
let lineId = flag("line");
let name = flag("name");

async function prompt(q, hidden = false) {
  if (hidden) {
    // No-echo is tricky cross-platform; just read normally and warn.
    console.log("  (input will be visible)");
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(q, (a) => { rl.close(); resolve(a.trim()); }));
}

if (!email && !lineId) {
  email = await prompt("email (เว้นว่างได้ถ้าใช้ LINE id): ");
  if (!email) {
    lineId = await prompt("line_user_id (Uxxxxxxxx): ");
  }
}
if (email && !password) {
  password = await prompt("password: ", true);
}
if (!name) name = await prompt("display name (optional): ");

if (!email && !lineId) {
  console.error("ต้องระบุ email หรือ line_user_id อย่างน้อยหนึ่งอย่าง");
  process.exit(1);
}
if (email && !password) {
  console.error("ต้องระบุ password เมื่อใช้ email");
  process.exit(1);
}

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

const row = {
  email: email ? email.toLowerCase() : null,
  password_hash: password ? hashPassword(password) : null,
  line_user_id: lineId || null,
  display_name: name || null,
  active: true,
};

const headers = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=representation",
};

const onConflict = email ? "email" : "line_user_id";
const url = `${SUPA_URL}/rest/v1/super_admins?on_conflict=${onConflict}`;

const res = await fetch(url, {
  method: "POST",
  headers,
  body: JSON.stringify([row]),
});
const body = await res.text();
if (!res.ok) {
  console.error("Insert failed:", res.status, body);
  process.exit(1);
}
const [created] = JSON.parse(body);
console.log("✓ super_admin saved:", {
  id: created.id,
  email: created.email,
  line_user_id: created.line_user_id,
  display_name: created.display_name,
});
console.log("\nLogin at: https://<your-root-domain>/super/login");
