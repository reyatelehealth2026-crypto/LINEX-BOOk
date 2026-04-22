"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "../_ctx";
import { baht } from "@/lib/utils";
import { Plus, Pencil, Trash2, Check, X, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import type { Service } from "@/types/db";

export default function ServicesPage() {
  const { pw } = useAdmin();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  const headers = { "Content-Type": "application/json", "x-admin-password": pw };

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/services", { headers: { "x-admin-password": pw } });
    const d = await r.json();
    setServices(d.services ?? []);
    setLoading(false);
  }, [pw]);

  useEffect(() => { reload(); }, [reload]);

  async function handleSave(id: number | "new", fields: Partial<Service>) {
    setSaving(true);
    try {
      if (id === "new") {
        const r = await fetch("/api/admin/services", { method: "POST", headers, body: JSON.stringify(fields) });
        if (!r.ok) { const e = await r.json(); alert(e.error ?? "เกิดข้อผิดพลาด"); return; }
      } else {
        const r = await fetch(`/api/admin/services/${id}`, { method: "PATCH", headers, body: JSON.stringify(fields) });
        if (!r.ok) { const e = await r.json(); alert(e.error ?? "เกิดข้อผิดพลาด"); return; }
      }
      setEditing(null);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("ต้องการลบบริการนี้?")) return;
    const r = await fetch(`/api/admin/services/${id}`, { method: "DELETE", headers });
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "เกิดข้อผิดพลาด"); return; }
    await reload();
  }

  async function toggleActive(s: Service) {
    await fetch(`/api/admin/services/${s.id}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ active: !s.active }),
    });
    await reload();
  }

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="eyebrow">Services</div>
          <h1 className="h-display text-2xl sm:text-3xl">จัดการบริการ</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} className="btn-secondary"><RefreshCw size={16} /> รีโหลด</button>
          <button onClick={() => setEditing("new")} className="btn-primary"><Plus size={16} /> เพิ่มบริการ</button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-ink-500">กำลังโหลด...</div>
      ) : services.length === 0 && editing !== "new" ? (
        <div className="card p-8 text-center text-ink-500">ยังไม่มีบริการ กด &quot;เพิ่มบริการ&quot เพื่อเริ่มต้น</div>
      ) : (
        <div className="space-y-2">
          {editing === "new" && (
            <ServiceEditor
              onSave={(f) => handleSave("new", f)}
              onCancel={() => setEditing(null)}
              saving={saving}
            />
          )}
          {services.map((s) =>
            editing === s.id ? (
              <ServiceEditor
                key={s.id}
                initial={s}
                onSave={(f) => handleSave(s.id, f)}
                onCancel={() => setEditing(null)}
                saving={saving}
              />
            ) : (
              <div key={s.id} className="card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{s.name}</span>
                    {!s.active && <span className="chip bg-ink-200 text-ink-500">ปิด</span>}
                  </div>
                  <div className="text-sm text-ink-600">
                    {s.duration_min} นาที · {baht(s.price)}
                    {s.name_en && <span className="text-ink-400 ml-2">({s.name_en})</span>}
                  </div>
                </div>
                <div className="text-sm text-ink-400">#{s.sort_order}</div>
                <button onClick={() => toggleActive(s)} className="btn-ghost !p-2" title={s.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}>
                  {s.active ? <ToggleRight size={24} className="text-ink-900" /> : <ToggleLeft size={24} className="text-ink-400" />}
                </button>
                <button onClick={() => setEditing(s.id)} className="btn-ghost !p-2" title="แก้ไข"><Pencil size={18} /></button>
                <button onClick={() => handleDelete(s.id)} className="btn-ghost !p-2 text-red-500 hover:text-red-600" title="ลบ"><Trash2 size={18} /></button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ServiceEditor({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Service;
  onSave: (fields: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [duration, setDuration] = useState(String(initial?.duration_min ?? 60));
  const [price, setPrice] = useState(String(initial?.price ?? 0));
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [active, setActive] = useState(initial?.active ?? true);
  const [desc, setDesc] = useState(initial?.description ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { alert("กรุณาใส่ชื่อบริการ"); return; }
    onSave({
      name: name.trim(),
      name_en: nameEn.trim() || null,
      description: desc.trim() || null,
      duration_min: Number(duration) || 60,
      price: Number(price) || 0,
      sort_order: Number(sortOrder) || 0,
      active,
    });
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3 border-ink-300 bg-ink-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">ชื่อบริการ *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ตัดผม" required />
        </div>
        <div>
          <label className="label">ชื่อภาษาอังกฤษ</label>
          <input className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Haircut" />
        </div>
        <div>
          <label className="label">ระยะเวลา (นาที) *</label>
          <input className="input" type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div>
          <label className="label">ราคา (บาท) *</label>
          <input className="input" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <label className="label">ลำดับแสดงผล</label>
          <input className="input" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-5 h-5 accent-ink-900" />
            <span className="text-sm font-medium">{active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span>
          </label>
        </div>
      </div>
      <div>
        <label className="label">รายละเอียด</label>
        <textarea className="input" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="คำอธิบายเพิ่มเติม (ถ้ามี)" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={saving}><X size={16} /> ยกเลิก</button>
        <button type="submit" className="btn-primary" disabled={saving}><Check size={16} /> {saving ? "กำลังบันทึก..." : "บันทึก"}</button>
      </div>
    </form>
  );
}
