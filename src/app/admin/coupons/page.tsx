"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "../_ctx";
import { baht } from "@/lib/utils";
import {
  Plus,
  RefreshCw,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Copy,
  Check,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────── */
type Coupon = {
  id: number;
  code: string;
  name: string;
  kind: "percent" | "amount" | "free_service";
  value: number;
  service_id: number | null;
  min_amount: number;
  max_uses: number | null;
  uses_count: number;
  per_customer_limit: number;
  starts_at: string | null;
  expires_at: string | null;
  issued_by_redeem: boolean;
  active: boolean;
  created_at: string;
};

const KIND_LABELS = {
  percent: "% ลด",
  amount: "฿ ลด",
  free_service: "ฟรี",
};

/* ─── Page ───────────────────────────────────────────────────── */
export default function CouponsPage() {
  const { pw } = useAdmin();
  const [list, setList] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const headers = { "x-admin-password": pw, "Content-Type": "application/json" };

  const [form, setForm] = useState({
    code: "",
    name: "",
    kind: "amount" as "percent" | "amount" | "free_service",
    value: "",
    min_amount: "0",
    max_uses: "",
    per_customer_limit: "1",
    starts_at: "",
    expires_at: "",
  });

  async function reload() {
    setLoading(true);
    const r = await fetch("/api/coupons", { headers });
    if (r.ok) setList((await r.json()).coupons ?? []);
    setLoading(false);
  }

  useEffect(() => { reload(); }, [pw]); // eslint-disable-line react-hooks/exhaustive-deps

  async function create() {
    if (!form.code || !form.name || !form.value) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      code: form.code.trim().toUpperCase(),
      name: form.name,
      kind: form.kind,
      value: Number(form.value),
      min_amount: Number(form.min_amount ?? 0),
      per_customer_limit: Number(form.per_customer_limit ?? 1),
    };
    if (form.max_uses) body.max_uses = Number(form.max_uses);
    if (form.starts_at) body.starts_at = new Date(form.starts_at).toISOString();
    if (form.expires_at) body.expires_at = new Date(form.expires_at).toISOString();
    const r = await fetch("/api/coupons", { method: "POST", headers, body: JSON.stringify(body) });
    if (r.ok) {
      setShowForm(false);
      setForm({ code: "", name: "", kind: "amount", value: "", min_amount: "0", max_uses: "", per_customer_limit: "1", starts_at: "", expires_at: "" });
      reload();
    } else {
      const d = await r.json();
      alert(d.error ?? "บันทึกไม่สำเร็จ");
    }
    setSaving(false);
  }

  async function toggleActive(c: Coupon) {
    await fetch("/api/coupons", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ id: c.id, active: !c.active }),
    });
    reload();
  }

  async function remove(id: number) {
    if (!confirm("ยืนยันลบ coupon นี้?")) return;
    await fetch(`/api/coupons?id=${id}`, { method: "DELETE", headers });
    reload();
  }

  function copyCode(id: number, code: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-up">
        <div>
          <div className="eyebrow">Promotions Engine</div>
          <h1 className="h-display text-2xl sm:text-3xl">คูปองและโปรโมชัน</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} className="btn-secondary" disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> รีเฟรช
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={15} /> สร้างคูปอง
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-5 space-y-4 animate-fade-up">
          <h2 className="font-semibold text-ink-800">สร้างคูปองใหม่</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">รหัสคูปอง *</label>
              <input className="input uppercase" placeholder="SAVE100" value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="label">ชื่อ (admin) *</label>
              <input className="input" placeholder="ส่วนลด 100 บาท" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">ประเภท</label>
              <select className="input" value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as any }))}>
                <option value="amount">ลดเป็นบาท</option>
                <option value="percent">ลดเป็น %</option>
                <option value="free_service">ฟรีบริการ</option>
              </select>
            </div>
            <div>
              <label className="label">มูลค่า * {form.kind === "percent" ? "(%)" : "(฿)"}</label>
              <input className="input" type="number" min="0" placeholder="100" value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
            </div>
            <div>
              <label className="label">ขั้นต่ำการจอง (฿)</label>
              <input className="input" type="number" min="0" value={form.min_amount}
                onChange={(e) => setForm((f) => ({ ...f, min_amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">จำนวนครั้งสูงสุด (เว้นว่าง = ไม่จำกัด)</label>
              <input className="input" type="number" min="1" placeholder="ไม่จำกัด" value={form.max_uses}
                onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))} />
            </div>
            <div>
              <label className="label">ใช้ได้กี่ครั้ง/คน</label>
              <input className="input" type="number" min="1" value={form.per_customer_limit}
                onChange={(e) => setForm((f) => ({ ...f, per_customer_limit: e.target.value }))} />
            </div>
            <div>
              <label className="label">วันเริ่มต้น</label>
              <input className="input" type="datetime-local" value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
            </div>
            <div>
              <label className="label">วันหมดอายุ</label>
              <input className="input" type="datetime-local" value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={create} className="btn-primary" disabled={saving}>
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              บันทึก
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-3">
        {(["active", "inactive", "redeem"] as const).map((type) => {
          const count =
            type === "active" ? list.filter((c) => c.active && !c.issued_by_redeem).length :
            type === "inactive" ? list.filter((c) => !c.active).length :
            list.filter((c) => c.issued_by_redeem).length;
          const labels = { active: "ใช้งานอยู่", inactive: "ปิด", redeem: "จากแต้ม" };
          return (
            <div key={type} className="chip bg-white border border-ink-200 font-semibold">
              {labels[type]}: {count}
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 border-b border-ink-100">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold text-ink-600">รหัส</th>
              <th className="text-left px-3 py-2.5 font-semibold text-ink-600 hidden sm:table-cell">ชื่อ</th>
              <th className="text-center px-3 py-2.5 font-semibold text-ink-600">ประเภท</th>
              <th className="text-center px-3 py-2.5 font-semibold text-ink-600">มูลค่า</th>
              <th className="text-center px-3 py-2.5 font-semibold text-ink-600 hidden md:table-cell">ใช้แล้ว/สูงสุด</th>
              <th className="text-center px-3 py-2.5 font-semibold text-ink-600 hidden lg:table-cell">หมดอายุ</th>
              <th className="text-center px-3 py-2.5 font-semibold text-ink-600">สถานะ</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-400"><RefreshCw className="animate-spin inline mr-2" size={16} />กำลังโหลด...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-400">ยังไม่มีคูปอง — กดสร้างคูปองใหม่</td></tr>
            ) : (
              list.map((c) => {
                const expired = c.expires_at && new Date(c.expires_at) < new Date();
                const maxed = c.max_uses != null && c.uses_count >= c.max_uses;
                const effectiveActive = c.active && !expired && !maxed;
                return (
                  <tr key={c.id} className={`hover:bg-ink-50 transition ${!c.active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <code className="bg-ink-100 px-2 py-0.5 rounded text-xs font-mono font-bold">{c.code}</code>
                        <button
                          onClick={() => copyCode(c.id, c.code)}
                          className="w-6 h-6 rounded-lg hover:bg-ink-200 flex items-center justify-center text-ink-400"
                          title="คัดลอก"
                        >
                          {copiedId === c.id ? <Check size={12} className="text-forest-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                      {c.issued_by_redeem && <span className="text-[10px] text-sage-700 ml-1">จากแต้ม</span>}
                    </td>
                    <td className="px-3 py-2.5 text-ink-600 hidden sm:table-cell max-w-[12rem] truncate">{c.name}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="chip bg-forest-100 text-forest-700 text-xs">{KIND_LABELS[c.kind]}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold text-ink-800">
                      {c.kind === "percent" ? `${c.value}%` : c.kind === "amount" ? baht(c.value) : "ฟรี"}
                    </td>
                    <td className="px-3 py-2.5 text-center text-ink-500 hidden md:table-cell">
                      {c.uses_count} / {c.max_uses ?? "∞"}
                    </td>
                    <td className="px-3 py-2.5 text-center text-ink-400 text-[11px] hidden lg:table-cell">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString("th-TH") : "ไม่จำกัด"}
                      {expired && <span className="ml-1 text-red-500">(หมด)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => toggleActive(c)} title={c.active ? "ปิด" : "เปิด"}>
                        {effectiveActive
                          ? <ToggleRight size={22} className="text-forest-500" />
                          : <ToggleLeft size={22} className="text-ink-300" />}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      {!c.issued_by_redeem && (
                        <button
                          onClick={() => remove(c.id)}
                          className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500 text-ink-300 flex items-center justify-center transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
