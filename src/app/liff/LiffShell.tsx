"use client";
import { LiffProvider, useLiff } from "@/components/LiffProvider";
import { I18nProvider } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemePicker } from "@/components/ThemePicker";
import Link from "next/link";
import { ReactNode } from "react";
import { Loader2, AlertTriangle, CalendarCheck } from "lucide-react";

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-ink-500">
          <Loader2 className="animate-spin" size={22} />
          <div className="text-sm">กำลังเริ่มต้น LIFF...</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="card p-6 max-w-sm w-full space-y-3">
          <div className="w-10 h-10 rounded-md border border-red-200 bg-red-50 text-red-700 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="h-display text-base">LIFF Error</div>
            <div className="text-sm text-ink-700 mt-1">{error}</div>
            <div className="mt-3 text-xs text-ink-500">
              ร้านนี้ยังไม่ได้ตั้งค่า LIFF ให้เรียบร้อย ลองให้เจ้าของร้านเข้า
              <code className="bg-ink-100 px-1 rounded ml-1">/admin/shop-info</code> แล้วกรอก LIFF ID
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="card p-8 max-w-sm w-full text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-md bg-ink-900 text-white flex items-center justify-center">
            <CalendarCheck size={20} strokeWidth={2.25} />
          </div>
          <div>
            <div className="h-display text-xl">เข้าสู่ระบบด้วย LINE</div>
            <div className="text-sm text-ink-600 mt-1.5">ใช้บัญชี LINE ของคุณเพื่อจองคิว</div>
          </div>
          <button onClick={login} className="btn-primary w-full justify-center">Login with LINE</button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 bg-white border-b border-ink-200">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/liff" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-ink-900 text-white flex items-center justify-center">
              <CalendarCheck size={15} strokeWidth={2.25} />
            </span>
            <span className="font-semibold tracking-tight text-[15px] text-ink-900">LineBook</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemePicker variant="icon" />
            <LanguageToggle />
            {profile?.pictureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.pictureUrl} alt="" className="w-7 h-7 rounded-full border border-ink-200" />
            )}
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto p-4 pb-24">{children}</main>
    </div>
  );
}
