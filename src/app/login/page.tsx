"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, LogIn, Search } from "lucide-react";

export default function LoginPage() {
  const [slug, setSlug] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"slug" | "email">("slug");
  const [email, setEmail] = useState("");

  async function goBySlug(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const s = slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(s)) {
      setErr("slug ไม่ถูกต้อง (a-z, 0-9, -, ยาว 3-30 ตัว)");
      return;
    }
    setBusy(true);
    const r = await fetch(`/api/signup/check-slug?slug=${encodeURIComponent(s)}`);
    setBusy(false);
    if (!r.ok) { setErr("เช็ค slug ไม่สำเร็จ"); return; }
    const d = await r.json();
    // check-slug returns { available: false, reason: "taken" } when the shop exists.
    if (d.reason !== "taken") {
      setErr(`ไม่พบร้าน "${s}" — ตรวจสอบ slug อีกครั้ง`);
      return;
    }
    const host = typeof window !== "undefined" ? window.location.host : "";
    const rootDomain = host.replace(/^www\./, "");
    const proto = window.location.protocol;
    window.location.href = `${proto}//${s}.${rootDomain}/admin`;
  }

  async function goByEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const r = await fetch("/api/lookup-shop-by-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    setBusy(false);
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      setErr(b.error === "not_found" ? "ไม่พบร้านที่ใช้อีเมลนี้" : "ค้นหาไม่สำเร็จ");
      return;
    }
    const d = await r.json();
    const host = typeof window !== "undefined" ? window.location.host : "";
    const rootDomain = host.replace(/^www\./, "");
    const proto = window.location.protocol;
    window.location.href = `${proto}//${d.slug}.${rootDomain}/admin`;
  }

  return (
    <main className="min-h-screen bg-ink-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <form
          onSubmit={mode === "slug" ? goBySlug : goByEmail}
          className="card p-7 space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-ink-900 text-white flex items-center justify-center">
              <LogIn size={20} />
            </div>
            <div>
              <div className="eyebrow">LineBook</div>
              <h1 className="h-display text-xl">เข้าสู่ระบบร้าน</h1>
            </div>
          </div>

          <div className="flex gap-1.5 bg-ink-100 p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("slug")}
              className={`flex-1 py-1.5 rounded-md transition ${
                mode === "slug" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"
              }`}
            >
              ใช้ slug ของร้าน
            </button>
            <button
              type="button"
              onClick={() => setMode("email")}
              className={`flex-1 py-1.5 rounded-md transition ${
                mode === "email" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"
              }`}
            >
              ใช้อีเมล
            </button>
          </div>

          {mode === "slug" ? (
            <div>
              <label className="label">slug ของร้าน</label>
              <div className="flex items-stretch gap-0 rounded-xl border border-ink-200 focus-within:border-ink-500 overflow-hidden bg-white">
                <input
                  className="flex-1 px-3 py-2.5 outline-none text-sm font-mono"
                  placeholder="เช่น hairx"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  autoFocus
                />
                <div className="bg-ink-50 border-l border-ink-200 px-3 flex items-center text-xs text-ink-500 font-mono">
                  .จองคิว.net
                </div>
              </div>
              <p className="text-[11px] text-ink-400 mt-1.5">
                URL ที่ได้จากตอนสมัคร เช่น <span className="font-mono">hairx.จองคิว.net</span>
              </p>
            </div>
          ) : (
            <div>
              <label className="label">อีเมลเจ้าของร้าน</label>
              <input
                type="email"
                className="input"
                placeholder="owner@shop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
          )}

          {err && <p className="text-xs text-red-600">{err}</p>}

          <button className="btn-primary w-full justify-center" disabled={busy}>
            {busy ? (
              <>กำลังค้นหา…</>
            ) : (
              <>
                {mode === "slug" ? <ArrowRight size={16} /> : <Search size={16} />}
                ไปหน้าแอดมินร้าน
              </>
            )}
          </button>

          <p className="text-xs text-center text-ink-500 pt-2 border-t border-ink-100">
            ยังไม่มีร้าน?{" "}
            <Link href="/signup" className="text-ink-900 font-semibold">
              สมัครฟรี
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
