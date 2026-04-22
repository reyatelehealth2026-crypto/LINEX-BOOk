import Link from "next/link";
import { verifySuperAdminFromCookies } from "@/lib/super-admin-auth";
import SuperLogoutButton from "./_logout";

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const me = await verifySuperAdminFromCookies();
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 bg-white border-b border-ink-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/super" className="font-bold tracking-tight text-ink-900">
            <span className="inline-flex items-center gap-2">
              <span className="w-7 h-7 rounded-md bg-ink-900 text-white grid place-items-center text-xs">S</span>
              Super Admin
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/super" className="px-3 py-1.5 rounded-xl text-sm font-semibold text-ink-700 hover:bg-ink-100">
              ร้านทั้งหมด
            </Link>
          </nav>
          <div className="flex-1" />
          {me && (
            <>
              <span className="text-xs text-ink-500 hidden sm:inline">
                {me.displayName || me.email || `#${me.id}`}
              </span>
              <SuperLogoutButton />
            </>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
