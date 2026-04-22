"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ImpersonatePage() {
  const params = useSearchParams();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = params?.get("token");
    if (!token) { setErr("missing token"); return; }
    fetch("/api/admin/impersonate/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        if (!r.ok) { setErr((await r.json().catch(() => ({}))).error || "redeem_failed"); return; }
        // The redeem endpoint sets the httpOnly `super_admin_impersonation` cookie
        // which verifyAdmin accepts. For the existing AdminContext pattern that
        // requires `adminPw` in sessionStorage, store a synthetic marker so the
        // layout treats us as authed — the actual header we send is ignored
        // because the cookie provides authorization.
        sessionStorage.setItem("adminPw", "__impersonated__");
        router.replace("/admin");
      })
      .catch(() => setErr("network"));
  }, [params, router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-ink-50">
      <div className="card p-7 w-full max-w-sm text-center space-y-3">
        <div className="eyebrow">Super Admin</div>
        <h1 className="h-display text-xl">กำลังเข้าใช้ร้าน…</h1>
        {err ? (
          <p className="text-sm text-red-600">เข้าไม่ได้: {err}</p>
        ) : (
          <p className="text-sm text-ink-500">รอสักครู่กำลังตรวจสิทธิ์</p>
        )}
      </div>
    </main>
  );
}
