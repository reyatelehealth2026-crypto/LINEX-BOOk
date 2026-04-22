"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Settings } from "lucide-react";

type Shop = {
  id: number;
  slug: string;
  name: string;
  phone: string | null;
  business_type: string | null;
  onboarding_status: string;
  line_oa_id: string | null;
  has_access_token: boolean;
  has_channel_secret: boolean;
};

const STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  setup_in_progress: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export default function SuperDashboard() {
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/super/shops")
      .then(async (r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((d) => setShops(d.shops ?? []))
      .catch(() => setErr("โหลดไม่สำเร็จ"));
  }, []);

  async function impersonate(id: number) {
    const r = await fetch(`/api/super/shops/${id}/impersonate`, { method: "POST" });
    if (!r.ok) { alert("mint token failed"); return; }
    const d = await r.json();
    window.open(d.url, "_blank");
  }

  const visible = (shops ?? []).filter((s) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="eyebrow">Platform · Tenants</div>
          <h1 className="h-display text-2xl sm:text-3xl">ร้านทั้งหมด</h1>
        </div>
        <input
          className="input max-w-xs"
          placeholder="ค้นหาชื่อหรือ slug…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {shops === null && !err && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16" />)}
        </div>
      )}
      {shops && visible.length === 0 && (
        <div className="card p-10 text-center text-ink-500 text-sm">ยังไม่มีร้าน</div>
      )}
      {shops && visible.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-ink-500 bg-ink-50">
              <tr>
                <th className="text-left font-semibold px-4 py-3">ร้าน</th>
                <th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">slug</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">ประเภท</th>
                <th className="text-left font-semibold px-4 py-3">สถานะ</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">LINE</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id} className="border-t border-ink-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink-900">{s.name}</div>
                    <div className="text-[11px] text-ink-400">#{s.id}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-600 hidden sm:table-cell">{s.slug}</td>
                  <td className="px-4 py-3 text-ink-500 hidden md:table-cell">{s.business_type ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`chip ${STATUS_CLS[s.onboarding_status] ?? "bg-ink-100 text-ink-600"}`}>
                      {s.onboarding_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs">
                    {s.has_access_token ? (
                      <span className="text-emerald-700">✓ token</span>
                    ) : (
                      <span className="text-ink-400">no token</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/super/shops/${s.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-ink-100 text-ink-700 hover:bg-ink-200"
                      >
                        <Settings size={12} /> ตั้งค่า
                      </Link>
                      <button
                        onClick={() => impersonate(s.id)}
                        title="เข้าเป็นแอดมินร้านนี้"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-ink-900 text-white hover:bg-ink-800"
                      >
                        <ExternalLink size={12} /> เข้าร้าน
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
