"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "../_ctx";
import { Plus, Trash2, Save, Clock, X } from "lucide-react";

/* ─── Thai day labels (index 0=Sun … 6=Sat) ─── */
const DAY_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const DAY_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

type StaffOption = { id: number; name: string; nickname: string | null };
type WHRow = {
  id: number;
  day_of_week: number;
  open_time: string;
  close_time: string;
  staff_id: number | null;
  staff: { id: number; name: string; nickname: string | null } | null;
};

export default function WorkingHoursPage() {
  const { pw } = useAdmin();
  const [rows, setRows] = useState<WHRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null); // id being saved
  const [error, setError] = useState<string | null>(null);

  /* ─── Add-row form state ─── */
  const [showAdd, setShowAdd] = useState(false);
  const [addDay, setAddDay] = useState(1);
  const [addOpen, setAddOpen] = useState("10:00");
  const [addClose, setAddClose] = useState("20:00");
  const [addStaffId, setAddStaffId] = useState<number | "">("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  /* ─── Editable map: id → { open_time, close_time, staff_id } ─── */
  const [edits, setEdits] = useState<Record<number, { open_time: string; close_time: string; staff_id: number | null }>>({});

  const headers = { "Content-Type": "application/json", "x-admin-password": pw };

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hRes, sRes] = await Promise.all([
        fetch("/api/admin/working-hours", { headers }),
        fetch("/api/admin/staff", { headers }),
      ]);
      const hData = await hRes.json();
      const sData = await sRes.json();
      if (hData.error) { setError(hData.error); return; }
      if (sData.error) { setError(sData.error); return; }
      setRows(hData.hours ?? []);
      setStaff(sData.staff ?? []);
    } catch (e) {
      setError("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pw]);

  useEffect(() => { reload(); }, [reload]);

  /* ─── Inline edit tracking ─── */
  function setField(id: number, field: "open_time" | "close_time" | "staff_id", value: string | number | null) {
    setEdits((prev) => {
      const row = rows.find((r) => r.id === id);
      const base = prev[id] ?? {
        open_time: row?.open_time ?? "10:00",
        close_time: row?.close_time ?? "20:00",
        staff_id: row?.staff_id ?? null,
      };
      return { ...prev, [id]: { ...base, [field]: value } };
    });
  }

  function getEdit(id: number, field: "staff_id"): number | null;
  function getEdit(id: number, field: "open_time" | "close_time"): string;
  function getEdit(id: number, field: "open_time" | "close_time" | "staff_id"): string | number | null {
    if (edits[id]) return edits[id][field];
    const row = rows.find((r) => r.id === id);
    if (field === "staff_id") return row?.staff_id ?? null;
    return row?.[field] ?? "";
  }

  function isDirty(id: number) {
    const row = rows.find((r) => r.id === id);
    if (!row || !edits[id]) return false;
    const e = edits[id];
    return e.open_time !== row.open_time || e.close_time !== row.close_time || e.staff_id !== row.staff_id;
  }

  /* ─── Save (PATCH) ─── */
  async function saveRow(id: number) {
    setSaving(id);
    const e = edits[id];
    if (!e) { setSaving(null); return; }
    try {
      const res = await fetch(`/api/admin/working-hours/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(e),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "บันทึกไม่สำเร็จ"); return; }
      setEdits((prev) => { const next = { ...prev }; delete next[id]; return next; });
      await reload();
    } catch {
      setError("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(null);
    }
  }

  /* ─── Delete ─── */
  async function deleteRow(id: number) {
    if (!confirm("ต้องการลบเวลาทำการนี้?")) return;
    try {
      const res = await fetch(`/api/admin/working-hours/${id}`, {
        method: "DELETE",
        headers,
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "ลบไม่สำเร็จ"); return; }
      await reload();
    } catch {
      setError("ลบไม่สำเร็จ");
    }
  }

  /* ─── Add new ─── */
  async function handleAdd() {
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/working-hours", {
        method: "POST",
        headers,
        body: JSON.stringify({
          day_of_week: addDay,
          open_time: addOpen,
          close_time: addClose,
          staff_id: addStaffId || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setAddError(d.error ?? "เพิ่มไม่สำเร็จ"); return; }
      setShowAdd(false);
      setAddDay(1);
      setAddOpen("10:00");
      setAddClose("20:00");
      setAddStaffId("");
      await reload();
    } catch {
      setAddError("เพิ่มไม่สำเร็จ");
    } finally {
      setAdding(false);
    }
  }

  /* ─── Group rows by day_of_week ─── */
  const grouped = rows.reduce<Record<number, WHRow[]>>((acc, r) => {
    (acc[r.day_of_week] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-up">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <Clock size={12} /> Working Hours
          </div>
          <h1 className="h-display text-2xl sm:text-3xl">เวลาทำการ</h1>
          <p className="text-sm text-ink-500 mt-1">
            กำหนดเวลาเปิด-ปิดของร้าน และช่วงเวลาของแต่ละช่าง
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> เพิ่มเวลาทำการ
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="card p-8 text-center text-neutral-500">กำลังโหลด...</div>
      ) : rows.length === 0 && !showAdd ? (
        <div className="card p-8 text-center text-neutral-500">
          ยังไม่มีข้อมูลเวลาทำการ กดปุ่ม &ldquo;เพิ่มเวลาทำการ&rdquo; เพื่อเริ่มต้น
        </div>
      ) : (
        /* Day-by-day cards */
        <div className="space-y-4">
          {DAY_TH.map((dayName, dow) => {
            const dayRows = grouped[dow];
            if (!dayRows?.length) return null;
            return (
              <div key={dow} className="card overflow-hidden">
                <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-100">
                  <span className="font-semibold">วัน{dayName}</span>
                  <span className="text-xs text-neutral-500 ml-2">({DAY_SHORT[dow]})</span>
                </div>
                <div className="divide-y divide-neutral-50">
                  {dayRows.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                      {/* Staff */}
                      <div className="w-36 shrink-0">
                        <label className="text-xs text-neutral-500">ช่าง</label>
                        <select
                          className="input !py-2 text-sm"
                          value={getEdit(r.id, "staff_id") ?? ""}
                          onChange={(e) => setField(r.id, "staff_id", e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">ทั้งร้าน (ค่าเริ่มต้น)</option>
                          {staff.map((s) => (
                            <option key={s.id} value={s.id}>{s.nickname ?? s.name}</option>
                          ))}
                        </select>
                      </div>
                      {/* Open time */}
                      <div className="w-28">
                        <label className="text-xs text-neutral-500">เปิด</label>
                        <input
                          type="time"
                          className="input !py-2 text-sm"
                          value={getEdit(r.id, "open_time")?.slice(0, 5) ?? ""}
                          onChange={(e) => setField(r.id, "open_time", e.target.value + ":00")}
                        />
                      </div>
                      <div className="text-neutral-400 pt-4">—</div>
                      {/* Close time */}
                      <div className="w-28">
                        <label className="text-xs text-neutral-500">ปิด</label>
                        <input
                          type="time"
                          className="input !py-2 text-sm"
                          value={getEdit(r.id, "close_time")?.slice(0, 5) ?? ""}
                          onChange={(e) => setField(r.id, "close_time", e.target.value + ":00")}
                        />
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-4 ml-auto">
                        {isDirty(r.id) && (
                          <button
                            onClick={() => saveRow(r.id)}
                            disabled={saving === r.id}
                            className="btn-primary !py-2 !px-3 text-sm"
                          >
                            <Save size={14} /> {saving === r.id ? "กำลังบันทึก..." : "บันทึก"}
                          </button>
                        )}
                        <button
                          onClick={() => deleteRow(r.id)}
                          className="btn-ghost !py-2 !px-2 text-red-500 hover:text-red-700"
                          title="ลบ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Add modal ─── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">เพิ่มเวลาทำการ</h2>
              <button onClick={() => setShowAdd(false)} className="text-neutral-400 hover:text-neutral-600"><X size={20} /></button>
            </div>

            {addError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-sm">{addError}</div>
            )}

            {/* Day */}
            <div>
              <label className="label">วัน</label>
              <select className="input" value={addDay} onChange={(e) => setAddDay(Number(e.target.value))}>
                {DAY_TH.map((d, i) => (
                  <option key={i} value={i}>วัน{d}</option>
                ))}
              </select>
            </div>

            {/* Staff */}
            <div>
              <label className="label">ช่าง (ไม่เลือก = ทั้งร้าน)</label>
              <select className="input" value={addStaffId} onChange={(e) => setAddStaffId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">ทั้งร้าน (ค่าเริ่มต้น)</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.nickname ?? s.name}</option>
                ))}
              </select>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">เวลาเปิด</label>
                <input type="time" className="input" value={addOpen} onChange={(e) => setAddOpen(e.target.value)} />
              </div>
              <div>
                <label className="label">เวลาปิด</label>
                <input type="time" className="input" value={addClose} onChange={(e) => setAddClose(e.target.value)} />
              </div>
            </div>

            <button onClick={handleAdd} disabled={adding} className="btn-primary w-full">
              <Plus size={16} /> {adding ? "กำลังเพิ่ม..." : "เพิ่ม"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
