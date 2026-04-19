"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "../_ctx";
import {
  Plus, Pencil, Trash2, Check, X, RefreshCw,
  ToggleLeft, ToggleRight, Eye, Tag, Send,
} from "lucide-react";
import type { MessageTemplate, TemplateCategory } from "@/types/db";

const CATEGORY_LABELS: Record<TemplateCategory, { label: string; color: string }> = {
  reminder: { label: "⏰ เตือน", color: "bg-amber-100 text-amber-700" },
  promo: { label: "🎉 โปรโมชั่น", color: "bg-purple-100 text-purple-700" },
  follow_up: { label: "💬 ติดตาม", color: "bg-blue-100 text-blue-700" },
  custom: { label: "📝 อื่นๆ", color: "bg-neutral-100 text-neutral-600" },
};

const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: "reminder", label: "⏰ เตือน (Reminder)" },
  { value: "promo", label: "🎉 โปรโมชั่น (Promo)" },
  { value: "follow_up", label: "💬 ติดตาม (Follow-up)" },
  { value: "custom", label: "📝 อื่นๆ (Custom)" },
];

const KNOWN_VARS = [
  "{{customer_name}}", "{{service_name}}", "{{date}}",
  "{{time}}", "{{shop_name}}", "{{staff_name}}",
];

export default function TemplatesPage() {
  const { pw } = useAdmin();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewResult, setPreviewResult] = useState<{ subject: string | null; body: string; missing_vars: string[] } | null>(null);

  const headers = { "Content-Type": "application/json", "x-admin-password": pw };

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/message-templates", { headers: { "x-admin-password": pw } });
    const d = await r.json();
    setTemplates(d.templates ?? []);
    setLoading(false);
  }, [pw]);

  useEffect(() => { reload(); }, [reload]);

  async function handleSave(id: number | "new", fields: Partial<MessageTemplate>) {
    setSaving(true);
    try {
      if (id === "new") {
        const r = await fetch("/api/admin/message-templates", { method: "POST", headers, body: JSON.stringify(fields) });
        if (!r.ok) { const e = await r.json(); alert(e.error ?? "เกิดข้อผิดพลาด"); return; }
      } else {
        const r = await fetch(`/api/admin/message-templates/${id}`, { method: "PATCH", headers, body: JSON.stringify(fields) });
        if (!r.ok) { const e = await r.json(); alert(e.error ?? "เกิดข้อผิดพลาด"); return; }
      }
      setEditing(null);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("ต้องการลบเทมเพลตนี้?")) return;
    const r = await fetch(`/api/admin/message-templates/${id}`, { method: "DELETE", headers });
    if (!r.ok) { const e = await r.json(); alert(e.error ?? "เกิดข้อผิดพลาด"); return; }
    await reload();
  }

  async function toggleActive(t: MessageTemplate) {
    await fetch(`/api/admin/message-templates/${t.id}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ active: !t.active }),
    });
    await reload();
  }

  async function showPreview(id: number) {
    if (previewId === id && previewResult) {
      setPreviewId(null);
      setPreviewResult(null);
      return;
    }
    const r = await fetch("/api/admin/message-templates/preview", {
      method: "POST", headers,
      body: JSON.stringify({ template_id: id }),
    });
    if (r.ok) {
      const d = await r.json();
      setPreviewId(id);
      setPreviewResult(d);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📩 เทมเพลตข้อความ</h1>
        <div className="flex gap-2">
          <button onClick={reload} className="btn-secondary"><RefreshCw size={16} /> รีโหลด</button>
          <button onClick={() => setEditing("new")} className="btn-primary"><Plus size={16} /> สร้างเทมเพลต</button>
        </div>
      </div>

      <div className="card p-4 bg-brand-50/40 border-brand-200">
        <div className="flex items-start gap-2">
          <Tag size={18} className="text-brand-500 mt-0.5 shrink-0" />
          <div className="text-sm text-neutral-600">
            <span className="font-semibold text-brand-700">ตัวแปรที่ใช้ได้:</span>{" "}
            {KNOWN_VARS.map((v) => (
              <code key={v} className="bg-white px-1.5 py-0.5 rounded text-xs border border-neutral-200 mr-1">{v}</code>
            ))}
            <span className="block text-xs text-neutral-500 mt-1">วางในข้อความได้เลย ระบบจะแทนที่อัตโนมัติเวลาส่งจริง</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-neutral-500">กำลังโหลด...</div>
      ) : templates.length === 0 && editing !== "new" ? (
        <div className="card p-8 text-center text-neutral-500">
          ยังไม่มีเทมเพลต กด &quot;สร้างเทมเพลต&quot; เพื่อเริ่มต้น
        </div>
      ) : (
        <div className="space-y-2">
          {editing === "new" && (
            <TemplateEditor
              onSave={(f) => handleSave("new", f)}
              onCancel={() => setEditing(null)}
              saving={saving}
            />
          )}
          {templates.map((t) => (
            <div key={t.id}>
              {editing === t.id ? (
                <TemplateEditor
                  initial={t}
                  onSave={(f) => handleSave(t.id, f)}
                  onCancel={() => setEditing(null)}
                  saving={saving}
                />
              ) : (
                <div className="card p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{t.name}</span>
                        <span className={`chip ${CATEGORY_LABELS[t.category]?.color ?? "bg-neutral-100"}`}>
                          {CATEGORY_LABELS[t.category]?.label ?? t.category}
                        </span>
                        {!t.active && <span className="chip bg-neutral-200 text-neutral-500">ปิด</span>}
                      </div>
                      {t.subject && <div className="text-sm font-medium text-neutral-700 mt-1">{t.subject}</div>}
                      <div className="text-sm text-neutral-600 mt-1 whitespace-pre-line line-clamp-3">{t.body}</div>
                    </div>
                    <div className="text-sm text-neutral-400">#{t.sort_order}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    <button onClick={() => showPreview(t.id)} className="btn-ghost !py-1 !px-2 text-xs" title="ดูตัวอย่าง">
                      <Eye size={14} /> {previewId === t.id ? "ซ่อนตัวอย่าง" : "ดูตัวอย่าง"}
                    </button>
                    <button onClick={() => toggleActive(t)} className="btn-ghost !p-2" title={t.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}>
                      {t.active ? <ToggleRight size={24} className="text-brand-500" /> : <ToggleLeft size={24} className="text-neutral-400" />}
                    </button>
                    <button onClick={() => setEditing(t.id)} className="btn-ghost !p-2" title="แก้ไข"><Pencil size={18} /></button>
                    <button onClick={() => handleDelete(t.id)} className="btn-ghost !p-2 text-red-500 hover:text-red-600" title="ลบ"><Trash2 size={18} /></button>
                  </div>
                  {previewId === t.id && previewResult && (
                    <div className="border-t border-neutral-200 pt-3 mt-1">
                      <div className="text-xs font-semibold text-neutral-500 mb-1 flex items-center gap-1"><Send size={12} /> ตัวอย่างข้อความ</div>
                      {previewResult.subject && (
                        <div className="text-sm font-bold text-neutral-800 mb-1">{previewResult.subject}</div>
                      )}
                      <div className="bg-white border border-neutral-200 rounded-xl p-3 text-sm whitespace-pre-line">
                        {previewResult.body}
                      </div>
                      {previewResult.missing_vars.length > 0 && (
                        <div className="text-xs text-amber-600 mt-1">
                          ⚠️ ตัวแปรไม่รู้จัก: {previewResult.missing_vars.map((v) => `{{${v}}}`).join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: MessageTemplate;
  onSave: (fields: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<TemplateCategory>(initial?.category ?? "custom");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [active, setActive] = useState(initial?.active ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { alert("กรุณาใส่ชื่อเทมเพลต"); return; }
    if (!body.trim()) { alert("กรุณาใส่ข้อความ"); return; }
    onSave({
      name: name.trim(),
      category,
      subject: subject.trim() || null,
      body: body.trim(),
      sort_order: Number(sortOrder) || 0,
      active,
    });
  }

  function insertVar(v: string) {
    setBody((prev) => prev + v);
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3 border-brand-200 bg-brand-50/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">ชื่อเทมเพลต *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น เตือนนัด 1 ชม." required />
        </div>
        <div>
          <label className="label">หมวดหมู่</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as TemplateCategory)}>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">หัวข้อ (ไม่จำเป็น)</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="เช่น ⏰ แจ้งเตือนนัด" />
        </div>
        <div>
          <label className="label">ลำดับแสดงผล</label>
          <input className="input" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-5 h-5 accent-brand-500" />
            <span className="text-sm font-medium">{active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span>
          </label>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label !mb-0">ข้อความ *</label>
          <div className="flex gap-1 flex-wrap">
            {KNOWN_VARS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVar(v)}
                className="text-xs bg-white border border-neutral-200 rounded px-1.5 py-0.5 hover:bg-brand-50 text-neutral-600"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <textarea
          className="input"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"สวัสดีค่ะ {{customer_name}}\nเตือนว่าพรุ่งนี้ {{date}} เวลา {{time}} มีนัด{{service_name}}..."}
          required
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={saving}><X size={16} /> ยกเลิก</button>
        <button type="submit" className="btn-primary" disabled={saving}><Check size={16} /> {saving ? "กำลังบันทึก..." : "บันทึก"}</button>
      </div>
    </form>
  );
}
