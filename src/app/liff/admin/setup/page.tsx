"use client";
import { useEffect, useState, useCallback } from "react";
import { useAdminLiff } from "../_ctx";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  XCircle,
  ChevronDown,
  Sparkles,
  ExternalLink,
  ListChecks,
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
  setupValues: {
    appUrl: string;
    liffId: string;
    webhookUrl: string;
    liffUrl: string;
  };
};

export default function LiffAdminSetup() {
  const { authHeaders } = useAdminLiff();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/healthcheck", { headers: authHeaders(), cache: "no-store" });
    if (r.ok) setHealth(await r.json());
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => {
    reload();
  }, [reload]);

  const groups = buildGroups(health);
  const done = groups.filter((g) => g.status === "ok").length;
  const total = groups.length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <div className="space-y-5">
      {/* Progress hero */}
      <div className={`card p-5 ${allDone ? "border-emerald-200 bg-emerald-50" : ""}`}>
        {allDone && (
          <div className="float-right text-emerald-600">
            <Sparkles size={18} />
          </div>
        )}
        <div className="eyebrow">ความพร้อม</div>
        <div className="flex items-end gap-3 mt-1">
          <div className="h-display text-4xl text-ink-900">{pct}%</div>
          <div className="text-sm text-ink-500 pb-1.5">
            {done}/{total} ขั้นตอน
          </div>
        </div>
        <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-ink-900 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-ink-500">
            {allDone ? "ร้านพร้อมใช้งานครบ" : "ลองตั้งค่าที่ยังไม่พร้อมด้านล่าง"}
          </div>
          <button onClick={reload} disabled={loading} className="text-xs font-semibold text-ink-700 inline-flex items-center gap-1.5">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> ตรวจใหม่
          </button>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-2.5">
        {groups.map((g) => (
          <SetupGroupCard
            key={g.id}
            group={g}
            open={openGroup === g.id}
            onToggle={() => setOpenGroup(openGroup === g.id ? null : g.id)}
            setupValues={health?.setupValues}
          />
        ))}
      </div>

      {/* Quick manage links */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <ListChecks size={14} className="text-ink-400" />
          <div className="section-title">ลิงก์จัดการ</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ExternalLinkItem href="/admin/services" label="บริการ" />
          <ExternalLinkItem href="/admin/staff" label="พนักงาน" />
          <ExternalLinkItem href="/admin/working-hours" label="เวลาทำการ" />
          <ExternalLinkItem href="/admin/customers" label="ลูกค้า" />
          <ExternalLinkItem href="/admin/templates" label="เทมเพลตข้อความ" />
          <ExternalLinkItem href="/admin/healthcheck" label="ตรวจละเอียด" />
        </div>
      </div>
    </div>
  );
}

// ── Group setup checks into logical steps for the mobile UI ────────────────
type SetupGroup = {
  id: string;
  title: string;
  subtitle: string;
  items: CheckItem[];
  status: "ok" | "warn" | "fail";
  helpLink?: string;
  showCopyValue?: "webhookUrl" | "liffUrl";
};

function buildGroups(health: HealthData | null): SetupGroup[] {
  const byId = new Map((health?.checks ?? []).map((c) => [c.id, c]));

  const groupDef: Array<Omit<SetupGroup, "status" | "items"> & { ids: string[] }> = [
    {
      id: "database",
      title: "ฐานข้อมูล Supabase",
      subtitle: "ที่เก็บข้อมูลร้านออนไลน์",
      ids: ["sb_url", "sb_anon", "sb_service", "sb_connect"],
      helpLink: "https://supabase.com",
    },
    {
      id: "line",
      title: "LINE Official Account",
      subtitle: "Channel access token + secret",
      ids: ["line_token", "line_secret", "line_api"],
      helpLink: "https://developers.line.biz/console/",
    },
    {
      id: "liff",
      title: "LIFF App",
      subtitle: "ลิงก์เปิดจาก LINE",
      ids: ["liff_id"],
      helpLink: "https://developers.line.biz/console/",
      showCopyValue: "liffUrl",
    },
    {
      id: "webhook",
      title: "Webhook URL",
      subtitle: "ให้ LINE ส่งข้อความลูกค้ามาที่ระบบ",
      ids: [],
      showCopyValue: "webhookUrl",
    },
    {
      id: "admin",
      title: "รหัสแอดมิน",
      subtitle: "ADMIN_PASSWORD + ADMIN_LINE_IDS",
      ids: ["admin_pw"],
    },
    {
      id: "shop",
      title: "ข้อมูลร้าน",
      subtitle: "บริการ ช่าง และเวลาทำการ",
      ids: ["shop_data"],
    },
  ];

  return groupDef.map((g) => {
    const items = g.ids.map((id) => byId.get(id)).filter((x): x is CheckItem => !!x);
    let status: SetupGroup["status"] = items.length === 0 ? "warn" : "ok";
    if (items.some((i) => i.status === "fail")) status = "fail";
    else if (items.some((i) => i.status === "warn")) status = "warn";
    if (g.id === "webhook" && health?.setupValues?.webhookUrl) status = "warn"; // manual confirm
    return { ...g, items, status };
  });
}

// ── UI ─────────────────────────────────────────────────────────────────────
function SetupGroupCard({
  group,
  open,
  onToggle,
  setupValues,
}: {
  group: SetupGroup;
  open: boolean;
  onToggle: () => void;
  setupValues?: HealthData["setupValues"];
}) {
  const Icon = group.status === "ok" ? CheckCircle2 : group.status === "warn" ? AlertTriangle : XCircle;
  const ring =
    group.status === "ok"
      ? "bg-emerald-100 text-emerald-700"
      : group.status === "warn"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-600";

  const copyVal = group.showCopyValue ? setupValues?.[group.showCopyValue] ?? "" : "";

  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 text-left flex items-center gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-md border flex items-center justify-center ${ring}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-ink-900 truncate">{group.title}</div>
          <div className="text-xs text-ink-500 truncate">{group.subtitle}</div>
        </div>
        <ChevronDown
          size={18}
          className={`text-ink-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0 space-y-2 animate-fade-up">
          {group.items.length > 0 ? (
            group.items.map((c) => <CheckRow key={c.id} check={c} />)
          ) : (
            <div className="text-xs text-ink-500 pl-13 -mt-1">
              ไม่มีรายการอัตโนมัติ — ต้องทำเองใน LINE Console
            </div>
          )}

          {copyVal && <CopyBox label="คัดลอกค่านี้" value={copyVal} />}

          {group.helpLink && (
            <a
              href={group.helpLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-700 mt-1"
            >
              <ExternalLink size={12} /> เปิดหน้าจัดการ
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: CheckItem }) {
  const tone =
    check.status === "ok" ? "text-emerald-600" : check.status === "warn" ? "text-amber-500" : "text-red-600";
  const Icon = check.status === "ok" ? CheckCircle2 : check.status === "warn" ? AlertTriangle : XCircle;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={16} className={`${tone} mt-0.5 shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink-800">{check.label}</div>
        <div className="text-xs text-ink-500">{check.detail}</div>
      </div>
    </div>
  );
}

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-ink-900 text-white rounded-xl p-3 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">{label}</div>
        <div className="text-xs font-mono break-all">{value}</div>
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
      >
        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function ExternalLinkItem({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-ink-200 text-sm font-semibold text-ink-800 hover:border-ink-300 transition"
    >
      <span>{label}</span>
      <ExternalLink size={12} className="text-ink-400" />
    </a>
  );
}
