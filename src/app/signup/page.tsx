"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Loader2, Sparkles } from "lucide-react";

type Step = 1 | 2 | 3 | 4;
type PresetKey = "salon" | "nail" | "spa";

const PRESETS: { key: PresetKey; emoji: string; label: string; desc: string; services: number }[] = [
  { key: "salon", emoji: "💇", label: "ร้านเสริมสวย / บาร์เบอร์", desc: "ตัด, สี, ทรีตเมนต์, สระ-ไดร์ (6 บริการ)", services: 6 },
  { key: "nail",  emoji: "💅", label: "ร้านทำเล็บ",               desc: "มือ-เท้า, เจล, ต่อเล็บ, เพ้นท์ (7 บริการ)",  services: 7 },
  { key: "spa",   emoji: "🌿", label: "สปา / ร้านนวด",            desc: "ไทย, น้ำมัน, อโรม่า, สปาหน้า (7 บริการ)",  services: 7 },
];

export default function SignupPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ redirectUrl: string; botName?: string } | null>(null);

  // Step 1 — shop info
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [slugMsg, setSlugMsg] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Step 2 — preset
  const [preset, setPreset] = useState<PresetKey | null>(null);

  // Step 3 — LINE
  const [accessToken, setAccessToken] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [liffId, setLiffId] = useState("");
  const [verifiedBot, setVerifiedBot] = useState<{ displayName: string; basicId?: string } | null>(null);

  // Step 4 — admin
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // slug availability (debounced)
  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); setSlugMsg(""); return; }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/signup/check-slug?slug=${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (json.available) {
          setSlugStatus("ok");
          setSlugMsg(`✓ ใช้ได้ — ${slug}.linebook.app`);
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
  const step3Valid = !!verifiedBot;
  const step4Valid = /^[^@]+@[^@]+\.[^@]+$/.test(email) && password.length >= 8;

  async function verifyLine() {
    setErr(null); setLoading(true);
    try {
      const res = await fetch("/api/signup/verify-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, channelSecret, liffId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "verify failed");
      setVerifiedBot({ displayName: json.bot.displayName, basicId: json.bot.basicId });
    } catch (e: any) {
      setErr(e.message ?? "ตรวจสอบ LINE ไม่สำเร็จ");
      setVerifiedBot(null);
    } finally { setLoading(false); }
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
          line: { accessToken, channelSecret, liffId },
          admin: { email, password },
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "create failed");
      setDone({ redirectUrl: json.redirectUrl, botName: json.bot?.displayName });
    } catch (e: any) {
      setErr(e.message ?? "สมัครไม่สำเร็จ");
    } finally { setLoading(false); }
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="linex-panel p-8 max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-3xl bg-linex-600 text-white flex items-center justify-center text-2xl">✨</div>
          <h1 className="linex-title text-2xl">สร้างร้านเรียบร้อย!</h1>
          <p className="text-sm text-ink-600">
            {done.botName ? <>เชื่อม LINE OA <strong>{done.botName}</strong> แล้ว</> : "พร้อมใช้งาน"}
          </p>
          <a href={done.redirectUrl} className="glow-btn w-full justify-center">เข้าหน้าแอดมินของร้าน →</a>
          <p className="text-xs text-ink-400 pt-2">URL: <code className="bg-ink-100 px-1.5 py-0.5 rounded">{done.redirectUrl}</code></p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative">
      <div className="absolute inset-0 mesh-bg opacity-60 pointer-events-none" />
      <header className="relative z-10 max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="w-8 h-8 rounded-2xl bg-linex-600 text-white flex items-center justify-center text-sm shadow-linex-glow">💚</span>
          <span className="grad-text tracking-tight">LineBook</span>
        </Link>
        <div className="text-sm text-ink-500">ขั้นที่ {step} / 4</div>
      </header>

      <div className="relative z-10 max-w-xl mx-auto px-5 pb-12">
        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-linex-600" : "bg-ink-200"}`} />
          ))}
        </div>

        {err && <div className="mb-4 p-3 rounded-lg bg-accent-rose/10 text-accent-rose text-sm">{err}</div>}

        {step === 1 && (
          <div className="linex-panel p-6 space-y-4">
            <div>
              <div className="linex-kicker">Step 1 / 4</div>
              <h2 className="linex-title text-2xl mt-1">ข้อมูลร้าน</h2>
            </div>
            <Field label="ชื่อร้าน" required>
              <input className="input" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="เช่น Salon Linda" />
            </Field>
            <Field label="URL ของร้าน" required hint="ใช้เป็น subdomain เช่น mysalon.linebook.app">
              <div className="flex items-center gap-2">
                <input className="input flex-1" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="mysalon" />
                <span className="text-sm text-ink-500">.linebook.app</span>
              </div>
              <div className={`text-xs mt-1 ${slugStatus === "ok" ? "text-accent-green" : slugStatus === "bad" ? "text-accent-rose" : "text-ink-400"}`}>
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
          <div className="linex-panel p-6 space-y-4">
            <div>
              <div className="linex-kicker">Step 2 / 4</div>
              <h2 className="linex-title text-2xl mt-1">ประเภทร้าน</h2>
              <p className="text-sm text-ink-600 mt-1">เลือกพรีเซท ระบบจะติดตั้งบริการเริ่มต้น เวลา และข้อความให้ — แก้ทีหลังได้ทั้งหมด</p>
            </div>
            <div className="space-y-3">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition ${preset === p.key ? "border-linex-600 bg-linex-600/5" : "border-ink-100 hover:border-ink-200"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{p.emoji}</div>
                    <div className="flex-1">
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-sm text-ink-600 mt-0.5">{p.desc}</div>
                    </div>
                    {preset === p.key && <Check className="text-linex-600" size={22} />}
                  </div>
                </button>
              ))}
            </div>
            <Nav back={() => setStep(1)} next={() => setStep(3)} nextDisabled={!step2Valid} />
          </div>
        )}

        {step === 3 && (
          <div className="linex-panel p-6 space-y-4">
            <div>
              <div className="linex-kicker">Step 3 / 4</div>
              <h2 className="linex-title text-2xl mt-1">เชื่อม LINE OA</h2>
              <p className="text-sm text-ink-600 mt-1">
                สร้าง LINE Official Account + LIFF App ของร้านก่อน แล้วกรอก token / secret / LIFF ID มาที่นี่ <br/>
                <a className="text-linex-600 underline text-xs" href="https://developers.line.biz" target="_blank" rel="noreferrer">LINE Developers Console ↗</a>
              </p>
            </div>
            <Field label="Channel Access Token (long-lived)" required>
              <textarea className="input font-mono text-xs" rows={2} value={accessToken} onChange={(e) => { setAccessToken(e.target.value); setVerifiedBot(null); }} placeholder="eyJhbGci..." />
            </Field>
            <Field label="Channel Secret" required>
              <input className="input font-mono text-xs" value={channelSecret} onChange={(e) => { setChannelSecret(e.target.value); setVerifiedBot(null); }} placeholder="32-char hex" />
            </Field>
            <Field label="LIFF ID" required hint="เช่น 1234567890-abcdefgh">
              <input className="input font-mono text-xs" value={liffId} onChange={(e) => { setLiffId(e.target.value); setVerifiedBot(null); }} placeholder="1234567890-abcdefgh" />
            </Field>
            <button onClick={verifyLine} disabled={loading || !accessToken || !channelSecret || !liffId} className="btn-secondary w-full">
              {loading ? <Loader2 className="animate-spin inline mr-1" size={16} /> : <Sparkles className="inline mr-1" size={16} />}
              ทดสอบการเชื่อมต่อ
            </button>
            {verifiedBot && (
              <div className="p-3 rounded-lg bg-accent-green/10 text-sm">
                ✓ เชื่อมต่อสำเร็จ — <strong>{verifiedBot.displayName}</strong>
                {verifiedBot.basicId && <span className="text-ink-500 ml-1">({verifiedBot.basicId})</span>}
              </div>
            )}
            <Nav back={() => setStep(2)} next={() => setStep(4)} nextDisabled={!step3Valid} />
          </div>
        )}

        {step === 4 && (
          <div className="linex-panel p-6 space-y-4">
            <div>
              <div className="linex-kicker">Step 4 / 4</div>
              <h2 className="linex-title text-2xl mt-1">สร้างบัญชีแอดมิน</h2>
              <p className="text-sm text-ink-600 mt-1">ใช้เข้าหน้าแอดมินของร้าน</p>
            </div>
            <Field label="Email" required>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            <Field label="รหัสผ่าน" required hint="อย่างน้อย 8 ตัวอักษร">
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            <button onClick={submitAll} disabled={loading || !step4Valid} className="glow-btn w-full justify-center">
              {loading ? <><Loader2 className="animate-spin inline mr-1" size={16} /> กำลังสร้าง...</> : "สร้างร้านเลย"}
            </button>
            <button onClick={() => setStep(3)} className="btn-secondary w-full">
              <ChevronLeft size={16} className="inline mr-1" /> ย้อนกลับ
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-ink-800 mb-1">
        {label} {required && <span className="text-accent-rose">*</span>}
      </div>
      {children}
      {hint && <div className="text-xs text-ink-400 mt-1">{hint}</div>}
    </label>
  );
}

function Nav({ back, next, nextDisabled }: { back?: () => void; next: () => void; nextDisabled?: boolean }) {
  return (
    <div className="flex gap-3 pt-2">
      {back && <button onClick={back} className="btn-secondary flex-1"><ChevronLeft size={16} className="inline mr-1" /> ย้อนกลับ</button>}
      <button onClick={next} disabled={nextDisabled} className={`glow-btn flex-1 justify-center ${nextDisabled ? "opacity-50 cursor-not-allowed" : ""}`}>ต่อไป →</button>
    </div>
  );
}
