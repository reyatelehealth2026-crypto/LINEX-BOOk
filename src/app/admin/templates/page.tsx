"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "../_ctx";
import {
  Plus, Pencil, Trash2, Check, X, RefreshCw,
  ToggleLeft, ToggleRight, Eye, Tag, Send, Database, Copy,
  MessageSquareText, AlertTriangle,
} from "lucide-react";
import type { MessageTemplate, TemplateCategory } from "@/types/db";

const CATEGORY_LABELS: Record<TemplateCategory, { label: string; color: string }> = {
  reminder: { label: "เตือน", color: "bg-amber-100 text-amber-700" },
  promo: { label: "โปรโมชั่น", color: "bg-sage-200 text-sage-700" },
  follow_up: { label: "ติดตาม", color: "bg-forest-100 text-forest-700" },
  custom: { label: "อื่นๆ", color: "bg-ink-100 text-ink-700" },
};

const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: "reminder", label: "เตือน (Reminder)" },
  { value: "promo", label: "โปรโมชั่น (Promo)" },
  { value: "follow_up", label: "ติดตาม (Follow-up)" },
  { value: "custom", label: "อื่นๆ (Custom)" },
];

const KNOWN_VARS = [
  "{{customer_name}}", "{{service_name}}", "{{date}}",
  "{{time}}", "{{shop_name}}", "{{staff_name}}",
];

type TableMissingInfo = { error: "table_missing"; table: string; detail: string; migration: string };

export default function TemplatesPage() {
  const { pw } = useAdmin();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState<TableMissingInfo | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewResult, setPreviewResult] = useState<{ subject: string | null; body: string; missing_vars: string[] } | null>(null);

  const headers = { "Content-Type": "application/json", "x-admin-password": pw };

  const reload = useCallback(async () => {
    setLoading(true);
    setTableMissing(null);
    const r = await fetch("/api/admin/message-templates", { headers: { "x-admin-password": pw } });
    const d = await r.json();
    if (!r.ok) {
      if (d?.error === "table_missing") {
        setTableMissing(d);
      }
      setTemplates([]);
    } else {
      setTemplates(d.templates ?? []);
    }
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
    <div className="space-y-4 sm:space-y-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <MessageSquareText size={12} /> Message Templates
          </div>
          <h1 className="h-display text-2xl sm:text-3xl">เทมเพลตข้อความ</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} className="btn-secondary" disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> รีโหลด
          </button>
          <button
            onClick={() => setEditing("new")}
            className="btn-primary"
            disabled={!!tableMissing}
          >
            <Plus size={16} /> สร้างเทมเพลต
          </button>
        </div>
      </div>

      {tableMissing ? (
        <TableMissingBanner info={tableMissing} onRetry={reload} />
      ) : (
        <div className="card p-4 border-ink-300 bg-ink-50">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-md bg-ink-900 text-white flex items-center justify-center shrink-0">
              <Tag size={16} />
            </div>
            <div className="text-sm text-ink-700">
              <span className="font-semibold text-ink-900">ตัวแปรที่ใช้ได้:</span>{" "}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {KNOWN_VARS.map((v) => (
                  <code key={v} className="bg-white px-2 py-0.5 rounded-lg text-xs border border-ink-200 font-mono">
                    {v}
                  </code>
                ))}
              </div>
              <span className="block text-xs text-ink-500 mt-2">
                วางในข้อความได้เลย ระบบจะแทนที่อัตโนมัติเวลาส่งจริง
              </span>
            </div>
          </div>
        </div>
      )}

      {tableMissing ? null : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      ) : templates.length === 0 && editing !== "new" ? (
        <div className="card p-10 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-md border border-ink-200 bg-ink-50 text-ink-400 flex items-center justify-center">
            <MessageSquareText size={22} />
          </div>
          <div className="text-sm text-ink-500">ยังไม่มีเทมเพลต</div>
          <button onClick={() => setEditing("new")} className="btn-primary text-sm">
            <Plus size={14} /> สร้างเทมเพลตแรก
          </button>
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
                        {!t.active && <span className="chip bg-ink-200 text-ink-500">ปิด</span>}
                      </div>
                      {t.subject && <div className="text-sm font-medium text-ink-700 mt-1">{t.subject}</div>}
                      <div className="text-sm text-ink-600 mt-1 whitespace-pre-line line-clamp-3">{t.body}</div>
                    </div>
                    <div className="text-sm text-ink-400">#{t.sort_order}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    <button onClick={() => showPreview(t.id)} className="btn-ghost !py-1 !px-2 text-xs" title="ดูตัวอย่าง">
                      <Eye size={14} /> {previewId === t.id ? "ซ่อนตัวอย่าง" : "ดูตัวอย่าง"}
                    </button>
                    <button onClick={() => toggleActive(t)} className="btn-ghost !p-2" title={t.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}>
                      {t.active ? <ToggleRight size={24} className="text-ink-900" /> : <ToggleLeft size={24} className="text-ink-400" />}
                    </button>
                    <button onClick={() => setEditing(t.id)} className="btn-ghost !p-2" title="แก้ไข"><Pencil size={18} /></button>
                    <button onClick={() => handleDelete(t.id)} className="btn-ghost !p-2 text-red-500 hover:text-red-600" title="ลบ"><Trash2 size={18} /></button>
                  </div>
                  {previewId === t.id && previewResult && (
                    <div className="border-t border-ink-200 pt-3 mt-1">
                      <div className="text-xs font-semibold text-ink-500 mb-1 flex items-center gap-1"><Send size={12} /> ตัวอย่างข้อความ</div>
                      {previewResult.subject && (
                        <div className="text-sm font-bold text-ink-800 mb-1">{previewResult.subject}</div>
                      )}
                      <div className="bg-white border border-ink-200 rounded-xl p-3 text-sm whitespace-pre-line">
                        {previewResult.body}
                      </div>
                      {previewResult.missing_vars.length > 0 && (
                        <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertTriangle size={12} /> ตัวแปรไม่รู้จัก: {previewResult.missing_vars.map((v) => `{{${v}}}`).join(", ")}
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
    <form onSubmit={submit} className="card p-4 space-y-3 border-ink-300 bg-ink-50">
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
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-5 h-5 accent-ink-900" />
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
                className="text-xs bg-white border border-ink-200 rounded px-1.5 py-0.5 hover:bg-ink-50 text-ink-600"
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

function TableMissingBanner({ info, onRetry }: { info: TableMissingInfo; onRetry: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(info.migration);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="card p-5 border-amber-200 bg-amber-50/60 animate-fade-up">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0">
          <Database size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-ink-900">ยังไม่มีตาราง <code className="bg-white px-1.5 py-0.5 rounded text-sm">{info.table}</code> ในฐานข้อมูล</div>
          <div className="text-sm text-ink-600 mt-1">
            ฐานข้อมูลของคุณสร้างไว้ตั้งแต่ยังไม่มีฟีเจอร์นี้ — ต้องรันไฟล์ migration เพิ่มเติม
          </div>

          <ol className="list-decimal list-inside text-sm text-ink-700 mt-3 space-y-1">
            <li>เปิด Supabase Dashboard → <strong>SQL Editor</strong></li>
            <li>
              เปิดไฟล์ในโปรเจกต์:{" "}
              <code className="bg-white px-2 py-0.5 rounded text-xs border border-ink-200">{info.migration}</code>
            </li>
            <li>คัดลอกเนื้อหาทั้งหมดไปวาง แล้วกด <strong>Run</strong></li>
            <li>กลับมากด <strong>รีโหลด</strong> ที่หน้านี้</li>
          </ol>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={copy} className="btn-secondary text-xs">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "คัดลอกแล้ว!" : "คัดลอก path"}
            </button>
            <button onClick={onRetry} className="btn-primary text-xs">
              <RefreshCw size={14} /> รันเสร็จแล้ว ตรวจใหม่
            </button>
          </div>

          <details className="mt-3 text-xs text-ink-500">
            <summary className="cursor-pointer select-none">ดู error ต้นทาง</summary>
            <pre className="mt-1 bg-white p-2 rounded-lg border border-ink-200 overflow-x-auto text-[11px]">{info.detail}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}
