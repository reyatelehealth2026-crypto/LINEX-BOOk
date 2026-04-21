import { ReactNode } from "react";
import { getCurrentShop } from "@/lib/supabase";
import LiffShell from "./LiffShell";

export default async function LiffLayout({ children }: { children: ReactNode }) {
  let liffId: string | null = null;
  try {
    const shop = await getCurrentShop();
    liffId = shop.liff_id ?? null;
  } catch {
    /* root domain or unknown shop — LiffProvider will show error */
  }
  return <LiffShell liffId={liffId}>{children}</LiffShell>;
}
