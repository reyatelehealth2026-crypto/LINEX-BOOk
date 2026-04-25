"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Copy,
  Download,
  History,
  Image,
  Lightbulb,
  ListChecks,
  Loader2,
  MessageCircle,
  Palette,
  Play,
  Sparkles,
  Type,
  Wand2,
  XCircle,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

type StoryboardShot = {
  time: string;
  scene: string;
  visual: string;
  textOverlay: string;
  audio: string;
};

type CaptionOutput = {
  caption: string;
  hashtags: string[];
  platformNote: string;
};

type VisualDirection = {
  mood: string;
  palette: string[];
  cameraStyle: string;
  lighting: string;
  dos: string[];
  donts: string[];
};

type StrategyOutput = {
  angle: string;
  mainMessage: string;
  emotionalTrigger: string;
  cta: string;
  conversionPath: string;
};

type ProjectOutput = {
  id?: number;
  script_text: string;
  storyboard_json: StoryboardShot[];
  visual_direction_json: VisualDirection;
  asset_prompts_json: string[];
  caption_json: CaptionOutput;
  editor_notes_text: string;
  markdown_export: string;
  strategy_json: StrategyOutput;
  created_at?: string;
};

type VariationRow = {
  id?: number;
  project_id?: number;
  agent_name: string;
  section: string;
  variation_index: number;
  output_json: { name: string; script: string; scoreBreakdown?: Record<string, number> };
  score_total?: number;
  score_breakdown_json?: Record<string, number>;
  selected?: boolean;
  selected_by?: string;
  created_at?: string;
};

type ProjectRow = {
  id: number;
  title: string;
  platform: string;
  tone: string;
  created_at: string;
  linex_studio_video_project_outputs?: ProjectOutput[];
  linex_studio_output_variations?: VariationRow[];
};

/* ── Constants ─────────────────────────────────────────────────────── */

const toneOptions = [
  ["friendly", "เป็นกันเอง"],
  ["professional", "มืออาชีพ"],
  ["funny", "กวน จำง่าย"],
  ["local_thai", "ไทยบ้านจริงใจ"],
  ["aggressive_sales", "ขายแรง"],
  ["soft_sales", "ขายนุ่ม"],
  ["expert", "ผู้เชี่ยวชาญ"],
];

const platforms = [
  ["tiktok", "TikTok"],
  ["reels", "Reels"],
  ["shorts", "YouTube Shorts"],
  ["voom", "LINE VOOM"],
  ["facebook", "Facebook"],
];

/* ── Helpers ─────────────────────────────────────────────────────── */

function downloadMarkdown(title: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9ก-๙_-]+/g, "-") || "linex-studio"}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function useClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return { copy, copied };
}

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function LinexStudioPage() {
  const [adminPw, setAdminPw] = useState("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [activeOutputIndex, setActiveOutputIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "คลิปโปรโมทร้านผ่าน LINE",
    businessName: "",
    businessType: "ร้านบริการ",
    offer: "",
    targetAudience: "ลูกค้าในพื้นที่",
    goal: "เพิ่มยอดทัก LINE และยอดจอง",
    platform: "tiktok",
    durationSeconds: 30,
    tone: "friendly",
    brief: "",
  });

  useEffect(() => {
    setAdminPw(sessionStorage.getItem("adminPw") ?? "");
  }, []);

  useEffect(() => {
    if (!adminPw) return;
    fetch("/api/admin/linex-studio/projects", { headers: { "x-admin-password": adminPw } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list: ProjectRow[] = d?.projects ?? [];
        setProjects(list);
        setActiveProjectIndex(0);
        setActiveOutputIndex(0);
      })
      .catch(() => setProjects([]));
  }, [adminPw]);

  const activeProject = projects[activeProjectIndex] ?? null;
  const activeOutputs = activeProject?.linex_studio_video_project_outputs ?? [];
  const activeOutput = activeOutputs[activeOutputIndex] ?? activeOutputs[0] ?? null;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/linex-studio/projects", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-password": adminPw },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "สร้างไม่สำเร็จ");

      const newProject: ProjectRow = {
        ...data.project,
        linex_studio_video_project_outputs: [data.output as ProjectOutput],
        linex_studio_output_variations: data.variations as VariationRow[],
      };
      setProjects((prev) => [newProject, ...prev]);
      setActiveProjectIndex(0);
      setActiveOutputIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="rounded-[28px] bg-forest-900 text-paper-1 p-6 md:p-8 shadow-editorial overflow-hidden relative">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-ochre-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="eyebrow text-ochre-200">LINEX Studio</div>
            <h1 className="font-display text-3xl md:text-5xl leading-tight">AI Content Team สำหรับคลิปสั้น</h1>
            <p className="mt-3 max-w-2xl text-paper-1/75">
              รับ brief → วางกลยุทธ์ → เขียนบท → storyboard → caption → เช็กลิสต์ตัดต่อ
            </p>
          </div>
          <div className="rounded-2xl bg-paper-1/10 px-4 py-3 text-sm text-paper-1/80">
            Sprint 1/2: Script + Storyboard + Caption + Checklist
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* ── Form ─────────────────────────────────────────── */}
        <section className="card p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <Wand2 size={20} className="text-forest-700" />
            <h2 className="font-display text-2xl">โปรเจกต์ใหม่</h2>
          </div>

          <label className="block text-sm font-medium">
            ชื่อโปรเจกต์
            <input
              className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/15"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>

          <label className="block text-sm font-medium">
            ชื่อธุรกิจ
            <input
              className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/15"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="เช่น หัวกรวยบาร์เบอร์"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              ประเภท
              <input
                className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/15"
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
              />
            </label>
            <label className="block text-sm font-medium">
              ความยาว (วิ)
              <input
                type="number"
                min={15}
                max={60}
                className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/15"
                value={form.durationSeconds}
                onChange={(e) => setForm({ ...form, durationSeconds: Number(e.target.value) })}
              />
            </label>
          </div>

          <label className="block text-sm font-medium">
            สินค้า/บริการ/โปร
            <input
              className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/15"
              value={form.offer}
              onChange={(e) => setForm({ ...form, offer: e.target.value })}
              placeholder="ตัดผมชาย 199 / จองคิวผ่าน LINE"
            />
          </label>

          <label className="block text-sm font-medium">
            กลุ่มเป้าหมาย
            <input
              className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/15"
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
            />
          </label>

          <label className="block text-sm font-medium">
            เป้าหมาย
            <input
              className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/15"
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            />
          </label>

          <label className="block text-sm font-medium">
            Brief เพิ่มเติม
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/15"
              value={form.brief}
              onChange={(e) => setForm({ ...form, brief: e.target.value })}
              placeholder="อยากขายอะไร จุดเด่นคืออะไร ลูกค้าควรรู้สึกยังไง"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Platform
              <select
                className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/15"
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
              >
                {platforms.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Tone
              <select
                className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/15"
                value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value })}
              >
                {toneOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            onClick={generate}
            disabled={loading || !adminPw}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
            {loading ? "กำลังสร้าง…" : "สร้างชุดคอนเทนต์"}
          </button>
        </section>

        {/* ── Output ─────────────────────────────────────────── */}
        <section className="space-y-4 min-w-0">
          {error && (
            <div className="card p-4 border-l-4 border-l-rose-500 bg-rose-50 flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-rose-800">เกิดข้อผิดพลาด</p>
                <p className="text-sm text-rose-700">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
                <XCircle size={16} />
              </button>
            </div>
          )}

          {/* Project history chips */}
          {projects.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <History size={14} className="shrink-0 text-ink-400" />
              {projects.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProjectIndex(idx);
                    setActiveOutputIndex(0);
                  }}
                  className={`chip whitespace-nowrap transition ${
                    idx === activeProjectIndex
                      ? "bg-forest-800 text-paper-1 border-forest-700"
                      : "bg-paper-0 text-ink-700 border-paper-3 hover:bg-paper-2"
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}

          {!activeOutput ? (
            <EmptyState />
          ) : (
            <OutputPanel
              project={activeProject}
              output={activeOutput}
              outputIndex={activeOutputIndex}
              totalOutputs={activeOutputs.length}
              onSelectOutput={setActiveOutputIndex}
            />
          )}
        </section>
      </div>
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="card p-8 md:p-12 text-center space-y-4">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-forest-50 text-forest-700 grid place-items-center">
        <Clapperboard size={28} />
      </div>
      <div>
        <h3 className="font-display text-xl text-ink-900">ยังไม่มีผลงาน</h3>
        <p className="mt-1 text-sm text-ink-500 max-w-md mx-auto">
          กรอก brief ทางซ้าย แล้วกดสร้าง — AI จะเตรียม script, storyboard, caption และเช็กลิสต์ให้ทันที
        </p>
      </div>
    </div>
  );
}

/* ── Output Panel ────────────────────────────────────────────────── */

function OutputPanel({
  project,
  output,
  outputIndex,
  totalOutputs,
  onSelectOutput,
}: {
  project: ProjectRow | null;
  output: ProjectOutput;
  outputIndex: number;
  totalOutputs: number;
  onSelectOutput: (idx: number) => void;
}) {
  const { copy, copied } = useClipboard();
  const [showStrategy, setShowStrategy] = useState(true);
  const [showVisual, setShowVisual] = useState(true);

  const strategy = output.strategy_json;
  const storyboard = output.storyboard_json ?? [];
  const visual = output.visual_direction_json;
  const prompts = output.asset_prompts_json ?? [];
  const caption = output.caption_json;
  const checklist = useMemo(() => (output.editor_notes_text ?? "").split("\n").filter((l) => l.trim()), [output.editor_notes_text]);

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Header */}
      <div className="card p-5 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="eyebrow">ผลงานล่าสุด</div>
            <h2 className="font-display text-2xl truncate">{project?.title ?? "LINEX Studio"}</h2>
            <p className="text-xs text-ink-500 mt-1">{formatDate(project?.created_at)}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="btn-secondary" onClick={() => copy(output.markdown_export)}>
              <Copy size={16} />
              {copied ? "คัดลอกแล้ว" : "คัดลอก Markdown"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => downloadMarkdown(project?.title ?? "linex-studio", output.markdown_export)}
            >
              <Download size={16} />
              ดาวน์โหลด
            </button>
          </div>
        </div>

        {/* Variation tabs */}
        {totalOutputs > 1 && (
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: totalOutputs }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => onSelectOutput(idx)}
                className={`pill transition ${
                  idx === outputIndex
                    ? "bg-forest-800 text-paper-1"
                    : "bg-paper-2 text-ink-700 hover:bg-paper-3"
                }`}
              >
                เวอร์ชัน {idx + 1}
                {idx === 0 && <Sparkles size={12} className="ml-1 opacity-80" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Strategy */}
      <div className="card p-5 space-y-3">
        <button
          onClick={() => setShowStrategy((s) => !s)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-ochre-500" />
            <h3 className="font-display text-lg">กลยุทธ์</h3>
          </div>
          {showStrategy ? <ChevronUp size={16} className="text-ink-400" /> : <ChevronDown size={16} className="text-ink-400" />}
        </button>
        {showStrategy && strategy && (
          <div className="grid gap-3 md:grid-cols-2">
            <StrategyCard label="มุมมอง" value={strategy.angle} />
            <StrategyCard label="ข้อความหลัก" value={strategy.mainMessage} />
            <StrategyCard label="ตัวกระตุ้นอารมณ์" value={strategy.emotionalTrigger} />
            <StrategyCard label="CTA" value={strategy.cta} />
            <StrategyCard label="เส้นทางการขาย" value={strategy.conversionPath} className="md:col-span-2" />
          </div>
        )}
      </div>

      {/* Script */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type size={18} className="text-forest-700" />
            <h3 className="font-display text-lg">บท (Script)</h3>
          </div>
          <button className="btn-ghost text-xs" onClick={() => copy(output.script_text)}>
            <Copy size={14} />
            คัดลอก
          </button>
        </div>
        <div className="rounded-xl bg-forest-50 p-4">
          <pre className="whitespace-pre-wrap font-body text-sm leading-7 text-ink-700">{output.script_text}</pre>
        </div>
        <ScriptVariationsSection project={project} />
      </div>

      {/* Storyboard */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Clapperboard size={18} className="text-forest-700" />
          <h3 className="font-display text-lg">Storyboard</h3>
        </div>
        <div className="space-y-3">
          {storyboard.map((shot, idx) => (
            <div
              key={idx}
              className="flex gap-4 rounded-xl border border-paper-3 bg-paper-0 p-4 transition hover:shadow-lift"
            >
              <div className="shrink-0 w-14 h-14 rounded-xl bg-forest-800 text-paper-1 grid place-items-center font-display font-semibold text-xs leading-tight text-center">
                {shot.time}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="font-semibold text-ink-900">{shot.scene}</div>
                <div className="text-sm text-ink-600">{shot.visual}</div>
                {shot.textOverlay && (
                  <div className="text-sm text-forest-700 font-medium">“{shot.textOverlay}”</div>
                )}
                {shot.audio && <div className="text-xs text-ink-400">{shot.audio}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Direction */}
      <div className="card p-5 space-y-3">
        <button
          onClick={() => setShowVisual((s) => !s)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-forest-700" />
            <h3 className="font-display text-lg">ทิศทางภาพ (Visual Direction)</h3>
          </div>
          {showVisual ? <ChevronUp size={16} className="text-ink-400" /> : <ChevronDown size={16} className="text-ink-400" />}
        </button>
        {showVisual && visual && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">อารมณ์ (Mood)</div>
                <p className="text-sm text-ink-700">{visual.mood}</p>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">โทนสี (Palette)</div>
                <div className="flex gap-2 flex-wrap">
                  {visual.palette.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-paper-3 bg-paper-0 px-2 py-1"
                    >
                      <div
                        className="w-5 h-5 rounded-full border border-paper-3"
                        style={{ backgroundColor: c }}
                      />
                      <span className="text-xs font-mono text-ink-600">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">กล้อง (Camera)</div>
                <p className="text-sm text-ink-700">{visual.cameraStyle}</p>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">แสง (Lighting)</div>
                <p className="text-sm text-ink-700">{visual.lighting}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">ทำ (Do)</div>
                {(visual.dos ?? []).map((d, i) => (
                  <div key={i} className="flex gap-2 text-sm text-ink-700">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                    {d}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-700">ห้าม (Don't)</div>
                {(visual.donts ?? []).map((d, i) => (
                  <div key={i} className="flex gap-2 text-sm text-ink-700">
                    <XCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Prompts */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Image size={18} className="text-forest-700" />
          <h3 className="font-display text-lg">Prompt สร้างภาพ</h3>
        </div>
        <div className="space-y-2">
          {prompts.map((p, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-xl border border-paper-3 bg-paper-0 p-3"
            >
              <span className="mt-0.5 text-xs font-mono text-ink-400 w-5">{idx + 1}</span>
              <p className="text-sm text-ink-700 flex-1">{p}</p>
              <button className="btn-ghost text-xs shrink-0" onClick={() => copy(p)}>
                <Copy size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Caption */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-forest-700" />
            <h3 className="font-display text-lg">แคปชัน (Caption)</h3>
          </div>
          <button className="btn-ghost text-xs" onClick={() => copy(caption?.caption ?? "")}>
            <Copy size={14} />
            คัดลอก
          </button>
        </div>
        <div className="rounded-xl bg-ochre-50 p-4 space-y-3">
          <p className="text-ink-700 leading-relaxed">{caption?.caption}</p>
          <div className="flex flex-wrap gap-2">
            {caption?.hashtags?.map((h, i) => (
              <span key={i} className="pill-forest">
                {h}
              </span>
            ))}
          </div>
          <p className="text-xs text-ink-500">{caption?.platformNote}</p>
        </div>
      </div>

      {/* Editor Checklist */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ListChecks size={18} className="text-forest-700" />
          <h3 className="font-display text-lg">เช็กลิสต์ตัดต่อ</h3>
        </div>
        <div className="space-y-2">
          {checklist.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-xl bg-paper-1 border border-paper-3 p-3"
            >
              <ListChecks size={18} className="shrink-0 text-forest-600 mt-0.5" />
              <span className="text-sm text-ink-700">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Script Variations Section ─────────────────────────────────────── */

function ScriptVariationsSection({ project }: { project: ProjectRow | null }) {
  const [expanded, setExpanded] = useState(false);
  const variations = project?.linex_studio_output_variations ?? [];
  const scriptVars = variations.filter((v) => v.section === "script");
  if (scriptVars.length === 0) return null;

  const winner = scriptVars.find((v) => v.selected) ?? scriptVars[0];

  return (
    <div className="mt-4 space-y-3">
      <button
        onClick={() => setExpanded((s) => !s)}
        className="w-full flex items-center justify-between text-sm"
      >
        <div className="flex items-center gap-2 text-forest-800">
          <Sparkles size={16} />
          <span className="font-medium">สคริปต์ {scriptVars.length} แบบ (Auto-score)</span>
          {winner && (
            <span className="pill bg-ochre-100 text-ochre-800 text-xs">Winner: {winner.output_json.name}</span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} className="text-ink-400" /> : <ChevronDown size={16} className="text-ink-400" />}
      </button>
      {expanded && (
        <div className="space-y-3">
          {scriptVars.map((v) => {
            const isWinner = v.selected;
            const breakdown = v.score_breakdown_json ?? {};
            return (
              <div
                key={v.id ?? v.variation_index}
                className={`rounded-xl border p-4 ${isWinner ? "border-ochre-400 bg-ochre-50/60" : "border-paper-3 bg-paper-0"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-ink-900">{v.output_json.name}</span>
                    {isWinner && <CheckCircle2 size={16} className="text-ochre-600" />}
                  </div>
                  <span className="text-sm font-mono font-semibold text-forest-700">{v.score_total} pts</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-xs mb-3">
                  {Object.entries(breakdown).map(([key, val]) => (
                    <div key={key} className="text-center">
                      <div className="font-semibold text-forest-700">{val}</div>
                      <div className="text-ink-500 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                    </div>
                  ))}
                </div>
                <pre className="whitespace-pre-wrap text-xs leading-6 text-ink-700 bg-white/60 rounded-lg p-3 border border-paper-3">
                  {v.output_json.script}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Small helpers ───────────────────────────────────────────────── */

function StrategyCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-paper-1 border border-paper-3 p-3 ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</div>
      <p className="mt-1 text-sm text-ink-800 leading-relaxed">{value}</p>
    </div>
  );
}
