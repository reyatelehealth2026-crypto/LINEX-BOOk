"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import th from "@/locales/th.json";
import en from "@/locales/en.json";

type Lang = "th" | "en";
type Dict = typeof th;

const dicts: Record<Lang, Dict> = { th, en: en as Dict };

const Ctx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (path: string) => string;
}>({
  lang: "th",
  setLang: () => {},
  toggleLang: () => {},
  t: (p) => p
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("linex-lang") as Lang)) || null;
    if (saved === "th" || saved === "en") setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("linex-lang", l);
      document.documentElement.lang = l;
    }
  }

  function toggleLang() {
    setLang(lang === "th" ? "en" : "th");
  }

  function t(path: string): string {
    const parts = path.split(".");
    let cur: any = dicts[lang];
    for (const p of parts) {
      cur = cur?.[p];
      if (cur == null) return path;
    }
    return typeof cur === "string" ? cur : path;
  }

  return <Ctx.Provider value={{ lang, setLang, toggleLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
