"use client";
import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, toggleLang } = useI18n();
  return (
    <button
      onClick={toggleLang}
      className="inline-flex rounded-full bg-ink-100 p-1 text-xs gap-0.5"
      aria-label="Toggle language"
    >
      <span className={`px-3 py-1 rounded-full transition-all ${lang === "th" ? "bg-white shadow-sm font-semibold text-ink-900" : "text-ink-500"}`}>
        ไทย
      </span>
      <span className={`px-3 py-1 rounded-full transition-all ${lang === "en" ? "bg-white shadow-sm font-semibold text-ink-900" : "text-ink-500"}`}>
        EN
      </span>
    </button>
  );
}
