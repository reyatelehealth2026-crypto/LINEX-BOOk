"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiff } from "@/components/LiffProvider";
import { AdminLiffContext, AdminIdentity } from "./_ctx";
import {
  LayoutDashboard,
  CalendarClock,
  Settings,
  ShieldCheck,
  LogOut,
  Loader2,
  ShieldX,
} from "lucide-react";

export default function LiffAdminLayout({ children }: { children: React.ReactNode }) {
  const { idToken, profile, ready } = useLiff();
  const pathname = usePathname();

  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [state, setState] = useState<"checking" | "ok" | "denied" | "error">("checking");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    if (!ready) return;
    if (!idToken) {
      setState("denied");
      setErrMsg("ไม่พบ LINE ID Token — กรุณาเปิดหน้านี้ผ่านลิงก์ LIFF ใน LINE");
      return;
    }
    (async () => {
      try {
        const r = await fetch("/api/admin/me", {
          headers: { "x-line-id-token": idToken },
          cache: "no-store",
        });
        if (r.ok) {
          const d = await r.json();
          setIdentity(d.identity ?? null);
          setState("ok");
        } else {
          setState("denied");
          setErrMsg(
            "บัญชี LINE นี้ไม่ได้อยู่ในรายชื่อแอดมิน — ติดต่อเจ้าของร้านให้เพิ่ม LINE ID ของคุณใน ADMIN_LINE_IDS"
          );
        }
      } catch (e: any) {
        setState("error");
        setErrMsg(e?.message ?? "ตรวจสอบสิทธิ์ไม่สำเร็จ");
      }
    })();
  }, [ready, idToken]);

  const ctxValue = {
    identity,
    idToken,
    authHeaders: (): Record<string, string> => (idToken ? { "x-line-id-token": idToken } : {}),
  };

  if (state === "checking") {
    return (
      <div className="flex items-center justify-center min-h-[50vh] animate-fade-up">
        <div className="flex flex-col items-center gap-3 text-ink-500">
          <Loader2 className="animate-spin" size={24} />
          <div className="text-sm">กำลังตรวจสอบสิทธิ์แอดมิน...</div>
        </div>
      </div>
    );
  }

  if (state !== "ok") {
    return (
      <div className="card p-6 text-center space-y-4 animate-fade-up">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-accent-rose/10 text-accent-rose flex items-center justify-center">
          <ShieldX size={26} />
        </div>
        <div>
          <div className="h-display text-xl">เข้าถึงไม่ได้</div>
          <p className="text-sm text-ink-500 mt-1">{errMsg}</p>
        </div>
        {profile && (
          <div className="card bg-ink-50 p-3 text-left text-xs space-y-1">
            <div className="text-ink-500 uppercase tracking-wider font-semibold">LINE ID ของคุณ</div>
            <div className="font-mono break-all text-ink-900">{profile.userId}</div>
            <div className="text-[11px] text-ink-400 mt-1">
              คัดลอกค่านี้ไปวางใน <code className="bg-white px-1 rounded">ADMIN_LINE_IDS</code> ของ .env
            </div>
          </div>
        )}
        <Link href="/liff" className="btn-secondary text-sm">
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  return (
    <AdminLiffContext.Provider value={ctxValue}>
      <div className="pb-24 animate-fade-up">
        {/* Top identity strip */}
        <div className="card-glass p-3 px-4 mb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="eyebrow">Admin Mode</div>
            <div className="text-sm font-semibold text-ink-900 truncate">
              {identity?.displayName ?? profile?.displayName ?? "คุณแอดมิน"}
            </div>
          </div>
          <Link
            href="/liff"
            className="shrink-0 w-9 h-9 rounded-xl bg-white border border-ink-200 text-ink-500 flex items-center justify-center hover:text-ink-900"
            title="ออกจากโหมดแอดมิน"
          >
            <LogOut size={16} />
          </Link>
        </div>

        {children}

        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-ink-100 bg-white/80 backdrop-blur-xl">
          <div className="max-w-lg mx-auto grid grid-cols-3">
            <TabLink
              href="/liff/admin"
              active={pathname === "/liff/admin"}
              icon={<LayoutDashboard size={18} />}
              label="หน้าหลัก"
            />
            <TabLink
              href="/liff/admin/queue"
              active={pathname?.startsWith("/liff/admin/queue") ?? false}
              icon={<CalendarClock size={18} />}
              label="คิววันนี้"
            />
            <TabLink
              href="/liff/admin/setup"
              active={pathname?.startsWith("/liff/admin/setup") ?? false}
              icon={<Settings size={18} />}
              label="ตั้งค่าร้าน"
            />
          </div>
        </nav>
      </div>
    </AdminLiffContext.Provider>
  );
}

function TabLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 py-3 transition-colors ${
        active ? "text-brand-600" : "text-ink-400 hover:text-ink-700"
      }`}
    >
      <div className={`${active ? "scale-110" : ""} transition-transform`}>{icon}</div>
      <span className="text-[11px] font-semibold tracking-tight">{label}</span>
      {active && <span className="w-1 h-1 rounded-full bg-brand-500" />}
    </Link>
  );
}
