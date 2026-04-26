"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminContext } from "./_ctx";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  LayoutDashboard,
  CalendarCheck,
  Settings,
  Sparkles,
  UserCircle2,
  Clock,
  Users,
  MessageSquareText,
  Bot,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  BarChart3,
  Tag,
  Star,
  Palette,
  ArrowRightLeft,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "คิววันนี้", icon: CalendarCheck },
  { href: "/admin/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "วิเคราะห์", icon: BarChart3 },
  { href: "/admin/services", label: "บริการ", icon: Sparkles },
  { href: "/admin/staff", label: "พนักงาน", icon: UserCircle2 },
  { href: "/admin/customers", label: "ลูกค้า", icon: Users },
  { href: "/admin/working-hours", label: "เวลาทำการ", icon: Clock },
  { href: "/admin/coupons", label: "คูปอง", icon: Tag },
  { href: "/admin/reviews", label: "รีวิว", icon: Star },
  { href: "/admin/templates", label: "เทมเพลต", icon: MessageSquareText },
  { href: "/admin/ai-settings", label: "AI แชท", icon: Bot },
  { href: "/admin/theme", label: "ธีมของร้าน", icon: Palette },
  { href: "/admin/setup", label: "ตั้งค่า", icon: Settings },
];

type ShopBadge = { name: string; slug: string };

function brandMark(name: string | undefined, slug: string | undefined) {
  const src = (name?.trim() || slug || "JK").replace(/\s+/g, "");
  return src.slice(0, 2).toUpperCase();
}

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

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function login(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem("adminPw", input);
    setPw(input);
    setAuthed(true);
  }

  async function loginWithGoogle() {
    try {
      const sb = supabaseBrowser();
      const origin = window.location.origin;
      await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/admin/auth/google/callback` },
      });
    } catch (e) {
      console.error("[admin] google sign-in failed", e);
    }
  }

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-paper-1 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full bg-forest-50 blur-3xl opacity-70 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-[480px] h-[480px] rounded-full bg-ochre-200/40 blur-3xl opacity-60 pointer-events-none" />

        <form
          onSubmit={login}
          className="relative card p-8 w-full max-w-sm space-y-5 animate-fade-up shadow-editorial"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[12px] bg-forest-800 text-paper-1 grid place-items-center font-display text-xl">
              จก
            </div>
            <div>
              <div className="eyebrow">Admin Console</div>
              <h1 className="h-display text-2xl">เข้าสู่ร้าน</h1>
            </div>
          </div>
          <p className="text-xs text-ink-500 leading-relaxed">
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

          <div className="flex items-center gap-3 text-[11px] text-ink-500">
            <div className="flex-1 h-px bg-ink-200" />
            หรือ
            <div className="flex-1 h-px bg-ink-200" />
          </div>

          <button
            type="button"
            onClick={loginWithGoogle}
            className="btn-secondary w-full justify-center gap-2 border-ink-300"
          >
            <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.2 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.7 29 5 24 5 16.3 5 9.7 9.4 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 43c5 0 9.5-1.7 13-4.6l-6-5C29.2 34.6 26.7 35.5 24 35.5c-5.3 0-9.7-3-11.3-7.4l-6.5 5C9.6 38.5 16.3 43 24 43z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 4.9l6 5C42 33.5 44 29 44 24c0-1.2-.1-2.3-.4-3.5z"/>
            </svg>
            เข้าสู่ระบบด้วย Google
          </button>

          <div className="text-[11px] text-ink-500 text-center pt-1 space-y-1.5">
            <div>
              หรือเข้าผ่าน LINE (ไม่ต้องใช้รหัส){" "}
              <Link href="/liff/admin" className="text-forest-700 font-semibold underline-offset-4 hover:underline">
                /liff/admin
              </Link>
            </div>
            <div>
              มาผิดร้าน?{" "}
              <a
                href={`${typeof window !== "undefined" ? window.location.protocol : "https:"}//${(typeof window !== "undefined" ? window.location.host : "จองคิว.net").split(".").slice(1).join(".") || "จองคิว.net"}/login`}
                className="text-forest-700 font-semibold underline-offset-4 hover:underline"
              >
                เปลี่ยนร้าน
              </a>
            </div>
          </div>
        </form>
      </main>
    );
  }

  const mark = brandMark(shop?.name, shop?.slug);

  return (
    <AdminContext.Provider value={{ pw }}>
      <div className="min-h-screen bg-paper-1 text-ink-900 lg:flex">
        {/* ── Sidebar (desktop) ───────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-[236px] shrink-0 bg-forest-800 text-paper-1 border-r border-forest-700 px-3 py-5 sticky top-0 h-screen">
          <div className="flex items-center gap-2.5 px-2 pb-5 mb-4 border-b border-white/10">
            <div className="w-9 h-9 rounded-[10px] bg-paper-1 text-forest-800 grid place-items-center font-display font-semibold text-[16px]">
              {mark}
            </div>
            <div className="min-w-0">
              <div className="font-display text-[18px] leading-tight tracking-tight truncate">
                {shop?.name ?? "จองคิว"}
              </div>
              <div className="text-[10px] opacity-55 tracking-[0.12em] uppercase font-mono truncate">
                {shop?.slug ? `${shop.slug}.จองคิว.net` : "จองคิว.net"}
              </div>
            </div>
          </div>

          {shop && (
            <button
              onClick={switchShop}
              className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-forest-700 border border-white/5 text-[11px] mb-4 hover:bg-forest-600 transition-colors"
              title="สลับร้าน"
            >
              <ArrowRightLeft size={12} className="opacity-70" />
              <span className="opacity-75">สลับร้าน</span>
              <span className="ml-auto font-mono opacity-60">{shop.slug}</span>
            </button>
          )}

          <nav className="flex flex-col gap-[2px] flex-1 overflow-y-auto no-scrollbar -mx-1 px-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-3 px-3 py-2 rounded-[8px] text-[13px] transition-colors ${
                    active
                      ? "bg-forest-600 text-white font-medium"
                      : "text-white/75 hover:bg-forest-700 hover:text-white"
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {active && (
                    <span className="ml-auto w-[4px] h-[14px] bg-sage-200 rounded-sm" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-3 border-t border-white/10">
            <div className="flex items-center gap-2.5 px-1.5 py-1.5">
              <div className="w-7 h-7 rounded-full bg-ochre-200 text-ink-900 grid place-items-center text-[10px] font-semibold">
                {mark}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate">{shop?.name ?? "เจ้าของร้าน"}</div>
                <div className="text-[10px] opacity-55">เจ้าของร้าน</div>
              </div>
              <button
                onClick={() => {
                  sessionStorage.removeItem("adminPw");
                  setAuthed(false);
                }}
                className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition"
                title="ออกจากระบบ"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Mobile header ───────────────────────────────── */}
        <header className="lg:hidden sticky top-0 z-30 bg-paper-1/90 backdrop-blur border-b border-paper-3">
          <div className="px-3 sm:px-5 h-14 flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-10 h-10 rounded-xl hover:bg-paper-2 flex items-center justify-center text-ink-700"
              aria-label="เปิดเมนู"
            >
              <Menu size={20} />
            </button>

            <Link href="/admin" className="flex items-center gap-2 shrink-0">
              <span className="w-8 h-8 rounded-md bg-forest-800 text-paper-1 grid place-items-center font-display text-[13px]">
                {mark}
              </span>
              <span className="font-display text-[16px] tracking-tight text-ink-900 truncate">
                {shop ? shop.name : "จองคิว"}
              </span>
            </Link>

            <div className="flex-1" />

            <button
              onClick={() => {
                sessionStorage.removeItem("adminPw");
                setAuthed(false);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg text-ink-500 hover:text-clay-700 hover:bg-clay-200/50 transition"
              title="ออกจากระบบ"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">ออก</span>
            </button>
          </div>
        </header>

        {/* ── Mobile drawer ───────────────────────────────── */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-forest-900/60 animate-fade-up"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-forest-800 text-paper-1 p-4 flex flex-col animate-fade-up">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[10px] bg-paper-1 text-forest-800 grid place-items-center font-display font-semibold text-[16px]">
                    {mark}
                  </div>
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="font-display text-[17px] tracking-tight truncate">
                      {shop?.name ?? "จองคิว"}
                    </span>
                    {shop && (
                      <span className="text-[10px] font-mono opacity-55 truncate">
                        {shop.slug}.จองคิว.net
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/70"
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
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[13px] transition ${
                        active
                          ? "bg-forest-600 text-white font-medium"
                          : "text-white/75 hover:bg-forest-700 hover:text-white"
                      }`}
                    >
                      <Icon size={15} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="pt-3 mt-3 border-t border-white/10 text-[11px] text-white/60">
                เข้าผ่าน LINE:{" "}
                <Link
                  href="/liff/admin"
                  className="text-sage-200 font-medium underline-offset-4 hover:underline"
                  onClick={() => setDrawerOpen(false)}
                >
                  /liff/admin
                </Link>
              </div>
            </aside>
          </div>
        )}

        {/* ── Main column ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
