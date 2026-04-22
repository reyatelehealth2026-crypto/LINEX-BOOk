"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowLeft, Check, Loader2 } from "lucide-react";

type Step = 1 | 2 | 3 | 4;
type PresetKey = "salon" | "nail" | "spa";

const PRESETS: { key: PresetKey; num: string; label: string; label_en: string; desc: string; services: number }[] = [
  { key: "salon", num: "01", label: "ร้านเสริมสวย และบาร์เบอร์", label_en: "Salon & Barber", desc: "ตัด ย้อมสี ทรีตเมนต์ สระไดร์", services: 6 },
  { key: "nail",  num: "02", label: "ร้านทำเล็บ",                label_en: "Nail Salon",     desc: "เล็บมือ เล็บเท้า ต่อเล็บ เพ้นท์ลาย",  services: 7 },
  { key: "spa",   num: "03", label: "สปา และร้านนวด",            label_en: "Spa & Massage",  desc: "นวดไทย นวดน้ำมัน อโรม่า สปาหน้า",  services: 7 },
];

const BG = "#faf9f5";
const BORDER = "#e8e6df";
const FG = "#0a0a0a";
const MUTED = "#6a6a6a";

export default function SignupPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ redirectUrl: string; botName?: string } | null>(null);

  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [slugMsg, setSlugMsg] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [preset, setPreset] = useState<PresetKey | null>(null);

  const [accessToken, setAccessToken] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [liffId, setLiffId] = useState("");
  const [verifiedBot, setVerifiedBot] = useState<{ displayName: string; basicId?: string } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); setSlugMsg(""); return; }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/signup/check-slug?slug=${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (json.available) {
          setSlugStatus("ok");
          setSlugMsg(`ใช้ได้ · ${slug}.linebook.app`);
        } else {
          setSlugStatus("bad");
          const reasons: Record<string, string> = {
            length: "ความยาวต้องอยู่ระหว่าง 3–30 ตัวอักษร",
            format: "ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข และขีดกลาง",
            reserved: "เป็นชื่อที่ระบบสงวนไว้",
            taken: "ชื่อนี้ถูกใช้งานแล้ว",
            missing: "กรุณาระบุ URL ของร้าน",
          };
          setSlugMsg(reasons[json.reason] ?? "ไม่สามารถใช้งานได้");
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
      setErr(e.message ?? "ไม่สามารถเชื่อมต่อ LINE ได้");
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
      setErr(e.message ?? "ไม่สามารถสร้างบัญชีได้");
    } finally { setLoading(false); }
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-[#0a0a0a]" style={{ backgroundColor: BG }}>
        <div className="max-w-lg w-full">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#6a6a6a] mb-8">
            § Complete
          </div>
          <h1 className="font-serif font-normal text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.015em]">
            ยินดีต้อนรับ<br />
            <span className="italic text-[#4a4a4a]">สู่ LineBook</span>
          </h1>
          <p className="mt-6 text-[15px] leading-[1.65] text-[#3a3a3a]">
            {done.botName
              ? <>เชื่อมต่อ LINE Official Account <strong className="text-[#0a0a0a]">{done.botName}</strong> เรียบร้อยแล้ว</>
              : "บัญชีของคุณพร้อมใช้งาน"}
          </p>
          <a
            href={done.redirectUrl}
            className="group mt-10 inline-flex items-center gap-2 bg-[#0a0a0a] hover:bg-[#2a2a2a] text-[#faf9f5] px-7 py-3.5 text-[14px] font-medium tracking-tight transition"
          >
            เข้าสู่ระบบจัดการร้าน
            <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
          <div className="mt-8 pt-6 border-t border-[#e8e6df] text-[12px] text-[#6a6a6a] font-mono break-all">
            {done.redirectUrl}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-[#0a0a0a]" style={{ backgroundColor: BG }}>
      <header className="border-b border-[#e8e6df]">
        <div className="max-w-[1280px] mx-auto px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0a0a0a] text-[#faf9f5] flex items-center justify-center text-[10px] font-semibold tracking-wider">
              LB
            </div>
            <span className="font-serif text-[17px] font-semibold tracking-tight">LineBook</span>
          </Link>
          <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-[#6a6a6a]">
            Step {String(step).padStart(2, "0")} / 04
          </div>
        </div>
      </header>

      <div className="max-w-[720px] mx-auto px-8 py-16 md:py-24">
        {/* Progress indicator */}
        <div className="flex gap-2 mb-16">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex-1 h-px" style={{ backgroundColor: n <= step ? FG : BORDER }} />
          ))}
        </div>

        {err && (
          <div className="mb-10 p-5 border border-[#d4a5a5] text-[#7a2a2a] text-[14px]" style={{ backgroundColor: "#fbf2f2" }}>
            {err}
          </div>
        )}

        {step === 1 && (
          <section>
            <StepHead n="01" title="ข้อมูลร้าน" italic="Basic Information" desc="กรอกข้อมูลพื้นฐานเพื่อสร้างบัญชีใหม่สำหรับร้านของคุณ" />
            <div className="mt-14 space-y-10">
              <Field label="ชื่อร้าน" required>
                <input className={inputCls} value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="เช่น Salon Linda" />
              </Field>
              <Field label="URL ของร้าน" required hint="ใช้เป็น subdomain ของระบบ">
                <div className="flex items-stretch border border-[#d8d5cb] focus-within:border-[#0a0a0a] transition">
                  <input
                    className="flex-1 px-4 py-3 bg-transparent text-[15px] placeholder-[#a8a5a0] focus:outline-none"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    placeholder="mysalon"
                  />
                  <div className="px-4 py-3 border-l border-[#d8d5cb] text-[13px] text-[#6a6a6a] font-mono flex items-center" style={{ backgroundColor: "#f4f2ea" }}>
                    .linebook.app
                  </div>
                </div>
                <div
                  className="text-[12px] mt-2 font-mono tracking-wide"
                  style={{ color: slugStatus === "ok" ? "#2e6b3a" : slugStatus === "bad" ? "#8a2a2a" : MUTED }}
                >
                  {slugStatus === "checking" ? "กำลังตรวจสอบ..." : slugMsg || " "}
                </div>
              </Field>
              <Field label="เบอร์โทรร้าน" hint="ไม่บังคับ">
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-123-4567" />
              </Field>
              <Field label="ที่อยู่ร้าน" hint="ไม่บังคับ">
                <textarea className={inputCls} rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123/4 ถนน..." />
              </Field>
            </div>
            <StepNav next={() => setStep(2)} nextDisabled={!step1Valid} />
          </section>
        )}

        {step === 2 && (
          <section>
            <StepHead n="02" title="ประเภทธุรกิจ" italic="Business Type" desc="เลือกพรีเซทเพื่อให้ระบบติดตั้งบริการเริ่มต้น เวลาทำการ และข้อความอัตโนมัติให้ — ปรับแก้ได้ทุกรายละเอียดภายหลัง" />
            <div className="mt-14 space-y-px">
              {PRESETS.map((p) => {
                const selected = preset === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPreset(p.key)}
                    className="w-full text-left py-8 border-t border-[#d8d5cb] transition group"
                    style={{ borderTopColor: selected ? FG : "#d8d5cb" }}
                  >
                    <div className="grid grid-cols-12 gap-4 md:gap-6 items-start">
                      <div className="col-span-1 font-mono text-[11px] tracking-[0.18em]" style={{ color: selected ? FG : MUTED }}>
                        {p.num}
                      </div>
                      <div className="col-span-9 md:col-span-10">
                        <h3 className="font-serif text-[22px] md:text-[28px] font-normal tracking-[-0.01em] leading-[1.1]" style={{ color: selected ? FG : "#2a2a2a" }}>
                          {p.label}
                        </h3>
                        <div className="mt-1 text-[11px] font-mono tracking-[0.1em] uppercase" style={{ color: selected ? "#4a4a4a" : MUTED }}>
                          {p.label_en}
                        </div>
                        <p className="mt-3 text-[14px] text-[#4a4a4a] leading-[1.55]">{p.desc}</p>
                        <div className="mt-3 text-[11px] font-mono uppercase tracking-[0.1em] text-[#8a8a8a]">
                          {p.services} บริการเริ่มต้น
                        </div>
                      </div>
                      <div className="col-span-2 md:col-span-1 flex justify-end pt-2">
                        {selected && <Check size={18} strokeWidth={1.5} className="text-[#0a0a0a]" />}
                      </div>
                    </div>
                  </button>
                );
              })}
              <div className="border-t border-[#d8d5cb]" />
            </div>
            <StepNav back={() => setStep(1)} next={() => setStep(3)} nextDisabled={!step2Valid} />
          </section>
        )}

        {step === 3 && (
          <section>
            <StepHead
              n="03"
              title="เชื่อมต่อ LINE OA"
              italic="Connect LINE"
              desc="สร้าง LINE Official Account และ LIFF App ของร้านก่อน จากนั้นกรอก Channel Access Token, Channel Secret และ LIFF ID เพื่อเชื่อมต่อ"
            />
            <div className="mt-14 space-y-10">
              <Field label="Channel Access Token" required hint="long-lived token">
                <textarea
                  className={`${inputCls} font-mono text-[12px]`}
                  rows={2}
                  value={accessToken}
                  onChange={(e) => { setAccessToken(e.target.value); setVerifiedBot(null); }}
                  placeholder="eyJhbGci..."
                />
              </Field>
              <Field label="Channel Secret" required>
                <input
                  className={`${inputCls} font-mono text-[12px]`}
                  value={channelSecret}
                  onChange={(e) => { setChannelSecret(e.target.value); setVerifiedBot(null); }}
                  placeholder="32-character hex"
                />
              </Field>
              <Field label="LIFF ID" required hint="รูปแบบ 1234567890-abcdefgh">
                <input
                  className={`${inputCls} font-mono text-[12px]`}
                  value={liffId}
                  onChange={(e) => { setLiffId(e.target.value); setVerifiedBot(null); }}
                  placeholder="1234567890-abcdefgh"
                />
              </Field>
              <div>
                <a
                  href="https://developers.line.biz"
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1.5 text-[13px] text-[#4a4a4a] hover:text-[#0a0a0a] underline underline-offset-4 transition"
                >
                  ไปที่ LINE Developers Console
                  <ArrowUpRight size={13} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>
              <button
                onClick={verifyLine}
                disabled={loading || !accessToken || !channelSecret || !liffId}
                className="w-full inline-flex items-center justify-center gap-2 border border-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#faf9f5] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#0a0a0a] text-[#0a0a0a] px-6 py-3 text-[14px] font-medium tracking-tight transition"
              >
                {loading ? <Loader2 className="animate-spin" size={15} /> : null}
                ทดสอบการเชื่อมต่อ
              </button>
              {verifiedBot && (
                <div className="p-5 border border-[#c5d4c5] flex items-start gap-4" style={{ backgroundColor: "#f0f5ee" }}>
                  <Check size={18} strokeWidth={1.5} className="text-[#3a6b3a] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#3a6b3a] mb-1">
                      Verified
                    </div>
                    <div className="font-serif text-[18px] text-[#0a0a0a]">
                      {verifiedBot.displayName}
                    </div>
                    {verifiedBot.basicId && (
                      <div className="text-[12px] font-mono text-[#4a6b4a] mt-0.5">
                        {verifiedBot.basicId}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <StepNav back={() => setStep(2)} next={() => setStep(4)} nextDisabled={!step3Valid} />
          </section>
        )}

        {step === 4 && (
          <section>
            <StepHead n="04" title="สร้างบัญชีผู้ดูแล" italic="Administrator Account" desc="ใช้สำหรับเข้าสู่ระบบจัดการร้านในภายหลัง" />
            <div className="mt-14 space-y-10">
              <Field label="อีเมล" required>
                <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </Field>
              <Field label="รหัสผ่าน" required hint="อย่างน้อย 8 ตัวอักษร">
                <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </Field>
            </div>
            <div className="mt-16 flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center justify-center gap-2 border border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#faf9f5] px-6 py-3 text-[14px] font-medium tracking-tight transition"
              >
                <ArrowLeft size={15} /> ย้อนกลับ
              </button>
              <button
                onClick={submitAll}
                disabled={loading || !step4Valid}
                className="group flex-1 inline-flex items-center justify-center gap-2 bg-[#0a0a0a] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed text-[#faf9f5] px-6 py-3 text-[14px] font-medium tracking-tight transition"
              >
                {loading ? <Loader2 className="animate-spin" size={15} /> : null}
                สร้างบัญชี
                <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

const inputCls =
  "w-full px-4 py-3 bg-transparent border border-[#d8d5cb] text-[#0a0a0a] text-[15px] placeholder-[#a8a5a0] focus:border-[#0a0a0a] focus:outline-none transition";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#6a6a6a]">
          {label}{required && <span className="text-[#8a2a2a] ml-1">*</span>}
        </span>
        {hint && <span className="text-[11px] font-mono text-[#a8a5a0]">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function StepHead({ n, title, italic, desc }: { n: string; title: string; italic?: string; desc?: string }) {
  return (
    <div>
      <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#6a6a6a]">§ {n}</div>
      <h1 className="mt-5 font-serif text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-[-0.015em] text-[#0a0a0a]">
        {title}{italic && <><br /><span className="italic text-[#4a4a4a]">{italic}</span></>}
      </h1>
      {desc && <p className="mt-5 text-[15px] leading-[1.65] text-[#3a3a3a] max-w-xl">{desc}</p>}
    </div>
  );
}

function StepNav({ back, next, nextDisabled }: { back?: () => void; next: () => void; nextDisabled?: boolean }) {
  return (
    <div className="mt-16 flex gap-3">
      {back && (
        <button onClick={back} className="inline-flex items-center justify-center gap-2 border border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#faf9f5] px-6 py-3 text-[14px] font-medium tracking-tight transition">
          <ArrowLeft size={15} /> ย้อนกลับ
        </button>
      )}
      <button
        onClick={next}
        disabled={nextDisabled}
        className={`group flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 text-[14px] font-medium tracking-tight transition ${
          nextDisabled
            ? "border border-[#d8d5cb] text-[#a8a5a0] cursor-not-allowed"
            : "bg-[#0a0a0a] hover:bg-[#2a2a2a] text-[#faf9f5]"
        }`}
      >
        ถัดไป
        {!nextDisabled && <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
      </button>
    </div>
  );
}
