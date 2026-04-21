"use client";
import { useEffect, useState } from "react";
import { useLiff } from "@/components/LiffProvider";
import { RefreshCw, Gift, Star, Copy, Check, ArrowRight, Zap } from "lucide-react";
import { baht } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────── */
type Tier = {
  name: string;
  min_points: number;
  discount_percent: number;
  emoji: string;
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

/* ─── Page ───────────────────────────────────────────────────── */
export default function LoyaltyPage() {
  const { profile } = useLiff();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);
  const [referralInput, setReferralInput] = useState("");
  const [applyingRef, setApplyingRef] = useState(false);
  const [refMsg, setRefMsg] = useState<string | null>(null);

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
    setRedeemMsg(r.ok ? `✅ แลกสำเร็จ! คูปองส่วนลด ${baht(couponValue)} — รหัส: ${d.coupon_code}` : `❌ ${d.error}`);
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
    setRefMsg(r.ok ? "✅ ใช้รหัสสำเร็จ! รับแต้มพิเศษแล้ว" : `❌ ${d.error}`);
    setApplyingRef(false);
    if (r.ok) { setReferralInput(""); reload(); }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-ink-400">
        <RefreshCw className="animate-spin" size={24} />
        <p className="text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center space-y-3">
        <p className="text-red-500">❌ {error}</p>
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

  const TIER_COLORS: Record<string, string> = {
    Bronze: "from-amber-700 to-amber-500",
    Silver: "from-slate-400 to-slate-600",
    Gold: "from-yellow-400 to-amber-400",
    Platinum: "from-violet-400 to-purple-600",
  };
  const gradClass = tier ? (TIER_COLORS[tier.name] ?? "from-linex-400 to-linex-600") : "from-linex-400 to-linex-600";

  return (
    <div className="space-y-5 pb-8">
      {/* ── Tier card ─────────────────────────────────────── */}
      <div className={`rounded-3xl p-5 bg-gradient-to-br ${gradClass} text-white shadow-linex-panel relative overflow-hidden animate-fade-up`}>
        <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
        <div className="relative">
          <div className="text-3xl mb-1">{tier?.emoji ?? "⭐"}</div>
          <div className="text-xs font-semibold opacity-80">ระดับสมาชิก</div>
          <div className="text-2xl font-bold mt-0.5">{tier?.name ?? "สมาชิก"}</div>
          {tier && <div className="text-sm opacity-80 mt-0.5">ส่วนลดประจำ {tier.discount_percent}%</div>}

          {/* Points display */}
          <div className="mt-4 flex items-end gap-2">
            <div>
              <div className="text-xs opacity-70">แต้มคงเหลือ</div>
              <div className="text-4xl font-bold">{data.points.toLocaleString()}</div>
            </div>
            <div className="mb-1.5 opacity-70 text-xs">/ {data.lifetime_points.toLocaleString()} สะสม</div>
          </div>

          {/* Progress bar */}
          {nextTier && (
            <div className="mt-4">
              <div className="flex justify-between text-xs opacity-70 mb-1">
                <span>{tier?.name ?? "สมาชิก"}</span>
                <span>{nextTier.emoji} {nextTier.name} — อีก {data.points_to_next} แต้ม</span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}
          {!nextTier && (
            <div className="mt-3 text-xs opacity-80 font-semibold">🏆 คุณอยู่ในระดับสูงสุดแล้ว!</div>
          )}
        </div>
      </div>

      {/* ── Redeem ────────────────────────────────────────── */}
      <div className="card p-4 space-y-3 animate-fade-up">
        <h2 className="font-semibold flex items-center gap-2 text-ink-800">
          <Gift size={16} className="text-linex-500" /> แลกแต้มรับส่วนลด
        </h2>
        {data.redeemOptions.length === 0 ? (
          <p className="text-sm text-ink-400">ยังไม่มีตัวเลือกแลก — สะสมแต้มเพิ่มก่อนนะคะ</p>
        ) : (
          <div className="space-y-2">
            {data.redeemOptions.map((opt) => {
              const canAfford = data.points >= opt.points_required;
              return (
                <div
                  key={opt.points_required}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition ${canAfford ? "border-linex-200 bg-linex-50" : "border-ink-100 bg-ink-50 opacity-50"}`}
                >
                  <div>
                    <div className="font-semibold text-sm text-ink-800">ส่วนลด {baht(opt.coupon_value)}</div>
                    <div className="text-xs text-ink-400">{opt.points_required.toLocaleString()} แต้ม</div>
                  </div>
                  <button
                    onClick={() => redeem(opt.points_required, opt.coupon_value)}
                    disabled={!canAfford || redeeming === opt.points_required}
                    className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition ${canAfford ? "bg-linex-600 text-white hover:bg-linex-700" : "bg-ink-200 text-ink-400 cursor-not-allowed"}`}
                  >
                    {redeeming === opt.points_required ? <RefreshCw size={13} className="animate-spin inline" /> : "แลก"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {redeemMsg && (
          <div className={`text-sm px-3 py-2 rounded-xl ${redeemMsg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {redeemMsg}
          </div>
        )}
      </div>

      {/* ── Referral ──────────────────────────────────────── */}
      <div className="card p-4 space-y-3 animate-fade-up">
        <h2 className="font-semibold flex items-center gap-2 text-ink-800">
          <Star size={16} className="text-amber-500" /> โค้ดชวนเพื่อน
        </h2>
        <p className="text-xs text-ink-500">แชร์โค้ดให้เพื่อนใหม่ — คุณและเพื่อนรับแต้มพิเศษเพิ่ม</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-ink-100 px-3 py-2 rounded-xl font-mono font-bold text-ink-800 text-center tracking-widest">
            {data.referral_code}
          </code>
          <button onClick={copyReferral} className="w-10 h-10 rounded-xl bg-linex-50 text-linex-600 hover:bg-linex-100 flex items-center justify-center transition">
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* ── Apply referral ────────────────────────────────── */}
      <div className="card p-4 space-y-3 animate-fade-up">
        <h2 className="font-semibold flex items-center gap-2 text-ink-800">
          <Zap size={16} className="text-amber-400" /> ใช้โค้ดชวนเพื่อน
        </h2>
        <p className="text-xs text-ink-500">ถ้าเพื่อนชวนคุณมา — ใส่โค้ดของเพื่อนเพื่อรับแต้มโบนัส</p>
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
            className="glow-btn"
          >
            {applyingRef ? <RefreshCw size={13} className="animate-spin" /> : <ArrowRight size={13} />}
            ใช้
          </button>
        </div>
        {refMsg && (
          <div className={`text-sm px-3 py-2 rounded-xl ${refMsg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {refMsg}
          </div>
        )}
      </div>

      {/* ── How it works ──────────────────────────────────── */}
      <div className="linex-panel p-4 space-y-2 animate-fade-up">
        <h3 className="font-semibold text-sm text-ink-700">🎯 วิธีสะสมแต้ม</h3>
        <ul className="space-y-1 text-xs text-ink-500">
          <li className="flex items-start gap-2"><span className="shrink-0">💚</span> ทุก 100 บาท ที่จอง = 1 แต้ม</li>
          <li className="flex items-start gap-2"><span className="shrink-0">🎂</span> วันเกิด = รับแต้มโบนัสพิเศษ</li>
          <li className="flex items-start gap-2"><span className="shrink-0">👥</span> ชวนเพื่อน = ทั้งคู่รับแต้มโบนัส</li>
          <li className="flex items-start gap-2"><span className="shrink-0">🏆</span> ยิ่งสะสมเยอะ ระดับสูงขึ้น ลดมากขึ้น</li>
        </ul>
      </div>
    </div>
  );
}
