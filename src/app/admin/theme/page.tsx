"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "../_ctx";
import { useTheme } from "@/lib/theme-context";
import {
  contrastRatio,
  DEFAULT_THEME_ID,
  THEME_PRESETS,
  wcagLevel,
  type ThemeId,
  type ThemePreset,
} from "@/lib/themes";
import {
  Check,
  Loader2,
  Palette,
  AlertTriangle,
  Sparkles,
  RefreshCw,
} from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function AdminThemePage() {
  const { pw } = useAdmin();
  const { activeId, setTheme } = useTheme();

  const [dbThemeId, setDbThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [previewId, setPreviewId] = useState<ThemeId>(activeId);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [migrated, setMigrated] = useState<boolean>(true);

  // Load current DB theme on mount.
  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/theme", {
        headers: { "x-admin-password": pw },
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      const id = body.themeId as ThemeId;
      setDbThemeId(id);
      setPreviewId(id);
      setTheme(id);
      setMigrated(body.migrated !== false);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [pw, setTheme]);

  useEffect(() => {
    load();
  }, [load]);

  // Preview = live CSS-var swap (no DB write yet).
  const handlePreview = useCallback(
    (id: ThemeId) => {
      setPreviewId(id);
      setTheme(id);
    },
    [setTheme]
  );

  const handleSave = useCallback(async () => {
    setSaveState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ themeId: previewId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setDbThemeId(previewId);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e: unknown) {
      setSaveState("error");
      setErrorMsg(e instanceof Error ? e.message : "save failed");
    }
  }, [previewId, pw]);

  const hasUnsaved = previewId !== dbThemeId;

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="linex-panel p-5 relative overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" />
        <div className="relative flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="eyebrow flex items-center gap-2">
              <Palette size={14} />
              SHOP THEME
            </div>
            <h1 className="h-display text-2xl mt-1">ธีมของร้าน</h1>
            <p className="text-sm text-ink-600 mt-1 max-w-xl">
              เลือกธีมให้ตรงกับประเภทธุรกิจ — ระบบจะเปลี่ยนสีหน้า admin, LIFF และ Flex
              message ใน LINE อัตโนมัติ
            </p>
          </div>
          <button
            onClick={load}
            className="btn-secondary gap-1.5"
            disabled={loading}
            title="โหลดใหม่"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            โหลดใหม่
          </button>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────── */}
      {!migrated && (
        <div className="card border border-accent-rose/30 bg-accent-rose/5 p-4 flex items-start gap-3">
          <AlertTriangle className="text-accent-rose shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-ink-700">
            <div className="font-semibold text-accent-rose">ต้องรัน migration ก่อน</div>
            <p className="mt-1">
              รัน{" "}
              <code className="bg-ink-100 px-1.5 py-0.5 rounded text-xs">
                supabase/migrations/010_shop_theme.sql
              </code>{" "}
              เพื่อเปิดใช้การเก็บธีมของร้าน
            </p>
          </div>
        </div>
      )}

      {errorMsg && saveState !== "saving" && (
        <div className="card border border-accent-rose/30 bg-accent-rose/5 p-4 flex items-start gap-3">
          <AlertTriangle className="text-accent-rose shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-ink-700">
            <div className="font-semibold text-accent-rose">เกิดข้อผิดพลาด</div>
            <p className="mt-1 font-mono text-xs">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ── Save bar ───────────────────────────────────── */}
      <div
        className={`sticky top-14 z-20 card p-3 flex items-center justify-between gap-3 transition ${
          hasUnsaved ? "border-linex-400 shadow-linex-glow" : "border-ink-100"
        }`}
      >
        <div className="text-sm">
          <div className="text-ink-500 text-xs">ธีมปัจจุบันในฐานข้อมูล</div>
          <div className="flex items-center gap-2 font-semibold text-ink-900">
            <ThemeSwatch theme={THEME_PRESETS.find((t) => t.id === dbThemeId)!} size={20} />
            {THEME_PRESETS.find((t) => t.id === dbThemeId)?.name.th}
            <span className="text-ink-400 font-mono text-xs">({dbThemeId})</span>
          </div>
        </div>
        {hasUnsaved ? (
          <button
            onClick={handleSave}
            disabled={saveState === "saving" || !migrated}
            className="glow-btn gap-1.5 disabled:opacity-50"
          >
            {saveState === "saving" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            บันทึก → <code className="font-mono text-xs">{previewId}</code>
          </button>
        ) : saveState === "saved" ? (
          <div className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
            <Check size={14} /> บันทึกแล้ว
          </div>
        ) : (
          <div className="text-xs text-ink-400">เลือกธีมใหม่เพื่อเปลี่ยน</div>
        )}
      </div>

      {/* ── Theme grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {THEME_PRESETS.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            active={previewId === theme.id}
            isDbSaved={dbThemeId === theme.id}
            onSelect={() => handlePreview(theme.id)}
          />
        ))}
      </div>

      {/* ── Legend ────────────────────────────────────── */}
      <div className="card p-4 text-xs text-ink-500 space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-ink-700">
          <Sparkles size={14} /> เคล็ดลับ
        </div>
        <ul className="list-disc list-inside space-y-1 text-ink-600">
          <li>กดที่ธีมเพื่อ <b>พรีวิว</b> (ไม่บันทึก) — ระบบเปลี่ยนสีหน้า UI ทันที</li>
          <li>กด <b>บันทึก</b> เพื่อให้ร้านใช้ธีมนั้นเป็นค่าตั้งต้น (LIFF + Flex + Admin)</li>
          <li>ลูกค้าเปลี่ยนธีมได้ใน LIFF แค่เพื่อพรีวิว ไม่กระทบร้าน</li>
          <li>ค่า WCAG AA ✅ = อ่านง่ายทุกที่ / AA-large ⚠️ = ใช้ได้เฉพาะหัวข้อใหญ่ / Fail 🔴 = ห้ามใช้กับ body</li>
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Theme card                                                         */
/* ------------------------------------------------------------------ */

function ThemeCard({
  theme,
  active,
  isDbSaved,
  onSelect,
}: {
  theme: ThemePreset;
  active: boolean;
  isDbSaved: boolean;
  onSelect: () => void;
}) {
  const primaryOnSurface = useMemo(
    () => contrastRatio(theme.primary, theme.surface),
    [theme.primary, theme.surface]
  );
  const whiteOnPrimary = useMemo(
    () => contrastRatio(theme.onPrimary, theme.primary),
    [theme.onPrimary, theme.primary]
  );
  const level = wcagLevel(whiteOnPrimary);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`card text-left p-0 overflow-hidden relative transition hover:-translate-y-0.5 hover:shadow-lift ${
        active ? "ring-2 ring-offset-2 ring-offset-ink-50" : ""
      }`}
      style={active ? ({ "--tw-ring-color": theme.primary } as React.CSSProperties) : undefined}
    >
      {/* Mesh + swatches */}
      <div
        className="relative h-24 overflow-hidden"
        style={{ background: theme.mesh }}
      >
        <div className="absolute inset-0 p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="w-5 h-5 rounded-full border-2 border-white shadow-soft"
              style={{ background: theme.primary }}
            />
            <span
              className="w-5 h-5 rounded-full border-2 border-white shadow-soft"
              style={{ background: theme.secondary }}
            />
            <span
              className="w-5 h-5 rounded-full border-2 border-white shadow-soft"
              style={{ background: theme.accent }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full"
              style={{
                background: theme.primary,
                color: theme.onPrimary,
              }}
            >
              {theme.id}
            </span>
            {isDbSaved && (
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/80 text-ink-700 backdrop-blur">
                SAVED
              </span>
            )}
          </div>
        </div>
        {active && (
          <div
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lift"
            style={{ background: theme.primary, color: theme.onPrimary }}
          >
            <Check size={14} />
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div>
          <div className="font-semibold text-ink-900 leading-tight">{theme.name.th}</div>
          <div className="text-xs text-ink-500">{theme.name.en}</div>
        </div>
        <p className="text-xs text-ink-500 line-clamp-2">{theme.description.th}</p>

        <div className="flex items-center gap-1.5 flex-wrap">
          <WcagBadge label="Button" ratio={whiteOnPrimary} />
          <WcagBadge label="Text" ratio={primaryOnSurface} />
          {level === "Fail" && (
            <span className="text-[10px] font-bold text-accent-rose">
              ⚠ onPrimary auto-corrected
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function WcagBadge({ label, ratio }: { label: string; ratio: number }) {
  const level = wcagLevel(ratio);
  const cls =
    level === "AAA"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : level === "AA"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : level === "AA-large"
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : "bg-rose-50 text-rose-700 border-rose-200";
  return (
    <span
      className={`text-[10px] font-semibold border rounded-md px-1.5 py-0.5 ${cls}`}
      title={`${label} contrast: ${ratio.toFixed(2)}:1`}
    >
      {label} {level} · {ratio.toFixed(1)}
    </span>
  );
}

function ThemeSwatch({ theme, size = 16 }: { theme: ThemePreset; size?: number }) {
  return (
    <span
      className="inline-block rounded-full border-2 border-white shadow-soft"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})`,
      }}
    />
  );
}
