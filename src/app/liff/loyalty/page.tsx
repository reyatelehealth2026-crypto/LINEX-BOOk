"use client";
import { useEffect, useState } from "react";
import { useLiff } from "@/components/LiffProvider";
import {
  RefreshCw,
  Gift,
  Star,
  Copy,
  Check,
  ArrowRight,
  Zap,
  Medal,
  Crown,
  AlertCircle,
  X,
} from "lucide-react";
import { baht } from "@/lib/utils";

type Tier = {
  name: string;
  min_points: number;
  discount_percent: number;
  emoji?: string;
};

type LoyaltyData = {
  customer_id: number;
  points: number;
  lifetime_points: number;
  tier: Tier | null;
  next_tier: Tier | null;
  points_to_next: number;
  referral_code: string;
  redeemOptions: { points_required: number; coupon_value: number }[];
};

const TIER_STYLES: Record<string, { bg: string; fg: string; icon: React.ReactNode }> = {
  Bronze:   { bg: "bg-[#78350f]", fg: "text-white", icon: <Medal size={18} /> },
  Silver:   { bg: "bg-[#475569]", fg: "text-white", icon: <Medal size={18} /> },
  Gold:     { bg: "bg-[#713f12]", fg: "text-white", icon: <Medal size={18} /> },
  Platinum: { bg: "bg-ink-900",   fg: "text-white", icon: <Crown size={18} /> },
};

export default function LoyaltyPage() {
  const { profile } = useLiff();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [referralInput, setReferralInput] = useState("");
  const [applyingRef, setApplyingRef] = useState(false);
  const [refMsg, setRefMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function reload() {
    if (!profile?.userId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/loyalty?lineUserId=${profile.userId}`);
      if (!r.ok) throw new Error((await r.json()).error ?? "โหลดข้อมูลไม่สำเร็จ");
      setData(await r.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [profile?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  function copyReferral() {
    if (!data) return;
    navigator.clipboard.writeText(data.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function redeem(pointsRequired: number, couponValue: number) {
    if (!data || !profile?.userId) return;
    setRedeeming(pointsRequired);
    setRedeemMsg(null);
    const r = await fetch("/api/loyalty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "redeem", lineUserId: profile.userId, points_required: pointsRequired }),
    });
    const d = await r.json();
    setRedeemMsg(r.ok
      ? { ok: true,  text: `แลกสำเร็จ — คูปองส่วนลด ${baht(couponValue)} รหัส ${d.coupon_code}` }
      : { ok: false, text: d.error ?? "แลกไม่สำเร็จ" });
    setRedeeming(null);
    if (r.ok) reload();
  }

  async function applyReferral() {
    if (!profile?.userId || !referralInput.trim()) return;
    setApplyingRef(true);
    setRefMsg(null);
    const r = await fetch("/api/loyalty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "referral", lineUserId: profile.userId, referral_code: referralInput.trim().toUpperCase() }),
    });
    const d = await r.json();
    setRefMsg(r.ok
      ? { ok: true,  text: "ใช้รหัสสำเร็จ — รับแต้มพิเศษแล้ว" }
      : { ok: false, text: d.error ?? "ใช้รหัสไม่สำเร็จ" });
    setApplyingRef(false);
    if (r.ok) { setReferralInput(""); reload(); }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-ink-500">
        <RefreshCw className="animate-spin" size={20} />
        <p className="text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center space-y-3">
        <div className="mx-auto w-10 h-10 rounded-md border border-red-200 bg-red-50 text-red-700 flex items-center justify-center">
          <AlertCircle size={18} />
        </div>
        <p className="text-sm text-ink-700">{error}</p>
        <button onClick={reload} className="btn-secondary">ลองอีกครั้ง</button>
      </div>
    );
  }

  if (!data) return null;

  const tier = data.tier;
  const nextTier = data.next_tier;
  const progressPct = nextTier
    ? Math.min(100, ((data.lifetime_points - (tier?.min_points ?? 0)) / (nextTier.min_points - (tier?.min_points ?? 0))) * 100)
    : 100;

  const tierStyle = tier ? (TIER_STYLES[tier.name] ?? { bg: "bg-ink-900", fg: "text-white", icon: <Star size={18} /> })
                         : { bg: "bg-ink-900", fg: "text-white", icon: <Star size={18} /> };

  return (
    <div className="space-y-4 pb-8">
      <section className={`rounded-xl p-5 ${tierStyle.bg} ${tierStyle.fg} animate-fade-up`}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] opacity-80">
          <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">{tierStyle.icon}</span>
          ระดับสมาชิก
        </div>
        <div className="text-2xl font-semibold mt-2">{tier?.name ?? "สมาชิก"}</div>
        {tier && <div className="text-sm opacity-80 mt-0.5">ส่วนลดประจำ {tier.discount_percent}%</div>}

        <div className="mt-5 flex items-end gap-2">
          <div>
            <div className="text-xs opacity-70">แต้มคงเหลือ</div>
            <div className="text-3xl font-semibold tracking-tight">{data.points.toLocaleString()}</div>
          </div>
          <div className="mb-1 opacity-70 text-xs">/ {data.lifetime_points.toLocaleString()} สะสม</div>
        </div>

        {nextTier && (
          <div className="mt-4">
            <div className="flex justify-between text-xs opacity-70 mb-1.5">
              <span>{tier?.name ?? "สมาชิก"}</span>
              <span>{nextTier.name} — อีก {data.points_to_next} แต้ม</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-[width]" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
        {!nextTier && (
          <div className="mt-3 text-xs opacity-80">คุณอยู่ในระดับสูงสุดแล้ว</div>
        )}
      </section>

      <section className="card p-4 space-y-3 animate-fade-up">
        <h2 className="font-semibold flex items-center gap-2 text-ink-900 text-[14px]">
          <Gift size={15} className="text-ink-700" /> แลกแต้มรับส่วนลด
        </h2>
        {data.redeemOptions.length === 0 ? (
          <p className="text-sm text-ink-500">ยังไม่มีตัวเลือกแลก — สะสมแต้มเพิ่มก่อน</p>
        ) : (
          <div className="divide-y divide-ink-100">
            {data.redeemOptions.map((opt) => {
              const canAfford = data.points >= opt.points_required;
              return (
                <div key={opt.points_required} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <div className="font-semibold text-sm text-ink-900">ส่วนลด {baht(opt.coupon_value)}</div>
                    <div className="text-xs text-ink-500 mt-0.5">{opt.points_required.toLocaleString()} แต้ม</div>
                  </div>
                  <button
                    onClick={() => redeem(opt.points_required, opt.coupon_value)}
                    disabled={!canAfford || redeeming === opt.points_required}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${canAfford ? "bg-ink-900 text-white hover:bg-ink-800" : "bg-ink-100 text-ink-400 cursor-not-allowed"}`}
                  >
                    {redeeming === opt.points_required ? <RefreshCw size={13} className="animate-spin" /> : "แลก"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {redeemMsg && (
          <div className={`text-sm px-3 py-2 rounded-md border flex items-start gap-2 ${redeemMsg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-800"}`}>
            {redeemMsg.ok ? <Check size={15} className="mt-0.5 shrink-0" /> : <X size={15} className="mt-0.5 shrink-0" />}
            <span>{redeemMsg.text}</span>
          </div>
        )}
      </section>

      <section className="card p-4 space-y-3 animate-fade-up">
        <h2 className="font-semibold flex items-center gap-2 text-ink-900 text-[14px]">
          <Star size={15} className="text-ink-700" /> โค้ดชวนเพื่อน
        </h2>
        <p className="text-xs text-ink-500">แชร์โค้ดให้เพื่อนใหม่ คุณและเพื่อนรับแต้มพิเศษเพิ่ม</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-ink-50 border border-ink-200 px-3 py-2 rounded-md font-mono font-semibold text-ink-900 text-center tracking-widest">
            {data.referral_code}
          </code>
          <button onClick={copyReferral} className="w-10 h-10 rounded-md border border-ink-200 bg-white text-ink-700 hover:bg-ink-50 flex items-center justify-center transition-colors">
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
      </section>

      <section className="card p-4 space-y-3 animate-fade-up">
        <h2 className="font-semibold flex items-center gap-2 text-ink-900 text-[14px]">
          <Zap size={15} className="text-ink-700" /> ใช้โค้ดชวนเพื่อน
        </h2>
        <p className="text-xs text-ink-500">ถ้าเพื่อนชวนคุณมา ใส่โค้ดของเพื่อนเพื่อรับแต้มโบนัส</p>
        <div className="flex gap-2">
          <input
            className="input flex-1 uppercase tracking-widest font-mono"
            placeholder="XXXXXX"
            value={referralInput}
            onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
            maxLength={10}
          />
          <button
            onClick={applyReferral}
            disabled={!referralInput.trim() || applyingRef}
            className="btn-primary"
          >
            {applyingRef ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            ใช้
          </button>
        </div>
        {refMsg && (
          <div className={`text-sm px-3 py-2 rounded-md border flex items-start gap-2 ${refMsg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-800"}`}>
            {refMsg.ok ? <Check size={15} className="mt-0.5 shrink-0" /> : <X size={15} className="mt-0.5 shrink-0" />}
            <span>{refMsg.text}</span>
          </div>
        )}
      </section>

      <section className="card-muted p-4 space-y-2 animate-fade-up">
        <h3 className="font-semibold text-sm text-ink-900">วิธีสะสมแต้ม</h3>
        <ul className="space-y-1.5 text-xs text-ink-600">
          <li className="flex items-start gap-2"><span className="mt-1 w-1 h-1 rounded-full bg-ink-400 shrink-0" /> ทุก 100 บาทที่จอง = 1 แต้ม</li>
          <li className="flex items-start gap-2"><span className="mt-1 w-1 h-1 rounded-full bg-ink-400 shrink-0" /> วันเกิดรับแต้มโบนัสพิเศษ</li>
          <li className="flex items-start gap-2"><span className="mt-1 w-1 h-1 rounded-full bg-ink-400 shrink-0" /> ชวนเพื่อน — ทั้งคู่รับแต้มโบนัส</li>
          <li className="flex items-start gap-2"><span className="mt-1 w-1 h-1 rounded-full bg-ink-400 shrink-0" /> ยิ่งสะสมเยอะ ระดับสูงขึ้น ลดมากขึ้น</li>
        </ul>
      </section>
    </div>
  );
}
