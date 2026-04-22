"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Save } from "lucide-react";

type ShopDetail = {
  id: number;
  slug: string;
  name: string;
  timezone: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  business_type: string | null;
  line_oa_id: string | null;
  liff_id: string | null;
  has_access_token: boolean;
  has_channel_secret: boolean;
  onboarding_status: string;
  theme_id: string | null;
  points_per_baht: number;
};

type Stats = { admin_count: number; booking_count: number };

export default function SuperShopPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Editable form state (only loaded after fetch)
  const [form, setForm] = useState<Partial<ShopDetail>>({});
  const [newToken, setNewToken] = useState("");
  const [newSecret, setNewSecret] = useState("");

  function load() {
    fetch(`/api/super/shops/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not_found");
        return r.json();
      })
      .then((d) => {
        setShop(d.shop);
        setStats(d.stats);
        setForm({
          name: d.shop.name,
          phone: d.shop.phone ?? "",
          address: d.shop.address ?? "",
          timezone: d.shop.timezone,
          liff_id: d.shop.liff_id ?? "",
          business_type: d.shop.business_type ?? "",
          onboarding_status: d.shop.onboarding_status,
          theme_id: d.shop.theme_id ?? "",
        });
      })
      .catch(() => setErr("โหลดร้านไม่สำเร็จ"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    const body: Record<string, unknown> = { ...form };
    if (newToken) body.line_channel_access_token = newToken;
    if (newSecret) body.line_channel_secret = newSecret;

    const r = await fetch(`/api/super/shops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      setNotice("บันทึกไม่สำเร็จ: " + (b.error || r.status));
      return;
    }
    setNewToken("");
    setNewSecret("");
    setNotice("บันทึกแล้ว");
    load();
  }

  async function impersonate() {
    const r = await fetch(`/api/super/shops/${id}/impersonate`, { method: "POST" });
    if (!r.ok) { alert("mint token failed"); return; }
    const d = await r.json();
    window.open(d.url, "_blank");
  }

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!shop) return <div className="skeleton h-48" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/super" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
          <ArrowLeft size={14} /> ร้านทั้งหมด
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="eyebrow">Shop · #{shop.id}</div>
          <h1 className="h-display text-2xl sm:text-3xl">{shop.name}</h1>
          <p className="text-xs text-ink-400 mt-1 font-mono">{shop.slug}</p>
        </div>
        <button
          onClick={impersonate}
          className="btn-primary"
        >
          <ExternalLink size={14} /> เข้าเป็นแอดมินร้านนี้
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <div className="eyebrow">Admins</div>
            <div className="text-2xl font-extrabold">{stats.admin_count}</div>
          </div>
          <div className="card p-4">
            <div className="eyebrow">Bookings</div>
            <div className="text-2xl font-extrabold">{stats.booking_count}</div>
          </div>
        </div>
      )}

      <form onSubmit={save} className="card p-5 space-y-4">
        <div className="eyebrow">ข้อมูลร้าน</div>
        <Field label="ชื่อร้าน">
          <input className="input" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="โทรศัพท์">
            <input className="input" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Timezone">
            <input className="input" value={form.timezone ?? ""} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </Field>
        </div>
        <Field label="ที่อยู่">
          <textarea className="input" rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>

        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="ประเภทธุรกิจ">
            <select
              className="input"
              value={form.business_type ?? ""}
              onChange={(e) => setForm({ ...form, business_type: e.target.value || null })}
            >
              <option value="">—</option>
              <option value="salon">salon</option>
              <option value="nail">nail</option>
              <option value="spa">spa</option>
            </select>
          </Field>
          <Field label="สถานะ onboarding">
            <select
              className="input"
              value={form.onboarding_status ?? "pending"}
              onChange={(e) => setForm({ ...form, onboarding_status: e.target.value })}
            >
              <option value="pending">pending</option>
              <option value="setup_in_progress">setup_in_progress</option>
              <option value="completed">completed</option>
            </select>
          </Field>
          <Field label="Theme id">
            <input className="input" value={form.theme_id ?? ""} onChange={(e) => setForm({ ...form, theme_id: e.target.value })} />
          </Field>
        </div>

        <div className="eyebrow pt-2">LINE credentials</div>
        <Field label="LIFF id">
          <input className="input" value={form.liff_id ?? ""} onChange={(e) => setForm({ ...form, liff_id: e.target.value })} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={`Channel access token ${shop.has_access_token ? "(ตั้งไว้แล้ว)" : "(ยังไม่ตั้ง)"}`}>
            <input className="input font-mono text-xs" placeholder="หมุนใหม่…" value={newToken} onChange={(e) => setNewToken(e.target.value)} />
          </Field>
          <Field label={`Channel secret ${shop.has_channel_secret ? "(ตั้งไว้แล้ว)" : "(ยังไม่ตั้ง)"}`}>
            <input className="input font-mono text-xs" placeholder="หมุนใหม่…" value={newSecret} onChange={(e) => setNewSecret(e.target.value)} />
          </Field>
        </div>

        {notice && <p className={`text-xs ${notice.startsWith("บันทึกแล้ว") ? "text-emerald-700" : "text-red-600"}`}>{notice}</p>}
        <div className="pt-2">
          <button className="btn-primary" disabled={saving}>
            <Save size={14} /> {saving ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
