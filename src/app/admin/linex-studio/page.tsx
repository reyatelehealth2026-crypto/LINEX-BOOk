"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Loader2, Play, Sparkles } from "lucide-react";

type StudioResponse = {
  project: { id: number; title: string; platform: string; tone: string; created_at: string };
  output: {
    script_text: string;
    storyboard_json: Array<{ time: string; scene: string; visual: string; textOverlay: string; audio: string }>;
    caption_json: { caption: string; hashtags: string[]; platformNote: string };
    markdown_export: string;
  };
};

type ProjectRow = {
  id: number;
  title: string;
  platform: string;
  tone: string;
  created_at: string;
  linex_studio_video_project_outputs?: StudioResponse["output"][];
};

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

function downloadMarkdown(title: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9ก-๙_-]+/g, "-") || "linex-studio"}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LinexStudioPage() {
  const [adminPw, setAdminPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [result, setResult] = useState<StudioResponse | null>(null);
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
      .then((d) => setProjects(d?.projects ?? []))
      .catch(() => setProjects([]));
  }, [adminPw]);

  const activeOutput = useMemo(() => result?.output ?? projects[0]?.linex_studio_video_project_outputs?.[0] ?? null, [result, projects]);
  const activeTitle = result?.project.title ?? projects[0]?.title ?? "LINEX Studio Output";

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/linex-studio/projects", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-password": adminPw },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "generate failed");
      setResult(data);
      setProjects((prev) => [data.project, ...prev]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Generate failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper-1 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] bg-forest-900 text-paper-1 p-6 md:p-8 shadow-editorial overflow-hidden relative">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-ochre-300/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="eyebrow text-ochre-200">LINEX Studio MVP</div>
              <h1 className="font-display text-3xl md:text-5xl leading-tight">AI Content Team สำหรับคลิปสั้น</h1>
              <p className="mt-3 max-w-2xl text-paper-1/75">
                Sprint 1 foundation: รับ brief → วาง strategy → เขียน script → storyboard → caption → export Markdown
              </p>
            </div>
            <div className="rounded-2xl bg-paper-1/10 px-4 py-3 text-sm text-paper-1/80">
              Reference: Linear clarity + Canva creation flow + Thai SME commercial realism
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="card p-5 space-y-4 h-fit">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-forest-700" />
              <h2 className="font-display text-2xl">New Video Project</h2>
            </div>

            <label className="block text-sm font-medium">ชื่อโปรเจกต์
              <input className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="block text-sm font-medium">ชื่อธุรกิจ
              <input className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="เช่น หัวกรวยบาร์เบอร์" />
            </label>
            <label className="block text-sm font-medium">ประเภทธุรกิจ
              <input className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} />
            </label>
            <label className="block text-sm font-medium">สินค้า/บริการ/โปรโมชัน
              <input className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2" value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} placeholder="ตัดผมชาย 199 / จองคิวผ่าน LINE" />
            </label>
            <label className="block text-sm font-medium">กลุ่มเป้าหมาย
              <input className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2" value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} />
            </label>
            <label className="block text-sm font-medium">Brief เพิ่มเติม
              <textarea className="mt-1 min-h-24 w-full rounded-xl border border-ink-100 bg-white px-3 py-2" value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} placeholder="อยากขายอะไร จุดเด่นคืออะไร ลูกค้าควรรู้สึกยังไง" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Platform
                <select className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                  {platforms.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Tone
                <select className="mt-1 w-full rounded-xl border border-ink-100 bg-white px-3 py-2" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                  {toneOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>

            <button onClick={generate} disabled={loading || !adminPw} className="btn-primary w-full justify-center disabled:opacity-60">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              Generate Content Package
            </button>
          </section>

          <section className="space-y-4">
            {!activeOutput ? (
              <div className="card p-8 text-center text-ink-500">กรอก brief แล้วกด Generate — เดี๋ยวทีม AI ชุดแรกทำ package ให้</div>
            ) : (
              <div className="card p-5 space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="eyebrow">Generated Package</div>
                    <h2 className="font-display text-2xl">{activeTitle}</h2>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(activeOutput.markdown_export)}><Copy size={16} /> Copy</button>
                    <button className="btn-secondary" onClick={() => downloadMarkdown(activeTitle, activeOutput.markdown_export)}><Download size={16} /> Markdown</button>
                  </div>
                </div>

                <div className="rounded-2xl bg-forest-50 p-4">
                  <h3 className="font-semibold text-forest-900">Script</h3>
                  <pre className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink-700">{activeOutput.script_text}</pre>
                </div>

                <div className="overflow-hidden rounded-2xl border border-ink-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-paper-2 text-ink-600"><tr><th className="p-3">Time</th><th className="p-3">Scene</th><th className="p-3">Visual</th><th className="p-3">Text</th></tr></thead>
                    <tbody>
                      {activeOutput.storyboard_json.map((shot, idx) => (
                        <tr key={idx} className="border-t border-ink-100 align-top"><td className="p-3 font-medium">{shot.time}</td><td className="p-3">{shot.scene}</td><td className="p-3">{shot.visual}</td><td className="p-3">{shot.textOverlay}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl bg-ochre-50 p-4">
                  <h3 className="font-semibold text-forest-900">Caption</h3>
                  <p className="mt-2 text-ink-700">{activeOutput.caption_json.caption}</p>
                  <p className="mt-2 text-sm text-forest-700">{activeOutput.caption_json.hashtags?.join(" ")}</p>
                  <p className="mt-2 text-xs text-ink-500">{activeOutput.caption_json.platformNote}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
