"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowLeft, Check, Loader2, Scissors, Sparkle, Leaf, CircleCheck,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;
type PresetKey = "salon" | "nail" | "spa";

const PRESETS: {
  key: PresetKey;
  icon: React.ReactNode;
  label: string;
  desc: string;
  services: number;
}[] = [
  { key: "salon", icon: <Scissors size={20} />, label: "ร้านเสริมสวย / บาร์เบอร์", desc: "ตัด ย้อมสี ทรีตเมนต์ สระไดร์", services: 6 },
  { key: "nail",  icon: <Sparkle size={20} />,  label: "ร้านทำเล็บ",              desc: "เล็บมือ เล็บเท้า ต่อเล็บ เพ้นท์ลาย",  services: 7 },
  { key: "spa",   icon: <Leaf size={20} />,     label: "สปา / ร้านนวด",           desc: "นวดไทย นวดน้ำมัน อโรม่า สปาหน้า",  services: 7 },
];

export default function SignupPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ redirectUrl: string; botName?: string } | null>(null);

  // Step 1
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [slugMsg, setSlugMsg] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Step 2
  const [preset, setPreset] = useState<PresetKey | null>(null);

  // Step 3
  const [accessToken, setAccessToken] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [liffId, setLiffId] = useState("");
  const [verifiedBot, setVerifiedBot] = useState<{ displayName: string; basicId?: string } | null>(null);

  // Step 4
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
      <main className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="border border-slate-200 rounded-lg p-8">
            <div className="w-10 h-10 rounded-md bg-slate-900 text-white flex items-center justify-center mb-6">
              <CircleCheck size={20} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              สร้างบัญชีเรียบร้อย
            </h1>
            <p className="mt-3 text-slate-600 leading-relaxed">
              {done.botName
                ? <>เชื่อมต่อ LINE Official Account <strong className="text-slate-900">{done.botName}</strong> สำเร็จ</>
                : "บัญชีพร้อมใช้งาน"}
            </p>
            <a
              href={done.redirectUrl}
              className="mt-6 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-md font-medium transition w-full justify-center"
            >
              เข้าสู่ระบบของร้าน
              <ArrowRight size={16} />
            </a>
            <p className="mt-4 text-xs text-slate-500 break-all">
              URL: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{done.redirectUrl}</code>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold tracking-tight">
              LB
            </div>
            <span className="font-semibold tracking-tight text-[15px]">LineBook</span>
          </Link>
          <div className="text-sm text-slate-500">ขั้นที่ {step} จาก 4</div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="flex gap-2 mb-10">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full transition ${n <= step ? "bg-slate-900" : "bg-slate-200"}`}
            />
          ))}
        </div>

        {err && (
          <div className="mb-8 p-4 border border-red-200 bg-red-50 text-red-800 rounded-md text-sm">
            {err}
          </div>
        )}

        {step === 1 && (
          <section>
            <StepHead n={1} title="ข้อมูลร้าน" desc="กรอกข้อมูลพื้นฐานเพื่อสร้างบัญชีใหม่" />
            <div className="mt-10 space-y-6">
              <Field label="ชื่อร้าน" required>
                <input
                  className={inputCls}
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="เช่น Salon Linda"
                />
              </Field>
              <Field label="URL ของร้าน" required hint="ใช้เป็น subdomain ของระบบ">
                <div className="flex items-center">
                  <input
                    className={`${inputCls} rounded-r-none`}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    placeholder="mysalon"
                  />
                  <div className="px-3 py-2.5 border border-l-0 border-slate-300 bg-slate-50 text-slate-600 text-sm rounded-r-md whitespace-nowrap">
                    .linebook.app
                  </div>
                </div>
                <div className={`text-xs mt-1.5 ${slugStatus === "ok" ? "text-green-700" : slugStatus === "bad" ? "text-red-700" : "text-slate-500"}`}>
                  {slugStatus === "checking" ? "กำลังตรวจสอบ..." : slugMsg || " "}
                </div>
              </Field>
              <Field label="เบอร์โทรร้าน" hint="ไม่บังคับ">
                <input
                  className={inputCls}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="02-123-4567"
                />
              </Field>
              <Field label="ที่อยู่ร้าน" hint="ไม่บังคับ">
                <textarea
                  className={inputCls}
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123/4 ถนน..."
                />
              </Field>
            </div>
            <StepNav next={() => setStep(2)} nextDisabled={!step1Valid} />
          </section>
        )}

        {step === 2 && (
          <section>
            <StepHead n={2} title="ประเภทธุรกิจ" desc="เลือกพรีเซทเพื่อให้ระบบติดตั้งบริการเริ่มต้นให้อัตโนมัติ ปรับแก้ได้ทั้งหมดภายหลัง" />
            <div className="mt-10 space-y-3">
              {PRESETS.map((p) => {
                const selected = preset === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPreset(p.key)}
                    className={`w-full text-left p-5 rounded-md border transition ${
                      selected
                        ? "border-slate-900 ring-1 ring-slate-900"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-md border flex items-center justify-center shrink-0 ${
                        selected ? "border-slate-900 text-slate-900" : "border-slate-200 text-slate-700"
                      }`}>
                        {p.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900">{p.label}</div>
                        <div className="text-sm text-slate-600 mt-1">{p.desc}</div>
                        <div className="text-xs text-slate-500 mt-2 uppercase tracking-wider">{p.services} บริการเริ่มต้น</div>
                      </div>
                      {selected && <Check size={20} className="text-slate-900 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <StepNav back={() => setStep(1)} next={() => setStep(3)} nextDisabled={!step2Valid} />
          </section>
        )}

        {step === 3 && (
          <section>
            <StepHead
              n={3}
              title="เชื่อมต่อ LINE Official Account"
              desc="ต้องสร้าง LINE OA และ LIFF App ของร้านก่อน จากนั้นกรอก Channel Token Channel Secret และ LIFF ID"
            />
            <div className="mt-10 space-y-6">
              <Field label="Channel Access Token (long-lived)" required>
                <textarea
                  className={`${inputCls} font-mono text-xs`}
                  rows={2}
                  value={accessToken}
                  onChange={(e) => { setAccessToken(e.target.value); setVerifiedBot(null); }}
                  placeholder="eyJhbGci..."
                />
              </Field>
              <Field label="Channel Secret" required>
                <input
                  className={`${inputCls} font-mono text-xs`}
                  value={channelSecret}
                  onChange={(e) => { setChannelSecret(e.target.value); setVerifiedBot(null); }}
                  placeholder="32-character hex"
                />
              </Field>
              <Field label="LIFF ID" required hint="รูปแบบ 1234567890-abcdefgh">
                <input
                  className={`${inputCls} font-mono text-xs`}
                  value={liffId}
                  onChange={(e) => { setLiffId(e.target.value); setVerifiedBot(null); }}
                  placeholder="1234567890-abcdefgh"
                />
              </Field>
              <div className="pt-2">
                <a
                  href="https://developers.line.biz"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-4"
                >
                  ไปที่ LINE Developers Console
                </a>
              </div>
              <button
                onClick={verifyLine}
                disabled={loading || !accessToken || !channelSecret || !liffId}
                className="w-full inline-flex items-center justify-center gap-2 border border-slate-300 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 px-5 py-2.5 rounded-md font-medium transition"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                ทดสอบการเชื่อมต่อ
              </button>
              {verifiedBot && (
                <div className="p-4 border border-green-200 bg-green-50 rounded-md text-sm flex items-start gap-3">
                  <CircleCheck size={18} className="text-green-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-900">เชื่อมต่อสำเร็จ</div>
                    <div className="text-green-800 mt-0.5">
                      {verifiedBot.displayName}
                      {verifiedBot.basicId && <span className="text-green-700"> · {verifiedBot.basicId}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <StepNav back={() => setStep(2)} next={() => setStep(4)} nextDisabled={!step3Valid} />
          </section>
        )}

        {step === 4 && (
          <section>
            <StepHead n={4} title="สร้างบัญชีผู้ดูแลระบบ" desc="ใช้เข้าสู่ระบบจัดการร้าน" />
            <div className="mt-10 space-y-6">
              <Field label="อีเมล" required>
                <input
                  className={inputCls}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="รหัสผ่าน" required hint="อย่างน้อย 8 ตัวอักษร">
                <input
                  className={inputCls}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            </div>
            <div className="mt-10 flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center justify-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-900 px-5 py-2.5 rounded-md font-medium transition"
              >
                <ArrowLeft size={16} /> ย้อนกลับ
              </button>
              <button
                onClick={submitAll}
                disabled={loading || !step4Valid}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-md font-medium transition"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                สร้างบัญชี
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

const inputCls =
  "w-full px-3 py-2.5 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none transition";

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-900">
          {label}
          {required && <span className="text-red-600 ml-0.5">*</span>}
        </span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function StepHead({ n, title, desc }: { n: number; title: string; desc?: string }) {
  return (
    <div>
      <div className="text-xs font-mono text-slate-500">ขั้นที่ 0{n}</div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {desc && <p className="mt-3 text-slate-600 leading-relaxed">{desc}</p>}
    </div>
  );
}

function StepNav({
  back, next, nextDisabled,
}: { back?: () => void; next: () => void; nextDisabled?: boolean }) {
  return (
    <div className="mt-10 flex gap-3">
      {back && (
        <button
          onClick={back}
          className="inline-flex items-center justify-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-900 px-5 py-2.5 rounded-md font-medium transition"
        >
          <ArrowLeft size={16} /> ย้อนกลับ
        </button>
      )}
      <button
        onClick={next}
        disabled={nextDisabled}
        className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md font-medium transition ${
          nextDisabled
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-slate-900 hover:bg-slate-800 text-white"
        }`}
      >
        ถัดไป <ArrowRight size={16} />
      </button>
    </div>
  );
}
