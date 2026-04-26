"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function GoogleAdminCallbackPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = supabaseBrowser();
        await new Promise((r) => setTimeout(r, 50));
        const { data, error } = await sb.auth.getSession();
        if (error || !data.session?.access_token) {
          if (!cancelled) setErr("ไม่พบ session จาก Google — ลองใหม่อีกครั้ง");
          return;
        }
        const r = await fetch("/api/admin/auth/google/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: data.session.access_token }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          if (!cancelled) setErr(j.error === "no_admin_for_google_account"
            ? "บัญชี Google นี้ยังไม่ได้ผูกกับร้าน กรุณาให้เจ้าของร้านเชิญหรือสมัครใหม่"
            : `เข้าไม่ได้: ${j.error ?? "unknown"}`);
          return;
        }
        await sb.auth.signOut().catch(() => {});
        sessionStorage.setItem("adminPw", "__google__");
        router.replace("/admin");
      } catch (e: any) {
        if (!cancelled) setErr(e.message ?? "network error");
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-paper-1">
      <div className="card p-7 w-full max-w-sm text-center space-y-3">
        <div className="eyebrow">Google Sign-In</div>
        <h1 className="h-display text-xl">กำลังเข้าสู่ระบบ…</h1>
        {err ? (
          <p className="text-sm text-red-600">{err}</p>
        ) : (
          <p className="text-sm text-ink-500">รอสักครู่กำลังตรวจสิทธิ์</p>
        )}
      </div>
    </main>
  );
}
