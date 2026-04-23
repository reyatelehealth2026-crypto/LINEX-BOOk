"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "../_ctx";
import {
  Bot,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Info,
  Sparkles,
  MessageSquareText,
  Sliders,
  BookOpen,
  ShieldCheck,
} from "lucide-react";

type AiSettings = {
  enabled: boolean;
  model: string;
  temperature: number;
  max_tokens: number;
  history_limit: number;
  bot_name: string;
  business_desc: string;
  custom_rules: string;
  booking_redirect: string;
};

const MODELS = [
  { value: "glm-4.7", label: "GLM-4.7 — แนะนำ สมดุล quota ปรกติ" },
  { value: "glm-4.5-air", label: "GLM-4.5-Air — เบา quota น้อยที่สุด" },
  { value: "glm-5-turbo", label: "GLM-5-Turbo — เร็ว ฉลาด (quota 2-3×)" },
  { value: "glm-5.1", label: "GLM-5.1 — Flagship ฉลาดที่สุด (quota 2-3×)" },
];

const DEFAULT: AiSettings = {
  enabled: true,
  model: "glm-4.7",
  temperature: 0.7,
  max_tokens: 350,
  history_limit: 6,
  bot_name: "ผู้ช่วยร้าน",
  business_desc: "",
  custom_rules: "",
  booking_redirect: "พิมพ์ว่า จอง ได้เลยค่ะ หรือกดปุ่มจองคิวในเมนูนะคะ",
};

function Section({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-ink-50 transition"
      >
        <div className="w-9 h-9 rounded-xl bg-ink-900 text-white flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
        <span className="font-semibold text-ink-900 flex-1">{title}</span>
        {open ? <ChevronUp size={16} className="text-ink-400" /> : <ChevronDown size={16} className="text-ink-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-ink-100">{children}</div>}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[12px] text-ink-400 mt-1">
      <Info size={11} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

export default function AiSettingsPage() {
  const { pw } = useAdmin();
  const [settings, setSettings] = useState<AiSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    main: true,
    persona: true,
    model: false,
    rules: false,
  });

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-settings", {
        headers: { "x-admin-password": pw },
      });
      if (res.ok) {
        const { settings: s } = await res.json();
        if (s) setSettings({ ...DEFAULT, ...s });
      } else {
        setError("โหลดข้อมูลไม่สำเร็จ");
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้");
    }
    setLoading(false);
  }, [pw]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pw,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const { settings: s } = await res.json();
        if (s) setSettings({ ...DEFAULT, ...s });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const { error: e } = await res.json();
        setError(e ?? "บันทึกไม่สำเร็จ");
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้");
    }
    setSaving(false);
  }

  function set<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw size={20} className="animate-spin text-ink-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-up max-w-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <Sparkles size={12} /> Z.AI GLM
          </div>
          <h1 className="h-display text-2xl sm:text-3xl">ตั้งค่า AI แชท</h1>
          <p className="text-sm text-ink-500 mt-1">
            กำหนดบุคลิก ข้อมูลธุรกิจ และพฤติกรรมการตอบของบอท
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={load} className="btn-secondary" disabled={loading || saving}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> รีเฟรช
          </button>
          <button onClick={save} className="btn-primary" disabled={saving}>
            <Save size={15} className={saving ? "animate-spin" : ""} />
            {saving ? "กำลังบันทึก..." : saved ? "บันทึกแล้ว ✓" : "บันทึก"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {saved && (
        <div className="card p-4 border-emerald-200 bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
          <ShieldCheck size={15} /> บันทึกการตั้งค่าเรียบร้อยแล้ว
        </div>
      )}

      {/* ── Enable / Disable ─────────────────────────── */}
      <div className={`card p-5 flex items-center justify-between gap-4 transition ${settings.enabled ? "border-emerald-200 bg-emerald-50" : "bg-ink-50"}`}>
        <div className="flex items-center gap-3">
          <Bot size={22} className={settings.enabled ? "text-emerald-600" : "text-ink-400"} />
          <div>
            <div className="font-semibold text-ink-900">AI แชทบอท</div>
            <div className="text-sm text-ink-500">
              {settings.enabled ? "เปิดใช้งาน — บอทตอบข้อความทั่วไปด้วย AI" : "ปิดอยู่ — บอทจะแสดงเมนูต้อนรับแทน"}
            </div>
          </div>
        </div>
        <button
          onClick={() => set("enabled", !settings.enabled)}
          className="shrink-0"
          aria-label="toggle AI"
        >
          {settings.enabled
            ? <ToggleRight size={36} className="text-emerald-600" />
            : <ToggleLeft size={36} className="text-ink-300" />}
        </button>
      </div>

      {/* ── Persona ───────────────────────────────────── */}
      <Section title="บุคลิกและข้อมูลธุรกิจ" icon={BookOpen} open={openSections.persona} onToggle={() => toggleSection("persona")}>
        <div>
          <label className="label">ชื่อผู้ช่วย / บทบาทบอท</label>
          <input
            className="input"
            value={settings.bot_name}
            onChange={(e) => set("bot_name", e.target.value)}
            placeholder="ผู้ช่วยร้าน"
          />
          <Hint>ชื่อที่บอทบอกตัวเอง เช่น &quot;ผู้ช่วยร้านตัดผม&quot; หรือ &quot;น้องบุ๊ค&quot;</Hint>
        </div>

        <div>
          <label className="label">ข้อมูลธุรกิจ (บรรยายร้าน)</label>
          <textarea
            className="input resize-none"
            rows={4}
            value={settings.business_desc}
            onChange={(e) => set("business_desc", e.target.value)}
            placeholder={`เช่น: ร้านตัดผมชายสไตล์เกาหลี ให้บริการมา 5 ปี\nเชี่ยวชาญด้านทรงผมผู้ชาย ยินดีให้คำแนะนำทรงผม\nบรรยากาศสบาย มีที่จอดรถ`}
          />
          <Hint>ข้อมูลเพิ่มเติมที่ต้องการให้บอทรู้และแนะนำลูกค้า เช่น จุดเด่นของร้าน ความเชี่ยวชาญ</Hint>
        </div>

        <div>
          <label className="label">ข้อความเมื่อลูกค้าต้องการจองคิว</label>
          <input
            className="input"
            value={settings.booking_redirect}
            onChange={(e) => set("booking_redirect", e.target.value)}
            placeholder="พิมพ์ว่า จอง ได้เลยค่ะ หรือกดปุ่มจองคิวในเมนูนะคะ"
          />
          <Hint>ข้อความที่บอทจะพูดเมื่อลูกค้าถามเรื่องการจอง</Hint>
        </div>
      </Section>

      {/* ── Custom Rules ──────────────────────────────── */}
      <Section title="กฎพฤติกรรมเพิ่มเติม" icon={MessageSquareText} open={openSections.rules} onToggle={() => toggleSection("rules")}>
        <div>
          <label className="label">กฎเพิ่มเติม (Custom Instructions)</label>
          <textarea
            className="input resize-none font-mono text-sm"
            rows={6}
            value={settings.custom_rules}
            onChange={(e) => set("custom_rules", e.target.value)}
            placeholder={`เช่น:\n- ถ้าลูกค้าถามราคา ให้บอกว่าดูได้ที่เมนูบริการ\n- ห้ามพูดถึงคู่แข่ง\n- ถ้าลูกค้าพูดภาษาอังกฤษ ให้ตอบภาษาอังกฤษได้\n- ส่ง emoji ได้บ้างเพื่อให้ดูเป็นมิตร`}
          />
          <Hint>กฎหรือพฤติกรรมพิเศษที่ต้องการให้บอททำ นอกเหนือจากการตั้งค่าพื้นฐาน</Hint>
        </div>
      </Section>

      {/* ── Model Settings ────────────────────────────── */}
      <Section title="ตั้งค่า AI Model" icon={Sliders} open={openSections.model} onToggle={() => toggleSection("model")}>
        <div>
          <label className="label">โมเดล Z.AI GLM</label>
          <select
            className="input"
            value={settings.model}
            onChange={(e) => set("model", e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <Hint>GLM-4.7 แนะนำสำหรับแชทบอท ใช้ quota 1× ตลอด / GLM-5.1 ฉลาดที่สุดแต่ใช้ quota 2-3× ใน peak hours</Hint>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Temperature ({settings.temperature.toFixed(2)})</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.temperature}
              onChange={(e) => set("temperature", parseFloat(e.target.value))}
              className="w-full accent-ink-900"
            />
            <div className="flex justify-between text-[11px] text-ink-400 mt-0.5">
              <span>ตามตรง</span><span>สร้างสรรค์</span>
            </div>
            <Hint>0.3-0.5 = เป็นทางการ, 0.7 = สมดุล, 0.9+ = สร้างสรรค์</Hint>
          </div>

          <div>
            <label className="label">Max Tokens ({settings.max_tokens})</label>
            <input
              type="range"
              min={80}
              max={800}
              step={10}
              value={settings.max_tokens}
              onChange={(e) => set("max_tokens", parseInt(e.target.value))}
              className="w-full accent-ink-900"
            />
            <div className="flex justify-between text-[11px] text-ink-400 mt-0.5">
              <span>สั้น</span><span>ยาว</span>
            </div>
            <Hint>ความยาวสูงสุดของคำตอบ 200-400 เหมาะสำหรับแชท</Hint>
          </div>

          <div>
            <label className="label">จำบทสนทนา ({settings.history_limit} ข้อความ)</label>
            <input
              type="range"
              min={2}
              max={20}
              step={2}
              value={settings.history_limit}
              onChange={(e) => set("history_limit", parseInt(e.target.value))}
              className="w-full accent-ink-900"
            />
            <div className="flex justify-between text-[11px] text-ink-400 mt-0.5">
              <span>2</span><span>20</span>
            </div>
            <Hint>จำนวนข้อความในประวัติที่ส่งให้ AI, แนะนำ 4-6 ข้อความถ้าอยากได้ความไวและลด token</Hint>
          </div>
        </div>
      </Section>

      {/* ── System Prompt Preview ─────────────────────── */}
      <Section title="ตัวอย่าง System Prompt (Preview)" icon={Bot} open={openSections.main} onToggle={() => toggleSection("main")}>
        <div className="bg-ink-950 rounded-xl p-4 text-[12px] font-mono text-ink-200 whitespace-pre-wrap leading-relaxed overflow-auto max-h-80">
          {buildPreviewPrompt(settings)}
        </div>
        <Hint>นี่คือ system prompt ที่ระบบสร้างจากการตั้งค่าข้างต้น ข้อมูลร้าน/บริการ/ช่างจะถูกเพิ่มโดยอัตโนมัติเมื่อบอททำงานจริง</Hint>
      </Section>

      {/* Save footer */}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={load} className="btn-secondary" disabled={loading || saving}>
          <RefreshCw size={15} /> ยกเลิกการเปลี่ยนแปลง
        </button>
        <button onClick={save} className="btn-primary" disabled={saving}>
          <Save size={15} />
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </button>
      </div>
    </div>
  );
}

function buildPreviewPrompt(s: AiSettings): string {
  const businessBlock = s.business_desc ? `\nข้อมูลธุรกิจเพิ่มเติม:\n${s.business_desc}` : "";
  const customRulesBlock = s.custom_rules ? `\nกฎเพิ่มเติมจากเจ้าของร้าน:\n${s.custom_rules}` : "";
  return `คุณคือ${s.bot_name}ของร้าน [ชื่อร้าน] ตอบภาษาไทยเสมอ พูดสุภาพ เป็นธรรมชาติ ช่วยแนะนำได้เหมือนพนักงานหน้าร้านที่คุยเก่ง
เบอร์ร้าน: [เบอร์]
ที่อยู่: [ที่อยู่]${businessBlock}
บริการเด่น: [บริการ 1] [ราคา]/[เวลา] | [บริการ 2] ...
ทีมงาน: [ช่าง 1], [ช่าง 2]

กฎสำคัญ:
- ถ้าลูกค้าถามเชิงเปิดกว้าง เช่น ร้านเด่นอะไร ควรเริ่มบริการไหนดี เหมาะกับใคร หรือขอคำแนะนำ ให้ตอบได้ตามบริบทร้านอย่างเป็นธรรมชาติ
- ถ้าลูกค้าต้องการจองคิวจริง หรือถามเวลาว่างเฉพาะช่วง ให้บอกว่า "${s.booking_redirect}"
- ห้ามยืนยันการจองในแชท ต้องจองผ่านระบบเท่านั้น
- ถ้าไม่แน่ใจข้อมูลเชิงตัวเลขหรือรายละเอียดเฉพาะร้าน ให้บอกตามตรงและแนะนำให้ดูเมนูหรือโทรหาร้าน
- ตอบสั้นกระชับเป็นหลัก แต่ถ้าผู้ใช้ถามเชิงแนะนำให้ตอบได้ 3-5 ประโยค${customRulesBlock}`;
}
