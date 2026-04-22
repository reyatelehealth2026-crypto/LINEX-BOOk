"use client";
import { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";

export default function SuperLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/super/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      setErr(b.error || "login_failed");
      return;
    }
    window.location.href = "/super";
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="card p-7 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md bg-ink-900 text-white flex items-center justify-center">
            <Lock size={20} />
          </div>
          <div>
            <div className="eyebrow">Platform</div>
            <h1 className="h-display text-xl">Super Admin</h1>
          </div>
        </div>
        <div>
          <label className="label">อีเมล</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label">รหัสผ่าน</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <p className="text-xs text-red-600">เข้าสู่ระบบไม่สำเร็จ: {err}</p>}
        <button className="btn-primary w-full justify-center" disabled={busy}>
          <ShieldCheck size={16} /> {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
      </form>
    </main>
  );
}
