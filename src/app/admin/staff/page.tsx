"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "../_ctx";
import { Plus, Pencil, Trash2, Check, X, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import type { Staff } from "@/types/db";
import ImageUpload from "@/components/ImageUpload";

export default function StaffPage() {
  const { pw } = useAdmin();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  const headers = { "Content-Type": "application/json", "x-admin-password": pw };

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/staff", { headers: { "x-admin-password": pw } });
    const d = await r.json();
    setStaff(d.staff ?? []);
    setLoading(false);
  }, [pw]);

  useEffect(() => { reload(); }, [reload]);

  async function handleSave(id: number | "new", fields: Partial<Staff>) {
    setSaving(true);
    try {
      if (id === "new") {
        const r = await fetch("/api/admin/staff", { method: "POST", headers, body: JSON.stringify(fields) });
        if (!r.ok) { const e = await r.json(); alert(e.error ?? "เกิดข้อผิดพลาด"); return; }
      } else {
        const r = await fetch(`/api/admin/staff/${id}`, { method: "PATCH", headers, body: JSON.stringify(fields) });
        if (!r.ok) { const e = await r.json(); alert(e.error ?? "เกิดข้อผิดพลาด"); return; }
      }
      setEditing(null);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("ต้องการลบพนักงานคนนี้?")) return;
    const r = await fetch(`/api/admin/staff/${id}`, { method: "DELETE", headers });
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "เกิดข้อผิดพลาด"); return; }
    await reload();
  }

  async function toggleActive(s: Staff) {
    await fetch(`/api/admin/staff/${s.id}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ active: !s.active }),
    });
    await reload();
  }

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="eyebrow">Staff</div>
          <h1 className="h-display text-2xl sm:text-3xl">จัดการพนักงาน</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} className="btn-secondary"><RefreshCw size={16} /> รีโหลด</button>
          <button onClick={() => setEditing("new")} className="btn-primary"><Plus size={16} /> เพิ่มพนักงาน</button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-ink-500">กำลังโหลด...</div>
      ) : staff.length === 0 && editing !== "new" ? (
        <div className="card p-8 text-center text-ink-500">ยังไม่มีพนักงาน กด &quot;เพิ่มพนักงาน&quot เพื่อเริ่มต้น</div>
      ) : (
        <div className="space-y-2">
          {editing === "new" && (
            <StaffEditor
              pw={pw}
              onSave={(f) => handleSave("new", f)}
              onCancel={() => setEditing(null)}
              saving={saving}
            />
          )}
          {staff.map((s) =>
            editing === s.id ? (
              <StaffEditor
                key={s.id}
                pw={pw}
                initial={s}
                onSave={(f) => handleSave(s.id, f)}
                onCancel={() => setEditing(null)}
                saving={saving}
              />
            ) : (
              <div key={s.id} className="card p-4 flex items-center gap-4">
                {s.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-bold flex-shrink-0">
                    {s.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{s.name}</span>
                    {s.nickname && <span className="text-sm text-ink-500">&quot;{s.nickname}&quot;</span>}
                    {!s.active && <span className="chip bg-ink-200 text-ink-500">ปิด</span>}
                  </div>
                  {s.bio && <div className="text-sm text-ink-500 truncate">{s.bio}</div>}
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

function StaffEditor({
  initial,
  onSave,
  onCancel,
  saving,
  pw,
}: {
  initial?: Staff;
  onSave: (fields: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
  pw: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar_url ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [active, setActive] = useState(initial?.active ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { alert("กรุณาใส่ชื่อพนักงาน"); return; }
    onSave({
      name: name.trim(),
      nickname: nickname.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      sort_order: Number(sortOrder) || 0,
      active,
    });
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3 border-ink-300 bg-ink-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">ชื่อ-นามสกุล *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สมหญิง ใจดี" required />
        </div>
        <div>
          <label className="label">ชื่อเล่น</label>
          <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="เช่น หญิง" />
        </div>
        <ImageUpload value={avatarUrl} onChange={setAvatarUrl} folder="staff" pw={pw} label="รูปโปรไฟล์" />
        <div>
          <label className="label">ลำดับแสดงผล</label>
          <input className="input" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-5 h-5 accent-ink-900" />
            <span className="text-sm font-medium">{active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span>
          </label>
        </div>
      </div>
      <div>
        <label className="label">ข้อมูลเพิ่มเติม / สเปเชียลลิสต์</label>
        <textarea className="input" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="เช่น ช่างตัดผม 10 ปี, สเปเชียลลิสต์ทำสี" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={saving}><X size={16} /> ยกเลิก</button>
        <button type="submit" className="btn-primary" disabled={saving}><Check size={16} /> {saving ? "กำลังบันทึก..." : "บันทึก"}</button>
      </div>
    </form>
  );
}
