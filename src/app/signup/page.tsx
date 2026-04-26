"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  Loader2,
  Scissors,
  Hand,
  Leaf,
  CalendarCheck,
  ArrowRight,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Step = 1 | 2 | 3;
type PresetKey = "salon" | "nail" | "spa";

const PRESETS: { key: PresetKey; icon: React.ReactNode; label: string; desc: string; services: number }[] = [
  { key: "salon", icon: <Scissors size={20} />, label: "ร้านเสริมสวย / บาร์เบอร์", desc: "ตัด สี ทรีตเมนต์ สระ-ไดร์ (6 บริการ)", services: 6 },
  { key: "nail",  icon: <Hand size={20} />,     label: "ร้านทำเล็บ",               desc: "มือ-เท้า เจล ต่อเล็บ เพ้นท์ (7 บริการ)",  services: 7 },
  { key: "spa",   icon: <Leaf size={20} />,     label: "สปา / ร้านนวด",            desc: "ไทย น้ำมัน อโรม่า สปาหน้า (7 บริการ)",  services: 7 },
];

export default function SignupPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ redirectUrl: string } | null>(null);

  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [slugMsg, setSlugMsg] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [preset, setPreset] = useState<PresetKey | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [googleAuthUserId, setGoogleAuthUserId] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stash = sessionStorage.getItem("signupWizard");
    if (stash) {
      try {
        const s = JSON.parse(stash);
        if (s.shopName) setShopName(s.shopName);
        if (s.slug) setSlug(s.slug);
        if (s.phone) setPhone(s.phone);
        if (s.address) setAddress(s.address);
        if (s.preset) setPreset(s.preset);
        if (typeof s.step === "number") setStep(s.step as Step);
      } catch {}
    }
    const url = new URL(window.location.href);
    if (url.searchParams.get("provider") === "google" || url.hash.includes("access_token") || url.searchParams.get("code")) {
      (async () => {
        try {
          const sb = supabaseBrowser();
          await new Promise((r) => setTimeout(r, 50));
          const { data } = await sb.auth.getSession();
          if (data.session?.user) {
            setGoogleAuthUserId(data.session.user.id);
            setGoogleEmail(data.session.user.email ?? null);
            setEmail(data.session.user.email ?? "");
            setStep(3);
          }
          window.history.replaceState({}, "", "/signup");
        } catch {}
      })();
    }
  }, []);

  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); setSlugMsg(""); return; }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/signup/check-slug?slug=${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (json.available) {
          setSlugStatus("ok");
          setSlugMsg(`ใช้ได้ — ${slug}.จองคิว.net`);
        } else {
          setSlugStatus("bad");
          const reasons: Record<string, string> = {
            length: "ความยาว 3-30 ตัวอักษร",
            format: "ใช้ได้เฉพาะ a-z 0-9 และ -",
            reserved: "เป็นชื่อสงวน",
            taken: "ชื่อนี้ถูกใช้แล้ว",
            missing: "กรุณาใส่ slug",
          };
          setSlugMsg(reasons[json.reason] ?? "ไม่สามารถใช้ได้");
        }
      } catch { setSlugStatus("bad"); setSlugMsg("ตรวจสอบไม่สำเร็จ"); }
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  const step1Valid = shopName.trim().length > 0 && slugStatus === "ok";
  const step2Valid = preset !== null;
  const isGoogleFlow = Boolean(googleAuthUserId);
  const step3Valid = isGoogleFlow
    ? /^[^@]+@[^@]+\.[^@]+$/.test(email)
    : /^[^@]+@[^@]+\.[^@]+$/.test(email) && password.length >= 8;

  async function startGoogle() {
    setErr(null);
    try {
      sessionStorage.setItem("signupWizard", JSON.stringify({
        shopName, slug, phone, address, preset, step: 3,
      }));
      const sb = supabaseBrowser();
      const origin = window.location.origin;
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/signup?provider=google` },
      });
      if (error) throw error;
    } catch (e: any) {
      setErr(e.message ?? "Google sign-in failed");
    }
  }

  async function submitAll() {
    setErr(null); setLoading(true);
    try {
      const res = await fetch("/api/signup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: { name: shopName, slug, phone: phone || undefined, address: address || undefined },
          preset,
          admin: isGoogleFlow
            ? { email, googleAuthUserId }
            : { email, password },
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "create failed");
      sessionStorage.removeItem("signupWizard");
      setDone({ redirectUrl: json.redirectUrl });
    } catch (e: any) {
      setErr(e.message ?? "สมัครไม่สำเร็จ");
    } finally { setLoading(false); }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="card p-8 max-w-md w-full text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-full border border-ink-900 text-ink-900 flex items-center justify-center">
            <Check size={22} strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="h-display text-2xl">สร้างร้านเรียบร้อย</h1>
            <p className="text-sm text-ink-600 mt-2">ขั้นต่อไป: เชื่อม LINE OA ในหน้าตั้งค่า</p>
          </div>
          <a href={done.redirectUrl} className="btn-primary w-full justify-center">
            เข้าหน้าแอดมินของร้าน <ArrowRight size={16} />
          </a>
          <p className="text-xs text-ink-500 pt-2 break-all">URL: <code className="bg-ink-100 px-1.5 py-0.5 rounded text-ink-700">{done.redirectUrl}</code></p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-ink-200">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-ink-900 text-white flex items-center justify-center">
              <CalendarCheck size={16} strokeWidth={2.25} />
            </span>
            <span className="font-semibold tracking-tight text-[15px] text-ink-900">LineBook</span>
          </Link>
          <div className="text-sm text-ink-500">ขั้นที่ {step} / 3</div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-5 pt-10 pb-16">
        <div className="flex gap-1.5 mb-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-ink-900" : "bg-ink-200"}`} />
          ))}
        </div>

        {err && <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

        {step === 1 && (
          <div className="card p-6 space-y-5">
            <div>
              <div className="eyebrow">Step 1 / 3</div>
              <h2 className="h-display text-2xl mt-1">ข้อมูลร้าน</h2>
            </div>
            <Field label="ชื่อร้าน" required>
              <input className="input" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="เช่น Salon Linda" />
            </Field>
            <Field label="URL ของร้าน" required hint="ใช้เป็น subdomain เช่น mysalon.จองคิว.net">
              <div className="flex items-center gap-2">
                <input className="input flex-1" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="mysalon" />
                <span className="text-sm text-ink-500">.จองคิว.net</span>
              </div>
              <div className={`text-xs mt-1.5 ${slugStatus === "ok" ? "text-emerald-700" : slugStatus === "bad" ? "text-red-700" : "text-ink-500"}`}>
                {slugStatus === "checking" ? "กำลังตรวจสอบ..." : slugMsg}
              </div>
            </Field>
            <Field label="เบอร์โทรร้าน (ไม่บังคับ)">
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-123-4567" />
            </Field>
            <Field label="ที่อยู่ (ไม่บังคับ)">
              <textarea className="input" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123/4 ถนน..." />
            </Field>
            <Nav next={() => setStep(2)} nextDisabled={!step1Valid} />
          </div>
        )}

        {step === 2 && (
          <div className="card p-6 space-y-5">
            <div>
              <div className="eyebrow">Step 2 / 3</div>
              <h2 className="h-display text-2xl mt-1">ประเภทร้าน</h2>
              <p className="text-sm text-ink-600 mt-2">เลือกพรีเซท ระบบจะติดตั้งบริการเริ่มต้น เวลา และข้อความให้ แก้ทีหลังได้ทั้งหมด</p>
            </div>
            <div className="space-y-2">
              {PRESETS.map((p) => {
                const active = preset === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPreset(p.key)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${active ? "border-ink-900 bg-ink-50" : "border-ink-200 hover:border-ink-300"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center border ${active ? "border-ink-900 bg-white text-ink-900" : "border-ink-200 bg-white text-ink-600"}`}>
                        {p.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-ink-900">{p.label}</div>
                        <div className="text-sm text-ink-600 mt-0.5">{p.desc}</div>
                      </div>
                      {active && <Check className="text-ink-900 mt-1" size={18} />}
                    </div>
                  </button>
                );
              })}
            </div>
            <Nav back={() => setStep(1)} next={() => setStep(3)} nextDisabled={!step2Valid} />
          </div>
        )}

        {step === 3 && (
          <div className="card p-6 space-y-5">
            <div>
              <div className="eyebrow">Step 3 / 3</div>
              <h2 className="h-display text-2xl mt-1">สร้างบัญชีแอดมิน</h2>
              <p className="text-sm text-ink-600 mt-2">ใช้เข้าหน้าแอดมินของร้าน — เลือกล็อกอินด้วย Google หรือใช้อีเมล + รหัสผ่าน</p>
            </div>

            {!isGoogleFlow ? (
              <>
                <button
                  onClick={startGoogle}
                  className="btn-secondary w-full justify-center gap-2 border-ink-300"
                  type="button"
                >
                  <GoogleG />
                  เข้าสู่ระบบด้วย Google
                </button>

                <div className="flex items-center gap-3 text-xs text-ink-500">
                  <div className="flex-1 h-px bg-ink-200" />
                  หรือใช้อีเมล + รหัสผ่าน
                  <div className="flex-1 h-px bg-ink-200" />
                </div>

                <Field label="Email" required>
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </Field>
                <Field label="รหัสผ่าน" required hint="อย่างน้อย 8 ตัวอักษร">
                  <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </Field>
              </>
            ) : (
              <div className="p-4 rounded-md border border-emerald-200 bg-emerald-50 text-sm text-emerald-900 space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <Check size={16} /> ยืนยันด้วย Google แล้ว
                </div>
                <div className="text-emerald-800/80 break-all">{googleEmail}</div>
              </div>
            )}

            <button onClick={submitAll} disabled={loading || !step3Valid} className="btn-primary w-full justify-center">
              {loading ? <><Loader2 className="animate-spin" size={16} /> กำลังสร้าง...</> : <>สร้างร้านเลย <ArrowRight size={16} /></>}
            </button>
            <button onClick={() => setStep(2)} className="btn-secondary w-full">
              <ChevronLeft size={16} /> ย้อนกลับ
            </button>

            <p className="text-xs text-ink-500 leading-relaxed pt-2">
              เชื่อม LINE OA ของร้านได้หลังสมัครเสร็จ — เข้าหน้า <strong>ตั้งค่า</strong> ในแอดมินคอนโซล
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[13px] font-medium text-ink-800 mb-1.5">
        {label} {required && <span className="text-red-600">*</span>}
      </div>
      {children}
      {hint && <div className="text-xs text-ink-500 mt-1">{hint}</div>}
    </label>
  );
}

function Nav({ back, next, nextDisabled }: { back?: () => void; next: () => void; nextDisabled?: boolean }) {
  return (
    <div className="flex gap-3 pt-2">
      {back && <button onClick={back} className="btn-secondary flex-1"><ChevronLeft size={16} /> ย้อนกลับ</button>}
      <button onClick={next} disabled={nextDisabled} className="btn-primary flex-1 justify-center">
        ต่อไป <ArrowRight size={16} />
      </button>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.2 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.7 29 5 24 5 16.3 5 9.7 9.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43c5 0 9.5-1.7 13-4.6l-6-5C29.2 34.6 26.7 35.5 24 35.5c-5.3 0-9.7-3-11.3-7.4l-6.5 5C9.6 38.5 16.3 43 24 43z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 4.9l6 5C42 33.5 44 29 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
