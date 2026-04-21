"use client";
import { LiffProvider, useLiff } from "@/components/LiffProvider";
import { I18nProvider } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemePicker } from "@/components/ThemePicker";
import Link from "next/link";
import { ReactNode } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

export default function LiffShell({ children, liffId }: { children: ReactNode; liffId: string | null }) {
  return (
    <I18nProvider>
      <LiffProvider liffId={liffId}>
        <Shell>{children}</Shell>
      </LiffProvider>
    </I18nProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { ready, error, loggedIn, login, profile } = useLiff();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-ink-500">
          <Loader2 className="animate-spin" size={24} />
          <div className="text-sm">กำลังเริ่มต้น LIFF...</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-6 max-w-sm w-full space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-rose/10 text-accent-rose flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="h-display text-lg">LIFF Error</div>
            <div className="text-sm text-ink-600 mt-1">{error}</div>
            <div className="mt-3 text-xs text-ink-400">
              ร้านนี้ยังไม่ได้ตั้งค่า LIFF ให้เรียบร้อย ลองให้เจ้าของร้านเข้า <code className="bg-ink-100 px-1 rounded">/admin/shop-info</code> แล้วกรอก LIFF ID
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-sm w-full text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-3xl bg-brand-500 text-white flex items-center justify-center shadow-glow">
            💚
          </div>
          <div className="h-display text-2xl">เข้าสู่ระบบด้วย LINE</div>
          <button onClick={login} className="btn-primary w-full">Login with LINE</button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-x-0 top-0 h-80 bg-brand-mesh pointer-events-none -z-10" />
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-white/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/liff" className="flex items-center gap-2 font-bold">
            <span className="w-7 h-7 rounded-xl bg-brand-500 text-white flex items-center justify-center text-xs shadow-glow">💚</span>
            <span className="grad-text tracking-tight">LineBook</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemePicker variant="icon" />
            <LanguageToggle />
            {profile?.pictureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.pictureUrl} alt="" className="w-8 h-8 rounded-full ring-2 ring-white shadow-soft" />
            )}
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto p-4 pb-24">{children}</main>
    </div>
  );
}
