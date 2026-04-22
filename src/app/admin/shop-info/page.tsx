"use client";
import { useEffect, useState } from "react";
import { Loader2, Check, Save, KeyRound } from "lucide-react";

type ShopInfo = {
  id: number;
  slug: string;
  name: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  logo_url: string | null;
  business_type: string | null;
  line_oa_id: string | null;
  liff_id: string | null;
  has_access_token: boolean;
  has_channel_secret: boolean;
  onboarding_status: string;
};

export default function ShopInfoPage() {
  const [info, setInfo] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("Asia/Bangkok");

  // Credential rotation fields (blank = don't change)
  const [newToken, setNewToken] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [newLiff, setNewLiff] = useState("");

  function getAdminPassword(): string {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("admin_password") ?? "";
  }

  async function load() {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/admin/shop-info", { headers: { "x-admin-password": getAdminPassword() } });
      if (!res.ok) throw new Error(res.status === 401 ? "กรุณาล็อกอินเป็นแอดมิน" : "โหลดข้อมูลไม่สำเร็จ");
      const data: ShopInfo = await res.json();
      setInfo(data);
      setName(data.name);
      setPhone(data.phone ?? "");
      setAddress(data.address ?? "");
      setTimezone(data.timezone);
      setNewLiff("");
    } catch (e: any) {
      setErr(e.message ?? "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setErr(null); setOk(false);
    try {
      const payload: Record<string, any> = { name, phone, address, timezone };
      if (newLiff) payload.liff_id = newLiff;
      if (newToken) payload.line_channel_access_token = newToken;
      if (newSecret) payload.line_channel_secret = newSecret;
      const res = await fetch("/api/admin/shop-info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": getAdminPassword() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "บันทึกไม่สำเร็จ");
      setOk(true);
      setNewToken(""); setNewSecret("");
      await load();
    } catch (e: any) {
      setErr(e.message ?? "เกิดข้อผิดพลาด");
    } finally { setSaving(false); }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-10"><Loader2 className="animate-spin" /></div>;
  }
  if (err && !info) {
    return <div className="p-6 text-red-600">{err}</div>;
  }
  if (!info) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <div>
        <div className="eyebrow">ตั้งค่าร้าน</div>
        <h1 className="h-display text-2xl mt-1">ข้อมูลร้าน</h1>
        <p className="text-sm text-ink-500 mt-1">
          URL: <code className="bg-ink-100 px-1.5 py-0.5 rounded">{info.slug}.likesms.net</code> · ประเภท: <strong>{info.business_type ?? "-"}</strong>
        </p>
      </div>

      {err && <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">{err}</div>}
      {ok && <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2"><Check size={16} /> บันทึกเรียบร้อย</div>}

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold">ข้อมูลพื้นฐาน</h2>
        <Field label="ชื่อร้าน"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="เบอร์โทร"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="ที่อยู่"><textarea className="input" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Field label="Timezone"><input className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)} /></Field>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-ink-700" />
          <h2 className="font-semibold">LINE OA Credentials</h2>
        </div>
        <div className="text-xs text-ink-500 space-y-0.5">
          <div>OA user id: <code className="bg-ink-100 px-1.5 py-0.5 rounded">{info.line_oa_id ?? "-"}</code></div>
          <div>LIFF ID: <code className="bg-ink-100 px-1.5 py-0.5 rounded">{info.liff_id ?? "-"}</code></div>
          <div>Access token: {info.has_access_token ? "✓ ตั้งค่าแล้ว" : "— ยังไม่ตั้ง"}</div>
          <div>Channel secret: {info.has_channel_secret ? "✓ ตั้งค่าแล้ว" : "— ยังไม่ตั้ง"}</div>
        </div>
        <p className="text-xs text-ink-500">เว้นว่างช่องด้านล่างไว้ถ้าไม่ต้องการเปลี่ยน</p>
        <Field label="Access Token ใหม่">
          <textarea className="input font-mono text-xs" rows={2} value={newToken} onChange={(e) => setNewToken(e.target.value)} placeholder="eyJhbGci..." />
        </Field>
        <Field label="Channel Secret ใหม่">
          <input className="input font-mono text-xs" value={newSecret} onChange={(e) => setNewSecret(e.target.value)} placeholder="32-char hex" />
        </Field>
        <Field label="LIFF ID ใหม่">
          <input className="input font-mono text-xs" value={newLiff} onChange={(e) => setNewLiff(e.target.value)} placeholder="1234567890-abcdefgh" />
        </Field>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full justify-center">
        {saving ? <><Loader2 className="animate-spin inline mr-1" size={16} /> กำลังบันทึก...</> : <><Save className="inline mr-1" size={16} /> บันทึกการเปลี่ยนแปลง</>}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-ink-800 mb-1">{label}</div>
      {children}
    </label>
  );
}
