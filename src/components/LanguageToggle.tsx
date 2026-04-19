"use client";
import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex rounded-full bg-neutral-100 p-1 text-xs">
      <button
        onClick={() => setLang("th")}
        className={`px-3 py-1 rounded-full ${lang === "th" ? "bg-white shadow-sm font-semibold" : "text-neutral-500"}`}
      >
        ไทย
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-3 py-1 rounded-full ${lang === "en" ? "bg-white shadow-sm font-semibold" : "text-neutral-500"}`}
      >
        EN
      </button>
    </div>
  );
}
