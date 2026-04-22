"use client";
import { LogOut } from "lucide-react";

export default function SuperLogoutButton() {
  async function logout() {
    await fetch("/api/super/logout", { method: "POST" });
    window.location.href = "/super/login";
  }
  return (
    <button
      onClick={logout}
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-ink-500 hover:text-red-600 hover:bg-red-50"
    >
      <LogOut size={14} /> ออก
    </button>
  );
}
