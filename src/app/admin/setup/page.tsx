"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "../_ctx";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  MessageSquare,
  Store,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Sparkles,
} from "lucide-react";

type CheckItem = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
};

type HealthData = {
  allOk: boolean;
  okCount: number;
  total: number;
  checks: CheckItem[];
  timestamp: string;
  setupValues: {
    appUrl: string;
    liffId: string;
    webhookUrl: string;
    liffUrl: string;
  };
};

// ──────────────────────────────────────────────
// Persistent checklist stored in localStorage
// so the shop owner can mark manual items done.
// ──────────────────────────────────────────────
const STORAGE_KEY = "linebook_setup_done";

type ManualItems = {
  webhook: boolean;
  richmenu: boolean;
};

function loadManual(): ManualItems {
  if (typeof window === "undefined") return { webhook: false, richmenu: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { webhook: false, richmenu: false };
}

function saveManual(items: ManualItems) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

// ─── Copy-to-clipboard button ───
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  if (!text) return null;

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-ink-200 bg-ink-50 text-ink-700 hover:bg-ink-100 transition"
      title={`คัดลอก ${label}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "คัดลอกแล้ว!" : label}
    </button>
  );
}

// ─── Expanded step detail component ───
function StepDetail({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 pl-4 border-l-2 border-ink-200 space-y-2 text-sm text-ink-600">
      {children}
    </div>
  );
}

// ─── Main setup page ───
export default function SetupPage() {
  const { pw } = useAdmin();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState<ManualItems>(loadManual);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/healthcheck", {
        headers: { "x-admin-password": pw },
      });
      if (r.ok) {
        setHealth(await r.json());
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleManual(key: keyof ManualItems) {
    const next = { ...manual, [key]: !manual[key] };
    setManual(next);
    saveManual(next);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  const sv = health?.setupValues ?? { appUrl: "", liffId: "", webhookUrl: "", liffUrl: "" };

  // Build full setup checklist (auto + manual items)
  const setupSteps = [
    {
      id: "step_line",
      title: "เชื่อม LINE Official Account",
      subtitle: "ใส่ Channel access token + Channel secret ของ LINE OA ร้านคุณ",
      icon: MessageSquare,
      auto: findCheck(health, "line_token") && findCheck(health, "line_secret"),
      link: "/admin/shop-info",
      detail: (
        <>
          <p><strong>ทำอะไร:</strong> เชื่อมระบบจองคิวเข้ากับ LINE OA ร้านคุณ ลูกค้าจะคุย/จองผ่าน LINE ได้เลย</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>เปิด <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-ink-700 underline">LINE Developers Console</a> → เข้า Provider/Channel ของร้าน (ประเภท <strong>Messaging API</strong>)</li>
            <li>แท็บ <strong>Messaging API</strong> → คัดลอก <strong>Channel access token</strong> (long-lived)</li>
            <li>แท็บ <strong>Basic settings</strong> → คัดลอก <strong>Channel secret</strong></li>
            <li>กลับมาที่หน้านี้ → กด <a href="/admin/shop-info" className="text-ink-700 underline font-semibold">ตั้งค่าร้าน → ข้อมูลร้าน/LINE</a> → วางทั้งสองค่า แล้วกดบันทึก</li>
          </ol>
          <p className="mt-2 text-xs text-ink-400">ยังไม่มี LINE OA? สมัครฟรีที่ <a href="https://entry.line.biz/start/jp/" target="_blank" rel="noopener noreferrer" className="underline">LINE for Business</a></p>
          <a href="/admin/shop-info" className="btn-primary mt-3 inline-flex">ไปหน้าตั้งค่า LINE</a>
        </>
      ),
    },
    {
      id: "step_liff",
      title: "สร้าง LIFF App",
      subtitle: "หน้าจองคิวที่ลูกค้าเปิดได้จากใน LINE",
      icon: Settings,
      auto: findCheck(health, "liff_id"),
      link: "/admin/shop-info",
      detail: (
        <>
          <p><strong>ทำอะไร:</strong> สร้างหน้าเว็บจองคิวที่เปิดในแอป LINE — ใช้ Endpoint URL ของร้านคุณ</p>
          {sv.liffUrl && (
            <div className="mt-2 p-3 bg-ink-50 rounded-lg space-y-2 border border-ink-200">
              <p className="text-xs text-ink-500">Endpoint URL ของร้าน (ใช้ตอนสร้าง LIFF):</p>
              <div className="flex items-center gap-2">
                <code className="bg-white px-2 py-1.5 rounded text-xs break-all flex-1 border border-ink-200">{sv.liffUrl}</code>
                <CopyButton text={sv.liffUrl} label="คัดลอก" />
              </div>
            </div>
          )}
          <ol className="list-decimal list-inside space-y-1 mt-3">
            <li>เปิด <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-ink-700 underline">LINE Developers Console</a> → เข้า Channel เดิม → แท็บ <strong>LIFF</strong></li>
            <li>กด <strong>Add</strong> สร้าง LIFF app ใหม่</li>
            <li>ตั้งชื่อ เช่น &ldquo;จองคิว&rdquo; / Size = <strong>Tall</strong></li>
            <li>วาง <strong>Endpoint URL</strong> ที่คัดลอกไว้ด้านบน</li>
            <li>Scopes: เลือก <code className="bg-ink-100 px-1 rounded">profile</code> + <code className="bg-ink-100 px-1 rounded">openid</code></li>
            <li>กด Add → คัดลอก <strong>LIFF ID</strong></li>
            <li>กลับมา <a href="/admin/shop-info" className="text-ink-700 underline font-semibold">ตั้งค่าร้าน → ข้อมูลร้าน/LINE</a> → วาง LIFF ID แล้วกดบันทึก</li>
          </ol>
          <a href="/admin/shop-info" className="btn-primary mt-3 inline-flex">ไปหน้าตั้งค่า LIFF</a>
        </>
      ),
    },
    {
      id: "step_webhook",
      title: "ตั้งค่า Webhook ใน LINE Console",
      subtitle: "ให้ LINE ส่งข้อความลูกค้ามาที่ระบบร้าน",
      icon: Globe,
      auto: null, // manual
      manualKey: "webhook" as keyof ManualItems,
      detail: (
        <>
          <p><strong>ทำอะไร:</strong> บอก LINE ว่าให้ส่งข้อความจากลูกค้ามาที่ URL ของระบบ</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>LINE Console → Channel → แท็บ <strong>Messaging API</strong></li>
            <li>หาส่วน <strong>Webhook settings</strong></li>
            <li>วาง Webhook URL ด้านล่างนี้</li>
            <li>กด <strong>Verify</strong> ทดสอบ → เปิด <strong>Use webhook</strong> = Enabled</li>
            <li>ปิด <strong>Auto-reply messages</strong> = Disabled (ให้บอทตอบเองได้)</li>
          </ol>
          {sv.webhookUrl ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-ink-500">Webhook URL ของร้าน — คัดลอกไปวางใน LINE Console:</p>
              <div className="flex items-center gap-2">
                <code className="bg-ink-100 px-2 py-1 rounded text-xs break-all flex-1">{sv.webhookUrl}</code>
                <CopyButton text={sv.webhookUrl} label="คัดลอก" />
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-amber-600">ยังไม่เห็น URL — ลองโหลดหน้านี้ใหม่หลังเชื่อม LINE เสร็จ</p>
          )}
          <p className="mt-2 text-xs text-ink-400">ทำเสร็จแล้วกดที่หมายเลขด้านซ้ายเพื่อทำเครื่องหมายว่าเสร็จ</p>
        </>
      ),
    },
    {
      id: "step_shop",
      title: "เพิ่มบริการ + ช่าง + เวลาทำการ",
      subtitle: "เพิ่มรายการบริการ พนักงาน และเวลาเปิด-ปิด",
      icon: Store,
      auto: findCheck(health, "shop_data"),
      detail: (
        <>
          <p><strong>ทำอะไร:</strong> ลูกค้าจะจองได้ก็ต่อเมื่อมีรายการบริการ + ช่าง + เวลาทำการ</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li><a href="/admin/services" className="text-ink-700 underline">บริการ</a> → เพิ่มรายการ เช่น &ldquo;ตัดผมชาย 30 นาที 200 บาท&rdquo;</li>
            <li><a href="/admin/staff" className="text-ink-700 underline">พนักงาน</a> → เพิ่มชื่อช่าง</li>
            <li><a href="/admin/working-hours" className="text-ink-700 underline">เวลาทำการ</a> → ตั้งเวลาเปิด-ปิดร้าน</li>
          </ol>
          <p className="mt-2 text-xs text-ink-400">ลูกค้าจะเห็นเฉพาะบริการและช่างที่เปิดใช้งาน (active)</p>
        </>
      ),
    },
  ];

  const totalSteps = setupSteps.length;
  const doneSteps = setupSteps.filter((s) => {
    if (s.manualKey) return manual[s.manualKey];
    return s.auto?.status === "ok";
  }).length;
  const progressPct = Math.round((doneSteps / totalSteps) * 100);
  const allDone = doneSteps === totalSteps;

  const migrationCheck = findCheck(health, "schema_migrations");
  const needsMigration = migrationCheck && migrationCheck.status !== "ok";

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            Setup Wizard
          </div>
          <h1 className="h-display text-2xl sm:text-3xl">ตั้งค่าร้าน</h1>
          <p className="text-sm text-ink-500 mt-1">
            ทำตามขั้นตอนทีละข้อ — เสร็จแล้วร้านพร้อมใช้งาน
          </p>
        </div>
        <button onClick={reload} className="btn-secondary shrink-0" disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> ตรวจใหม่
        </button>
      </div>

      {/* Progress hero */}
      <div className={`card p-5 ${allDone ? "border-emerald-200 bg-emerald-50" : ""}`}>
        {allDone && (
          <div className="float-right text-emerald-600">
            <Sparkles size={18} />
          </div>
        )}
        <div className="eyebrow">ความพร้อมของร้าน</div>
        <div className="flex items-end gap-3 mt-1">
          <div className="h-display text-4xl sm:text-5xl text-ink-900">{progressPct}%</div>
          <div className="text-sm text-ink-500 pb-2">
            {doneSteps}/{totalSteps} ขั้นตอน
          </div>
        </div>
        <div className="w-full h-2.5 bg-ink-100 rounded-full overflow-hidden mt-3">
          <div
            className="h-full rounded-full transition-all duration-700 bg-ink-900"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {allDone && (
          <div className="mt-4 pt-4 border-t border-emerald-200 text-sm text-emerald-700 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
            <span>ร้านคุณพร้อมแล้ว! ส่ง LIFF URL ให้ตัวเองใน LINE แล้วทดลองจอง</span>
            {sv.liffUrl && <CopyButton text={sv.liffUrl} label="คัดลอก LIFF URL" />}
          </div>
        )}
      </div>

      {/* Missing schema banner */}
      {needsMigration && (
        <div className="card p-4 sm:p-5 border-amber-200 bg-amber-50/60">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-ink-900">ต้องรัน migration เพิ่มตาราง</div>
              <div className="text-sm text-ink-600 mt-1 whitespace-pre-line">{migrationCheck!.detail}</div>
              <div className="mt-3 bg-ink-900 text-white rounded-xl p-3 text-xs font-mono">
                supabase/migrations/001_add_message_templates_and_reviews.sql
              </div>
              <div className="text-[11px] text-ink-500 mt-2">
                เปิด Supabase Dashboard → SQL Editor → คัดลอกเนื้อหาไฟล์นี้ไปวางแล้วกด Run
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Setup Steps */}
      <div className="space-y-3">
        {setupSteps.map((step, idx) => {
          const isDone = step.manualKey
            ? manual[step.manualKey]
            : step.auto?.status === "ok";
          const Icon = step.icon;
          const isOpen = expanded === step.id;
          const showWarning = !isDone && step.auto && step.auto.status !== "ok" && !step.manualKey;

          return (
            <div
              key={step.id}
              className={`card overflow-hidden transition-all ${
                isDone ? "border-emerald-100" : showWarning ? "border-amber-200 bg-amber-50" : "hover:border-ink-300"
              }`}
            >
              {/* Step header */}
              <div className="p-4 flex items-start gap-3 sm:gap-4">
                {/* Step number / check */}
                <button
                  onClick={() => step.manualKey && toggleManual(step.manualKey)}
                  className={`mt-0.5 shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-white text-sm font-bold transition ${
                    isDone
                      ? "bg-ink-900"
                      : "bg-ink-200 text-ink-500"
                  } ${step.manualKey ? "cursor-pointer hover:bg-ink-700" : ""}`}
                  title={step.manualKey ? (isDone ? "กดเพื่อย้อนกลับ" : "กดเพื่อบอกว่าทำแล้ว") : undefined}
                >
                  {isDone ? <CheckCircle2 size={18} /> : <span>{idx + 1}</span>}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon size={14} className="text-ink-400 shrink-0" />
                    <h3 className={`font-semibold text-ink-900 ${isDone ? "line-through text-ink-400" : ""}`}>
                      {step.title}
                    </h3>
                    {isDone && (
                      <span className="chip bg-emerald-100 text-emerald-700">เสร็จแล้ว</span>
                    )}
                    {showWarning && (
                      <span className="chip bg-amber-100 text-amber-700">ยังไม่ได้ตั้งค่า</span>
                    )}
                  </div>
                  <p className="text-sm text-ink-500 mt-0.5">{step.subtitle}</p>

                  {/* Auto-check status badge */}
                  {step.auto && !step.manualKey && (
                    <div className="mt-2">
                      <StatusBadge status={step.auto.status} detail={step.auto.detail} />
                    </div>
                  )}
                </div>

                {/* Right side: expand + external link */}
                <div className="shrink-0 flex items-center gap-2">
                  {!isDone && step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-600 hover:text-ink-900 transition"
                      title="เปิดเว็บภายนอก"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button
                    onClick={() => toggleExpand(step.id)}
                    className="text-ink-400 hover:text-ink-600 transition"
                    title={isOpen ? "ปิดรายละเอียด" : "ดูวิธีทำ"}
                  >
                    <ChevronRight size={18} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-4 pb-4 pt-0 ml-13">
                  <StepDetail>{step.detail}</StepDetail>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick links row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="/admin/healthcheck"
          className="card p-4 flex items-center justify-between hover:border-ink-300 hover:border-ink-300 transition group"
        >
          <div>
            <div className="font-semibold text-ink-900">ตรวจสอบระบบละเอียด</div>
            <div className="text-sm text-ink-500">เช็คการเชื่อมต่อทุกอย่างแบบละเอียด</div>
          </div>
          <ChevronRight size={18} className="text-ink-400 group-hover:text-ink-700 transition" />
        </a>
        <a
          href="/admin/services"
          className="card p-4 flex items-center justify-between hover:border-ink-300 hover:border-ink-300 transition group"
        >
          <div>
            <div className="font-semibold text-ink-900">จัดการบริการ</div>
            <div className="text-sm text-ink-500">เพิ่ม แก้ไข รายการบริการของร้าน</div>
          </div>
          <ChevronRight size={18} className="text-ink-400 group-hover:text-ink-700 transition" />
        </a>
      </div>

      {/* Help text */}
      <div className="card p-4 text-sm text-ink-500 bg-ink-50/60 border-ink-100 space-y-1">
        <p><strong>ต้องการความช่วยเหลือ?</strong> กดปุ่ม <ChevronRight size={12} className="inline" /> ที่แต่ละขั้นตอนเพื่อดูวิธีทำทีละขั้น</p>
        <p>ถ้าทำเสร็จแล้วแต่ระบบยังขึ้นว่ายังไม่เสร็จ ลองกดปุ่ม <strong>ตรวจใหม่</strong> ด้านบน</p>
      </div>
    </div>
  );
}

function findCheck(health: HealthData | null, id: string): CheckItem | null {
  if (!health) return null;
  return health.checks.find((c) => c.id === id) ?? null;
}

function StatusBadge({ status, detail }: { status: "ok" | "warn" | "fail"; detail: string }) {
  const styles = {
    ok: "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100 text-amber-700",
    fail: "bg-red-100 text-red-700",
  };
  const icons = {
    ok: <CheckCircle2 size={12} />,
    warn: <AlertTriangle size={12} />,
    fail: <XCircle size={12} />,
  };
  return (
    <span className={`chip ${styles[status]} gap-1 max-w-full`}>
      {icons[status]} <span className="truncate">{detail}</span>
    </span>
  );
}
