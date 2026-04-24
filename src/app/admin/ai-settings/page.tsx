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
  ImageIcon,
  Send,
  FlaskConical,
  KeyRound,
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
  vision_enabled: boolean;
  image_gen_enabled: boolean;
  image_gen_per_hour: number;
  /**
   * Masked value from GET ("****abcd") or a new key the user typed, or ""
   * to clear. Never contains a full plaintext key returned from the server.
   */
  gemini_api_key: string;
  zai_api_key: string;
};

const MODELS = [
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash — ⭐ แนะนำ เร็ว ฉลาด ฟรี" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash — ฉลาด ช้ากว่านิดหน่อย" },
  { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite — เบาที่สุด" },
  { value: "glm-4.7", label: "GLM-4.7 — Z.AI" },
  { value: "glm-4.5-air", label: "GLM-4.5-Air — Z.AI เบา" },
];

const DEFAULT: AiSettings = {
  enabled: true,
  model: "gemini-3-flash-preview",
  temperature: 0.7,
  max_tokens: 350,
  history_limit: 6,
  bot_name: "ผู้ช่วยร้าน",
  business_desc: "",
  custom_rules: "",
  booking_redirect: "พิมพ์ว่า จอง ได้เลยค่ะ หรือกดปุ่มจองคิวในเมนูนะคะ",
  vision_enabled: true,
  image_gen_enabled: true,
  image_gen_per_hour: 3,
  gemini_api_key: "",
  zai_api_key: "",
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
    multimodal: false,
    apiKeys: false,
    test: false,
  });

  // ── Test chat panel state ──────────────────────────
  type TestResult = {
    reply: string;
    systemPrompt: string;
    model: string;
    latencyMs: number;
  };
  const [testMessage, setTestMessage] = useState("");
  const [testUseUnsaved, setTestUseUnsaved] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  async function runTest() {
    const msg = testMessage.trim();
    if (!msg || testLoading) return;
    setTestLoading(true);
    setTestResult(null);
    setTestError(null);
    setShowSystemPrompt(false);
    try {
      const body: { message: string; overrideSettings?: Partial<AiSettings> } = { message: msg };
      if (testUseUnsaved) body.overrideSettings = settings;
      const res = await fetch("/api/admin/ai-settings/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pw,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ reply: data.reply, systemPrompt: data.systemPrompt, model: data.model, latencyMs: data.latencyMs });
      } else {
        setTestError(data.error ?? "เกิดข้อผิดพลาด");
      }
    } catch {
      setTestError("ไม่สามารถเชื่อมต่อได้");
    }
    setTestLoading(false);
  }

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

      {/* ── Vision / Image Generation ─────────────────── */}
      <Section title="ความสามารถเพิ่มเติม (Vision / Image Generation)" icon={ImageIcon} open={openSections.multimodal} onToggle={() => toggleSection("multimodal")}>
        <div className={`flex items-center justify-between gap-4 p-4 rounded-xl transition ${settings.vision_enabled ? "bg-emerald-50 border border-emerald-200" : "bg-ink-50 border border-ink-100"}`}>
          <div>
            <div className="font-semibold text-ink-900 text-sm">วิเคราะห์รูปภาพ (Vision)</div>
            <div className="text-xs text-ink-500 mt-0.5">ลูกค้าส่งรูปมาแล้วบอทวิเคราะห์ด้วย AI</div>
          </div>
          <button
            onClick={() => set("vision_enabled", !settings.vision_enabled)}
            aria-label="toggle vision"
            className="shrink-0"
          >
            {settings.vision_enabled
              ? <ToggleRight size={36} className="text-emerald-600" />
              : <ToggleLeft size={36} className="text-ink-300" />}
          </button>
        </div>

        <div className={`flex items-center justify-between gap-4 p-4 rounded-xl transition ${settings.image_gen_enabled ? "bg-emerald-50 border border-emerald-200" : "bg-ink-50 border border-ink-100"}`}>
          <div>
            <div className="font-semibold text-ink-900 text-sm">สร้างรูปภาพ (Image Generation)</div>
            <div className="text-xs text-ink-500 mt-0.5">บอทสร้างรูปตัวอย่างผลงาน/สไตล์ให้ลูกค้า</div>
          </div>
          <button
            onClick={() => set("image_gen_enabled", !settings.image_gen_enabled)}
            aria-label="toggle image gen"
            className="shrink-0"
          >
            {settings.image_gen_enabled
              ? <ToggleRight size={36} className="text-emerald-600" />
              : <ToggleLeft size={36} className="text-ink-300" />}
          </button>
        </div>

        <div>
          <label className="label">โควตาสร้างรูป (ครั้ง/ชั่วโมง/ผู้ใช้)</label>
          <input
            type="number"
            className="input w-28"
            min={1}
            max={50}
            value={settings.image_gen_per_hour}
            onChange={(e) => {
              const v = Math.min(50, Math.max(1, parseInt(e.target.value, 10) || 1));
              set("image_gen_per_hour", v);
            }}
            disabled={!settings.image_gen_enabled}
          />
          <Hint>จำนวนครั้งสูงสุดที่ผู้ใช้แต่ละคนสร้างรูปได้ต่อชั่วโมง (1–50) ค่าแนะนำ 3</Hint>
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
          <Hint>Gemini 2.0 Flash แนะนำ — เร็ว ฉลาด ฟรี / Gemini 2.5 Flash ฉลาดกว่า / GLM ใช้ Z.AI quota</Hint>
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

      {/* ── API Keys (per-shop overrides) ─────────────── */}
      <Section
        title="API Keys (ไม่บังคับ — เว้นว่างไว้เพื่อใช้ของระบบ)"
        icon={KeyRound}
        open={openSections.apiKeys}
        onToggle={() => toggleSection("apiKeys")}
      >
        <p className="text-sm text-ink-600 bg-ink-50 border border-ink-100 rounded-xl px-4 py-3">
          โดยค่าเริ่มต้นร้านทุกร้านใช้ API key ส่วนกลางของแพลตฟอร์ม
          หากต้องการ quota ของตัวเองให้ใส่ key ของร้านที่นี่
        </p>

        <div>
          <label className="label">Gemini API Key</label>
          <input
            type="password"
            className="input font-mono"
            value={settings.gemini_api_key}
            onChange={(e) => set("gemini_api_key", e.target.value)}
            placeholder={settings.gemini_api_key ? "เว้นว่างเพื่อคงค่าเดิม" : "ใส่ key เพื่อใช้ quota ของร้าน"}
            autoComplete="new-password"
          />
          {settings.gemini_api_key?.startsWith("****") && (
            <p className="text-[12px] text-emerald-700 mt-1 flex items-center gap-1">
              <ShieldCheck size={11} /> มี key ตั้งไว้แล้ว ({settings.gemini_api_key}) — พิมพ์ทับเพื่อเปลี่ยน หรือเว้นว่างเพื่อคงค่าเดิม
            </p>
          )}
          <Hint>รับ key ได้จาก Google AI Studio (aistudio.google.com) ใส่เว้นว่างเพื่อลบ key และกลับมาใช้ของระบบ</Hint>
        </div>

        <div>
          <label className="label">Z.AI API Key</label>
          <input
            type="password"
            className="input font-mono"
            value={settings.zai_api_key}
            onChange={(e) => set("zai_api_key", e.target.value)}
            placeholder={settings.zai_api_key ? "เว้นว่างเพื่อคงค่าเดิม" : "ใส่ key เพื่อใช้ quota ของร้าน"}
            autoComplete="new-password"
          />
          {settings.zai_api_key?.startsWith("****") && (
            <p className="text-[12px] text-emerald-700 mt-1 flex items-center gap-1">
              <ShieldCheck size={11} /> มี key ตั้งไว้แล้ว ({settings.zai_api_key}) — พิมพ์ทับเพื่อเปลี่ยน หรือเว้นว่างเพื่อคงค่าเดิม
            </p>
          )}
          <Hint>รับ key ได้จาก Z.AI / BigModel console ใส่เว้นว่างเพื่อลบ key และกลับมาใช้ของระบบ</Hint>
        </div>
      </Section>

      {/* ── System Prompt Preview ─────────────────────── */}
      <Section title="ตัวอย่าง System Prompt (Preview)" icon={Bot} open={openSections.main} onToggle={() => toggleSection("main")}>
        <div className="bg-ink-950 rounded-xl p-4 text-[12px] font-mono text-ink-200 whitespace-pre-wrap leading-relaxed overflow-auto max-h-80">
          {buildPreviewPrompt(settings)}
        </div>
        <Hint>นี่คือ system prompt ที่ระบบสร้างจากการตั้งค่าข้างต้น ข้อมูลร้าน/บริการ/ช่างจะถูกเพิ่มโดยอัตโนมัติเมื่อบอททำงานจริง</Hint>
      </Section>

      {/* ── ทดสอบคุย ──────────────────────────────────── */}
      <Section title="ทดสอบคุย (ไม่บันทึกประวัติ)" icon={FlaskConical} open={openSections.test} onToggle={() => toggleSection("test")}>
        {/* Checkbox: use unsaved form state */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-ink-700">
          <input
            type="checkbox"
            className="accent-ink-900 w-4 h-4"
            checked={testUseUnsaved}
            onChange={(e) => setTestUseUnsaved(e.target.checked)}
          />
          ใช้ค่าที่ยังไม่บันทึก (ทดสอบการตั้งค่าปัจจุบันในฟอร์ม)
        </label>
        <Hint>เมื่อติ๊กจะใช้ค่าจากฟอร์มด้านบน แม้ยังไม่กดบันทึก — เหมาะสำหรับทดลองก่อนบันทึกจริง</Hint>

        {/* Message input */}
        <div>
          <label className="label">พิมพ์ข้อความทดสอบ</label>
          <div className="flex gap-2 items-start">
            <textarea
              className="input resize-none flex-1"
              rows={3}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="เช่น: ราคาตัดผมชายเท่าไหร่คะ? หรือ ร้านเปิดวันไหนบ้างคะ"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  runTest();
                }
              }}
            />
            <button
              onClick={runTest}
              disabled={testLoading || !testMessage.trim()}
              className="btn-primary shrink-0 self-stretch"
              aria-label="ส่งทดสอบ"
            >
              {testLoading
                ? <RefreshCw size={15} className="animate-spin" />
                : <Send size={15} />}
              <span className="hidden sm:inline">
                {testLoading ? "กำลังถาม..." : "ส่งทดสอบ"}
              </span>
            </button>
          </div>
          <p className="text-[11px] text-ink-400 mt-1">Ctrl+Enter เพื่อส่ง</p>
        </div>

        {/* Error */}
        {testError && (
          <div className="rounded-xl p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            {testError}
          </div>
        )}

        {/* Reply bubble */}
        {testResult && (
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-ink-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} />
              </div>
              <div className="flex-1">
                <div className="bg-ink-50 border border-ink-100 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-ink-900 whitespace-pre-wrap leading-relaxed">
                  {testResult.reply}
                </div>
                <p className="text-[11px] text-ink-400 mt-1.5 ml-1">
                  {testResult.model} &middot; {testResult.latencyMs.toLocaleString()} ms
                </p>
              </div>
            </div>

            {/* Expandable system prompt */}
            <button
              onClick={() => setShowSystemPrompt((v) => !v)}
              className="text-[12px] text-ink-400 hover:text-ink-600 underline-offset-2 hover:underline transition ml-11"
            >
              {showSystemPrompt ? "ซ่อน System Prompt" : "ดู System Prompt ที่ใช้จริง"}
            </button>
            {showSystemPrompt && (
              <div className="bg-ink-950 rounded-xl p-4 text-[11px] font-mono text-ink-200 whitespace-pre-wrap leading-relaxed overflow-auto max-h-72 ml-11">
                {testResult.systemPrompt}
              </div>
            )}
          </div>
        )}
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
  return `คุณคือ${s.bot_name}ของร้าน [ชื่อร้าน]

เบอร์ร้าน: [เบอร์]
ที่อยู่: [ที่อยู่]${businessBlock}
บริการ: [บริการเด่น]
ทีมงาน: [ชื่อช่าง]

คุณคือช่างตัดผมขาโหด คุยเก่ง ตอบได้ทุกเรื่อง กวนตีนนิดหน่อยแต่รักลูกค้าทุกคน
- ตอบภาษาอีสานผสมไทยกลาง
- คุยแบบกวนตีน ขำๆ เหมือนเพื่อนสนิท
- ตัวอย่าง: "เฮดหยังอยู่", "บ่เป็นหยัง", "ดีใจจังเด้อ"

กฎ:
- ห้ามยืนยันการจองในแชท — ถ้าลูกค้าอยากจองจริงๆ ให้บอก "${s.booking_redirect}"
- ถ้าข้อมูลร้านบางอย่างไม่แน่ใจ ให้ตอบตามที่รู้${customRulesBlock}`;
}
