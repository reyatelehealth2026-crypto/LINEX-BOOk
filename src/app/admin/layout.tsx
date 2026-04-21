"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminContext } from "./_ctx";
import {
  LayoutDashboard,
  CalendarCheck,
  Settings,
  Stethoscope,
  Sparkles,
  UserCircle2,
  Clock,
  Users,
  MessageSquareText,
  Bot,
  LogOut,
  Menu,
  X,
  Lock,
  ShieldCheck,
  BarChart3,
  Tag,
  Star,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "คิววันนี้", icon: CalendarCheck },
  { href: "/admin/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/admin/setup", label: "ตั้งค่าร้าน", icon: Settings },
  { href: "/admin/healthcheck", label: "ตรวจระบบ", icon: Stethoscope },
  { href: "/admin/services", label: "บริการ", icon: Sparkles },
  { href: "/admin/staff", label: "พนักงาน", icon: UserCircle2 },
  { href: "/admin/working-hours", label: "เวลาทำการ", icon: Clock },
  { href: "/admin/customers", label: "ลูกค้า", icon: Users },
  { href: "/admin/templates", label: "เทมเพลตข้อความ", icon: MessageSquareText },
  { href: "/admin/ai-settings", label: "ตั้งค่า AI แชท", icon: Bot },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/coupons", label: "คูปอง", icon: Tag },
  { href: "/admin/reviews", label: "รีวิว", icon: Star },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pw, setPw] = useState<string>("");
  const [authed, setAuthed] = useState<boolean>(false);
  const [input, setInput] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("adminPw") : null;
    if (saved) {
      setPw(saved);
      setAuthed(true);
    }
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function login(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem("adminPw", input);
    setPw(input);
    setAuthed(true);
  }

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-ink-50 relative">
        <div className="absolute inset-0 mesh-bg opacity-70 pointer-events-none" />
        <form onSubmit={login} className="linex-panel p-7 w-full max-w-sm space-y-4 relative animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linex-600 text-white flex items-center justify-center shadow-linex-glow">
              <Lock size={20} />
            </div>
            <div>
              <div className="eyebrow">Admin Console</div>
              <h1 className="h-display text-xl">เข้าสู่ระบบ</h1>
            </div>
          </div>
          <p className="text-xs text-ink-500">
            ใส่ <code className="bg-ink-100 px-1.5 py-0.5 rounded">ADMIN_PASSWORD</code> ที่ตั้งไว้ใน <code className="bg-ink-100 px-1.5 py-0.5 rounded">.env</code>
          </p>
          <div>
            <label className="label">รหัสผ่าน</label>
            <input
              type="password"
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Password"
              autoFocus
            />
          </div>
          <button className="glow-btn w-full justify-center">
            <ShieldCheck size={16} /> เข้าสู่ระบบ
          </button>
          <div className="text-[11px] text-ink-400 text-center pt-1">
            💡 แอดมินผ่าน LINE (ไม่ต้องใช้รหัส) เปิด{" "}
            <Link href="/liff/admin" className="text-brand-600 font-semibold">/liff/admin</Link>
          </div>
        </form>
      </main>
    );
  }

  return (
    <AdminContext.Provider value={{ pw }}>
      <div className="min-h-screen bg-ink-50 relative">
        <div className="absolute inset-x-0 top-0 h-64 mesh-bg opacity-40 pointer-events-none" />

        {/* ── Header (mobile + desktop) ───────────────────────── */}
        <header className="sticky top-0 z-30 bg-white/75 backdrop-blur-xl border-b border-white/50">
          <div className="max-w-6xl mx-auto px-3 sm:px-5 h-14 flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl hover:bg-ink-100 flex items-center justify-center text-ink-700"
              aria-label="เปิดเมนู"
            >
              <Menu size={20} />
            </button>

            <Link href="/admin" className="flex items-center gap-2 font-bold shrink-0">
              <span className="w-8 h-8 rounded-xl bg-linex-600 text-white flex items-center justify-center text-xs shadow-linex-glow">
                🛠
              </span>
              <span className="gradient-text tracking-tight hidden sm:inline">LineBook Admin</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 ml-4">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition ${
                      active
                        ? "bg-linex-600 text-white shadow-linex-glow"
                        : "text-ink-600 hover:bg-linex-50 hover:text-linex-700"
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex-1 lg:flex-none" />

            <button
              onClick={() => {
                sessionStorage.removeItem("adminPw");
                setAuthed(false);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-ink-500 hover:text-accent-rose hover:bg-accent-rose/10 transition"
              title="ออกจากระบบ"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">ออก</span>
            </button>
          </div>
        </header>

        {/* ── Mobile drawer ───────────────────────────────────── */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-up"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white/95 backdrop-blur-xl shadow-linex-panel p-4 flex flex-col animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-bold">
                  <span className="w-8 h-8 rounded-xl bg-linex-600 text-white flex items-center justify-center text-xs">
                    🛠
                  </span>
                  <span className="gradient-text tracking-tight">Admin</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-9 h-9 rounded-xl hover:bg-ink-100 flex items-center justify-center text-ink-600"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="flex flex-col gap-0.5 overflow-y-auto flex-1 -mx-1 px-1">
                {NAV.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition ${
                        active
                          ? "bg-linex-600 text-white shadow-linex-glow"
                          : "text-ink-700 hover:bg-linex-50 hover:text-linex-700"
                      }`}
                    >
                      <Icon size={16} className={active ? "text-linex-200" : "text-ink-400"} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="pt-3 mt-3 border-t border-ink-100 text-[11px] text-ink-400">
                แอดมินผ่าน LINE: เปิด{" "}
                <Link
                  href="/liff/admin"
                  className="text-brand-600 font-semibold"
                  onClick={() => setDrawerOpen(false)}
                >
                  /liff/admin
                </Link>
              </div>
            </aside>
          </div>
        )}

        <main className="relative max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-6">{children}</main>
      </div>
    </AdminContext.Provider>
  );
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
