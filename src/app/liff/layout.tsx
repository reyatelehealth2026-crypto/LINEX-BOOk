"use client";
import { LiffProvider, useLiff } from "@/components/LiffProvider";
import { I18nProvider } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import Link from "next/link";
import { ReactNode } from "react";

export default function LiffLayout({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <LiffProvider>
        <Shell>{children}</Shell>
      </LiffProvider>
    </I18nProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { ready, error, loggedIn, login, profile } = useLiff();
  if (!ready) {
    return <div className="p-10 text-center text-neutral-500">กำลังเริ่มต้น LIFF...</div>;
  }
  if (error) {
    return (
      <div className="p-6 m-4 card border-red-200 bg-red-50 text-red-700 text-sm">
        <div className="font-semibold mb-1">LIFF error</div>
        <div>{error}</div>
        <div className="mt-3 text-xs text-red-500">
          ตรวจสอบ <code>NEXT_PUBLIC_LIFF_ID</code> ใน <code>.env.local</code> และต้องเปิดผ่าน <code>liff.line.me/&lt;id&gt;</code>
        </div>
      </div>
    );
  }
  if (!loggedIn) {
    return (
      <div className="p-10 text-center space-y-4">
        <p>กรุณาเข้าสู่ระบบด้วย LINE</p>
        <button onClick={login} className="btn-primary">Login with LINE</button>
      </div>
    );
  }
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-neutral-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/liff" className="font-semibold text-brand-600">💚 LineBook</Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {profile?.pictureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.pictureUrl} alt="" className="w-8 h-8 rounded-full" />
            )}
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto p-4 pb-24">{children}</main>
    </div>
  );
}
