"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GoogleAdminRedeemPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = params?.get("token");
    if (!token) { setErr("missing token"); return; }
    fetch("/api/admin/auth/google/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setErr(j.error || "redeem_failed");
          return;
        }
        sessionStorage.setItem("adminPw", "__google__");
        router.replace("/admin/setup");
      })
      .catch(() => setErr("network"));
  }, [params, router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-paper-1">
      <div className="card p-7 w-full max-w-sm text-center space-y-3">
        <div className="eyebrow">เริ่มต้นใช้งาน</div>
        <h1 className="h-display text-xl">กำลังเข้าร้านของคุณ…</h1>
        {err ? (
          <p className="text-sm text-red-600">เข้าไม่ได้: {err}</p>
        ) : (
          <p className="text-sm text-ink-500">รอสักครู่กำลังตั้ง session</p>
        )}
      </div>
    </main>
  );
}
