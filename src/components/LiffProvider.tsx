"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
} | null;

type LiffCtx = {
  ready: boolean;
  loggedIn: boolean;
  profile: Profile;
  idToken: string | null;
  error: string | null;
  login: () => void;
  logout: () => void;
  closeWindow: () => void;
};

const Ctx = createContext<LiffCtx>({
  ready: false, loggedIn: false, profile: null, idToken: null, error: null,
  login: () => {}, logout: () => {}, closeWindow: () => {}
});

export function LiffProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liff, setLiff] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error("NEXT_PUBLIC_LIFF_ID is not set");
        const mod = await import("@line/liff");
        const L = mod.default;
        await L.init({ liffId });
        if (!mounted) return;
        setLiff(L);
        const isLoggedIn = L.isLoggedIn();
        setLoggedIn(isLoggedIn);
        if (isLoggedIn) {
          const p = await L.getProfile();
          setProfile(p);
          setIdToken(L.getIDToken() ?? null);
        }
        setReady(true);
      } catch (e: any) {
        setError(e?.message ?? "LIFF init failed");
        setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const value: LiffCtx = {
    ready,
    loggedIn,
    profile,
    idToken,
    error,
    login: () => liff?.login(),
    logout: () => liff?.logout(),
    closeWindow: () => liff?.closeWindow?.()
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLiff() {
  return useContext(Ctx);
}
