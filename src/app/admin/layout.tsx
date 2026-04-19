"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminContext } from "./_ctx";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [pw, setPw] = useState<string>("");
  const [authed, setAuthed] = useState<boolean>(false);
  const [input, setInput] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("adminPw") : null;
    if (saved) { setPw(saved); setAuthed(true); }
  }, []);

  function login(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem("adminPw", input);
    setPw(input);
    setAuthed(true);
  }

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <form onSubmit={login} className="card p-6 w-full max-w-sm space-y-3">
          <h1 className="font-bold text-lg">🔒 Admin Login</h1>
          <p className="text-xs text-neutral-500">ใส่ ADMIN_PASSWORD ที่ตั้งไว้ใน .env</p>
          <input
            type="password"
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Password"
            autoFocus
          />
          <button className="btn-primary w-full">เข้าสู่ระบบ</button>
        </form>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-bold text-brand-600">🛠 LineBook Admin</Link>
            <nav className="hidden sm:flex gap-4 text-sm">
              <Link href="/admin" className="hover:text-brand-600">คิววันนี้</Link>
              <Link href="/admin/calendar" className="hover:text-brand-600">ปฏิทิน</Link>
              <Link href="/admin/customers" className="hover:text-brand-600">ลูกค้า</Link>
            </nav>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem("adminPw"); setAuthed(false); }}
            className="text-sm text-neutral-500 hover:text-red-600"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4">
        <AdminContext.Provider value={{ pw }}>{children}</AdminContext.Provider>
      </main>
    </div>
  );
}
