"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "../_ctx";
import { RefreshCw, Star, Send, ChevronDown, ChevronUp } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────── */
type Review = {
  id: number;
  booking_id: number;
  rating: number;
  comment: string | null;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
  service: { name: string } | null;
  staff: { name: string; nickname: string | null } | null;
  customer: { display_name: string | null; full_name: string | null; picture_url: string | null } | null;
};

/* ─── Page ───────────────────────────────────────────────────── */
export default function ReviewsPage() {
  const { pw } = useAdmin();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterReply, setFilterReply] = useState<"all" | "replied" | "pending">("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [sending, setSending] = useState<number | null>(null);

  const headers = { "x-admin-password": pw, "Content-Type": "application/json" };

  async function reload() {
    setLoading(true);
    const r = await fetch("/api/reviews", { headers });
    if (r.ok) setReviews((await r.json()).reviews ?? []);
    setLoading(false);
  }

  useEffect(() => { reload(); }, [pw]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendReply(id: number) {
    const reply = (drafts[id] ?? "").trim();
    setSending(id);
    const r = await fetch("/api/reviews", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ id, reply: reply || null }),
    });
    if (r.ok) {
      const updated = (await r.json()).review as Review;
      setReviews((prev) => prev.map((rv) => (rv.id === id ? { ...rv, reply: updated.reply, replied_at: updated.replied_at } : rv)));
      setDrafts((d) => { const c = { ...d }; delete c[id]; return c; });
      setOpenId(null);
    }
    setSending(null);
  }

  // Filtering
  const filtered = reviews.filter((r) => {
    if (filterRating && r.rating !== filterRating) return false;
    if (filterReply === "replied" && !r.reply) return false;
    if (filterReply === "pending" && r.reply) return false;
    return true;
  });

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const pendingCount = reviews.filter((r) => !r.reply).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-up">
        <div>
          <div className="eyebrow">Social Proof</div>
          <h1 className="h-display text-2xl sm:text-3xl">รีวิวลูกค้า</h1>
        </div>
        <button onClick={reload} className="btn-secondary shrink-0" disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> รีเฟรช
        </button>
      </div>

      {/* KPI chips */}
      <div className="flex flex-wrap gap-3">
        <div className="chip bg-amber-50 text-amber-700 font-semibold">
          <Star size={13} fill="currentColor" /> {avgRating} เฉลี่ย
        </div>
        <div className="chip bg-white border border-ink-200">รีวิวทั้งหมด: {reviews.length}</div>
        {pendingCount > 0 && (
          <div className="chip bg-red-50 border border-red-200 text-red-600 font-semibold">รอตอบ: {pendingCount}</div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-400 font-semibold">กรอง:</span>
        <div className="flex gap-1">
          {[null, 5, 4, 3, 2, 1].map((r) => (
            <button
              key={r ?? "all"}
              onClick={() => setFilterRating(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${filterRating === r ? "bg-amber-500 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}
            >
              {r === null ? "ทั้งหมด" : `${r} ★`}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "pending", "replied"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterReply(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${filterReply === f ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}
            >
              {{ all: "ทุกรายการ", pending: "รอตอบ", replied: "ตอบแล้ว" }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="card p-10 text-center text-ink-400">
            <RefreshCw className="animate-spin inline" size={20} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center text-ink-400">ไม่มีรีวิวในเงื่อนไขนี้</div>
        ) : (
          filtered.map((rv) => {
            const isOpen = openId === rv.id;
            const customerName = rv.customer?.full_name ?? rv.customer?.display_name ?? "ลูกค้า";
            return (
              <div key={rv.id} className="card overflow-hidden animate-fade-up">
                <div
                  className="p-4 flex items-start gap-3 cursor-pointer hover:bg-ink-50 transition"
                  onClick={() => setOpenId(isOpen ? null : rv.id)}
                >
                  {/* Avatar */}
                  {rv.customer?.picture_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={rv.customer.picture_url} alt="" className="w-9 h-9 rounded-full ring-2 ring-white shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-ink-100 text-ink-700 font-bold flex items-center justify-center shrink-0 text-sm">
                      {customerName[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-ink-800">{customerName}</span>
                      <StarRating rating={rv.rating} />
                      {rv.reply && <span className="chip bg-forest-100 text-forest-700 text-[10px]">ตอบแล้ว</span>}
                      {!rv.reply && <span className="chip bg-amber-50 text-amber-600 text-[10px]">รอตอบ</span>}
                    </div>
                    <div className="text-xs text-ink-400 mt-0.5">
                      {rv.service?.name ?? "—"} · {rv.staff?.nickname ?? rv.staff?.name ?? "—"} ·{" "}
                      {new Date(rv.created_at).toLocaleDateString("th-TH")}
                    </div>
                    {rv.comment && (
                      <p className="text-sm text-ink-700 mt-1.5 line-clamp-2">{rv.comment}</p>
                    )}
                    {rv.reply && (
                      <p className="text-xs text-forest-700 mt-1.5 bg-forest-50 px-2.5 py-1.5 rounded-lg border border-forest-100">
                        <strong>ตอบ:</strong> {rv.reply}
                      </p>
                    )}
                  </div>
                  {isOpen ? <ChevronUp size={16} className="shrink-0 text-ink-400" /> : <ChevronDown size={16} className="shrink-0 text-ink-400" />}
                </div>

                {/* Reply form */}
                {isOpen && (
                  <div className="border-t border-ink-100 p-4 bg-ink-50 space-y-3 animate-fade-up">
                    {rv.comment && (
                      <p className="text-sm text-ink-700 italic bg-white rounded-xl px-3 py-2.5 border border-ink-100">
                        &ldquo;{rv.comment}&rdquo;
                      </p>
                    )}
                    <div>
                      <label className="label text-xs">ตอบรีวิว</label>
                      <textarea
                        rows={2}
                        className="input resize-none text-sm"
                        placeholder="ขอบคุณที่ให้รีวิวนะคะ..."
                        value={drafts[rv.id] ?? rv.reply ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [rv.id]: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => sendReply(rv.id)}
                        className="btn-primary text-sm"
                        disabled={sending === rv.id}
                      >
                        {sending === rv.id ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                        {rv.reply ? "อัปเดตคำตอบ" : "ส่งคำตอบ"}
                      </button>
                      {rv.reply && (
                        <button
                          onClick={() => { setDrafts((d) => ({ ...d, [rv.id]: "" })); sendReply(rv.id); }}
                          className="btn-secondary text-sm text-red-500 hover:bg-red-50"
                          disabled={sending === rv.id}
                        >
                          ลบคำตอบ
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={12}
          className={i < rating ? "text-amber-400" : "text-ink-200"}
          fill={i < rating ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}
