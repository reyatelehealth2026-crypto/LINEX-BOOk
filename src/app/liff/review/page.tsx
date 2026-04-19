"use client";
import { useEffect, useState } from "react";
import { useLiff } from "@/components/LiffProvider";
import { useI18n } from "@/lib/i18n";
import { useRouter, useSearchParams } from "next/navigation";
import { Star, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ReviewPage() {
  const { profile } = useLiff();
  const { t, lang } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const bookingId = sp.get("booking_id");

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingReview, setExistingReview] = useState<{ rating: number; comment: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !bookingId) { setLoading(false); return; }
    // Check if already reviewed
    fetch(`/api/reviews?booking_id=${bookingId}`)
      .then(r => r.json())
      .then(d => {
        if (d.review) {
          setExistingReview({ rating: d.review.rating, comment: d.review.comment });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile, bookingId]);

  async function submit() {
    if (!profile || !bookingId || rating === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: profile.userId,
          bookingId: Number(bookingId),
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.error === "already_reviewed") {
          setError(lang === "en" ? "You've already reviewed this booking." : "คุณได้รีวิวคิวนี้ไปแล้ว");
        } else {
          setError(d.error ?? "Error");
        }
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="text-center text-neutral-500 py-8">{t("common.loading")}</div>;
  }

  if (!bookingId) {
    return (
      <div className="card p-8 text-center text-neutral-500">
        {lang === "en" ? "No booking specified." : "ไม่พบข้อมูลการจอง"}
      </div>
    );
  }

  if (existingReview) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="btn-ghost !px-2 inline-flex items-center gap-1">
          <ArrowLeft size={16} /> {t("common.back")}
        </button>
        <div className="card p-6 text-center space-y-3">
          <CheckCircle2 size={48} className="mx-auto text-brand-500" />
          <h2 className="text-lg font-bold">{lang === "en" ? "Already reviewed" : "รีวิวแล้ว"}</h2>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={24} className={i <= existingReview.rating ? "fill-yellow-400 text-yellow-400" : "text-neutral-300"} />
            ))}
          </div>
          {existingReview.comment && <p className="text-neutral-600 text-sm">"{existingReview.comment}"</p>}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="card p-6 text-center space-y-3">
          <CheckCircle2 size={48} className="mx-auto text-brand-500" />
          <h2 className="text-lg font-bold">{lang === "en" ? "Thank you for your review!" : "ขอบคุณสำหรับรีวิว!"}</h2>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={24} className={i <= rating ? "fill-yellow-400 text-yellow-400" : "text-neutral-300"} />
            ))}
          </div>
          <button
            onClick={() => router.push("/liff/booking")}
            className="btn-primary mt-4"
          >
            📅 {lang === "en" ? "Book again" : "จองคิวอีกครั้ง"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="btn-ghost !px-2 inline-flex items-center gap-1">
        <ArrowLeft size={16} /> {t("common.back")}
      </button>

      <h1 className="text-xl font-bold">{lang === "en" ? "Rate your experience" : "ให้คะแนนประสบการณ์"}</h1>

      <div className="card p-6 space-y-6">
        {/* Star Rating */}
        <div className="text-center space-y-2">
          <p className="text-sm text-neutral-500">{lang === "en" ? "How was your visit?" : "บริการเป็นอย่างไรบ้าง?"}</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform active:scale-90"
              >
                <Star
                  size={40}
                  className={
                    i <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-neutral-300 hover:text-yellow-300"
                  }
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-neutral-500">
              {rating === 1 && (lang === "en" ? "Poor" : "แย่")}
              {rating === 2 && (lang === "en" ? "Fair" : "พอใช้")}
              {rating === 3 && (lang === "en" ? "Good" : "ดี")}
              {rating === 4 && (lang === "en" ? "Very good" : "ดีมาก")}
              {rating === 5 && (lang === "en" ? "Excellent" : "ยอดเยี่ยม")}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <textarea
            className="input"
            placeholder={lang === "en" ? "Any feedback? (optional)" : "มีข้อเสนอแนะไหม? (ไม่บังคับ)"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className="text-xs text-neutral-400 text-right mt-1">{comment.length}/500</div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {/* Submit */}
        <button
          disabled={rating === 0 || submitting}
          onClick={submit}
          className="btn-primary w-full disabled:opacity-50"
        >
          {submitting ? t("common.loading") : (lang === "en" ? "Submit review" : "ส่งรีวิว")}
        </button>
      </div>
    </div>
  );
}
