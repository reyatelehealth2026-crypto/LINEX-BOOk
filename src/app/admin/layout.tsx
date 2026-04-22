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
  Palette,
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
  { href: "/admin/theme", label: "ธีมของร้าน", icon: Palette },
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

type ShopBadge = { name: string; slug: string };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pw, setPw] = useState<string>("");
  const [authed, setAuthed] = useState<boolean>(false);
  const [input, setInput] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shop, setShop] = useState<ShopBadge | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("adminPw") : null;
    if (saved) {
      setPw(saved);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed || !pw) return;
    fetch("/api/admin/shop-info", { headers: { "x-admin-password": pw } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setShop({ name: d.name, slug: d.slug }))
      .catch(() => {});
  }, [authed, pw]);

  function switchShop() {
    document.cookie = "tenant_slug=; Max-Age=0; path=/";
    sessionStorage.removeItem("adminPw");
    window.location.href = "/";
  }

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
      <main className="min-h-screen flex items-center justify-center p-6 bg-ink-50">
        <form onSubmit={login} className="card p-7 w-full max-w-sm space-y-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-ink-900 text-white flex items-center justify-center">
              <Lock size={20} />
            </div>
            <div>
              <div className="eyebrow">Admin Console</div>
              <h1 className="h-display text-xl">เข้าสู่ระบบร้าน</h1>
            </div>
          </div>
          <p className="text-xs text-ink-500">
            ใช้รหัสผ่านที่ตั้งไว้ตอนสมัครร้าน (เจ้าของร้าน)
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
          <button className="btn-primary w-full justify-center">
            <ShieldCheck size={16} /> เข้าสู่ระบบ
          </button>
          <div className="text-[11px] text-ink-400 text-center pt-1 space-y-1">
            <div>
              หรือเข้าผ่าน LINE (ไม่ต้องใช้รหัส){" "}
              <Link href="/liff/admin" className="text-ink-700 font-semibold">/liff/admin</Link>
            </div>
            <div>
              มาผิดร้าน?{" "}
              <a
                href={`${typeof window !== "undefined" ? window.location.protocol : "https:"}//${(typeof window !== "undefined" ? window.location.host : "likesms.net").split(".").slice(1).join(".") || "likesms.net"}/login`}
                className="text-ink-700 font-semibold"
              >
                เปลี่ยนร้าน
              </a>
            </div>
          </div>
        </form>
      </main>
    );
  }

  return (
    <AdminContext.Provider value={{ pw }}>
      <div className="min-h-screen bg-ink-50">

        {/* ── Header (mobile + desktop) ───────────────────────── */}
        <header className="sticky top-0 z-30 bg-white border-b border-ink-200">
          <div className="max-w-6xl mx-auto px-3 sm:px-5 h-14 flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl hover:bg-ink-100 flex items-center justify-center text-ink-700"
              aria-label="เปิดเมนู"
            >
              <Menu size={20} />
            </button>

            <Link href="/admin" className="flex items-center gap-2 font-bold shrink-0">
              <span className="w-8 h-8 rounded-md bg-ink-900 text-white flex items-center justify-center">
                <Settings size={14} />
              </span>
              <span className="text-ink-900 tracking-tight hidden sm:inline font-bold">
                {shop ? shop.name : "LineBook Admin"}
              </span>
            </Link>
            {shop && (
              <button
                onClick={switchShop}
                title="สลับร้าน"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-ink-100 text-ink-600 hover:bg-ink-200"
              >
                <span className="font-mono">{shop.slug}</span>
                <span className="text-ink-400">↻</span>
              </button>
            )}

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
                        ? "bg-ink-900 text-white"
                        : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-ink-500 hover:text-red-600 hover:bg-red-50 transition"
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
              className="absolute inset-0 bg-ink-900/40 animate-fade-up"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white border-r border-ink-200 p-4 flex flex-col animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-bold">
                  <span className="w-8 h-8 rounded-md bg-ink-900 text-white flex items-center justify-center">
                    <Settings size={14} />
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-ink-900 tracking-tight">{shop?.name ?? "Admin"}</span>
                    {shop && <span className="text-[10px] font-mono text-ink-400">{shop.slug}</span>}
                  </div>
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
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                        active
                          ? "bg-ink-900 text-white"
                          : "text-ink-700 hover:bg-ink-100 hover:text-ink-900"
                      }`}
                    >
                      <Icon size={16} className={active ? "text-white/70" : "text-ink-400"} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="pt-3 mt-3 border-t border-ink-100 text-[11px] text-ink-400">
                แอดมินผ่าน LINE: เปิด{" "}
                <Link
                  href="/liff/admin"
                  className="text-ink-700 font-semibold"
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
