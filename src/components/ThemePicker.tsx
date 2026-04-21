"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, Check, X } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { THEME_PRESETS, type ThemeId, type ThemePreset } from "@/lib/themes";

/**
 * Compact theme picker button + bottom sheet.
 * Designed for the LIFF header — lets customers preview different themes
 * without affecting the shop's saved theme (localStorage only).
 */
export function ThemePicker({
  variant = "compact",
  label,
}: {
  variant?: "compact" | "icon";
  label?: string;
}) {
  const { activeTheme, activeId, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Close on ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll when open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const trigger = (
    <button
      onClick={() => setOpen(true)}
      className={
        variant === "icon"
          ? "w-8 h-8 rounded-full bg-white/80 backdrop-blur border border-ink-100 shadow-soft flex items-center justify-center text-ink-700 hover:text-ink-900 transition"
          : "inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur border border-ink-100 shadow-soft px-2.5 py-1 text-xs font-semibold text-ink-700 hover:text-ink-900 transition"
      }
      aria-label="เปลี่ยนธีม"
      title={`ธีม: ${activeTheme.name.th}`}
    >
      <span
        className="w-4 h-4 rounded-full border-2 border-white"
        style={{
          background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.primaryLight})`,
        }}
      />
      {variant === "compact" && <span>{label ?? "ธีม"}</span>}
    </button>
  );

  return (
    <>
      {trigger}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink-900/45 backdrop-blur-sm animate-fade-up"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div
            ref={sheetRef}
            className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-linex-panel max-h-[85vh] flex flex-col animate-fade-up"
          >
            {/* Grab bar (mobile) */}
            <div className="sm:hidden pt-2">
              <div className="mx-auto w-10 h-1.5 rounded-full bg-ink-200" />
            </div>

            <header className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-ink-100">
              <div>
                <div className="flex items-center gap-2">
                  <Palette size={16} className="text-ink-500" />
                  <div className="eyebrow">PREVIEW</div>
                </div>
                <h2 className="h-display text-lg mt-1">ลองเปลี่ยนธีม</h2>
                <p className="text-xs text-ink-500 mt-1">
                  ลองดูสีต่าง ๆ ได้ — เปลี่ยนแค่หน้าของคุณ ไม่กระทบร้าน
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-ink-100 flex items-center justify-center text-ink-500"
                aria-label="ปิด"
              >
                <X size={18} />
              </button>
            </header>

            <div className="overflow-y-auto flex-1 p-4">
              <div className="grid grid-cols-2 gap-2.5">
                {THEME_PRESETS.map((theme) => (
                  <ThemeTile
                    key={theme.id}
                    theme={theme}
                    active={theme.id === activeId}
                    onSelect={() => setTheme(theme.id)}
                  />
                ))}
              </div>
            </div>

            <footer className="p-4 pt-3 border-t border-ink-100 flex items-center justify-between gap-3">
              <div className="text-xs text-ink-500 flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full border-2 border-white shadow-soft"
                  style={{
                    background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.primaryLight})`,
                  }}
                />
                <span>
                  กำลังใช้: <b className="text-ink-700">{activeTheme.name.th}</b>
                </span>
              </div>
              <button
                onClick={() => {
                  setTheme("linex" as ThemeId);
                  setOpen(false);
                }}
                className="text-xs font-semibold text-ink-500 hover:text-ink-700 px-3 py-1.5 rounded-xl hover:bg-ink-100 transition"
              >
                รีเซ็ต
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function ThemeTile({
  theme,
  active,
  onSelect,
}: {
  theme: ThemePreset;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group text-left rounded-2xl overflow-hidden border transition ${
        active
          ? "border-transparent ring-2 shadow-lift"
          : "border-ink-100 hover:-translate-y-0.5 hover:shadow-soft"
      }`}
      style={
        active ? ({ "--tw-ring-color": theme.primary } as React.CSSProperties) : undefined
      }
    >
      <div
        className="relative h-14"
        style={{ background: theme.mesh }}
      >
        <div className="absolute inset-0 p-2 flex items-end gap-1">
          <span
            className="w-4 h-4 rounded-full border-2 border-white shadow-soft"
            style={{ background: theme.primary }}
          />
          <span
            className="w-4 h-4 rounded-full border-2 border-white shadow-soft"
            style={{ background: theme.secondary }}
          />
          <span
            className="w-4 h-4 rounded-full border-2 border-white shadow-soft"
            style={{ background: theme.accent }}
          />
        </div>
        {active && (
          <div
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-lift"
            style={{ background: theme.primary, color: theme.onPrimary }}
          >
            <Check size={12} />
          </div>
        )}
      </div>
      <div className="p-2 bg-white">
        <div className="font-semibold text-[13px] text-ink-900 leading-tight truncate">
          {theme.name.th}
        </div>
        <div className="text-[10px] text-ink-400 uppercase tracking-wider">{theme.id}</div>
      </div>
    </button>
  );
}
