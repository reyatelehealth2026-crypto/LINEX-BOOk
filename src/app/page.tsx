import Link from "next/link";
import { Check, Zap, HeartHandshake, Sparkles, Bot, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 mesh-bg opacity-60 pointer-events-none" />

      {/* Nav */}
      <header className="relative z-10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="w-8 h-8 rounded-2xl bg-linex-600 text-white flex items-center justify-center text-sm shadow-linex-glow">💚</span>
            <span className="grad-text tracking-tight text-lg">LineBook</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="#features" className="text-sm text-ink-600 hover:text-ink-900 px-3 py-2 hidden sm:inline">ฟีเจอร์</Link>
            <Link href="#presets" className="text-sm text-ink-600 hover:text-ink-900 px-3 py-2 hidden sm:inline">พรีเซท</Link>
            <Link href="/signup" className="glow-btn text-sm">เริ่มฟรี</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 pt-10 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-white/70 border border-white/80 backdrop-blur text-ink-600 mb-6">
          <Sparkles size={14} className="text-linex-600" />
          ฟรี 100% ไม่มีค่ารายเดือน · เริ่มได้ใน 10 นาที
        </div>
        <h1 className="linex-title text-4xl sm:text-6xl gradient-text leading-tight">
          จองคิวผ่าน LINE<br className="hidden sm:block" /> จบในแชท
        </h1>
        <p className="mt-5 text-ink-600 max-w-xl mx-auto">
          ระบบจองคิว + CRM + แต้มสะสม สำหรับร้านเสริมสวย ร้านทำเล็บ และสปา — เชื่อม LINE OA ของร้านตัวเอง ลูกค้าจองได้ทันทีในแชท
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="glow-btn">สมัครฟรี ใช้ได้เลย</Link>
          <Link href="#features" className="btn-secondary">ดูฟีเจอร์ทั้งหมด</Link>
        </div>
        <p className="mt-4 text-xs text-ink-400">ไม่ต้องใส่บัตรเครดิต · ใช้ LINE OA ของร้านเอง</p>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-5 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature icon={<Zap size={22} />} title="จบในแชท LINE" desc="ลูกค้าไม่ต้องดาวน์โหลดแอป จองคิวผ่าน LIFF ในแชทร้านเอง" />
          <Feature icon={<HeartHandshake size={22} />} title="CRM + แต้มสะสม" desc="ประวัติลูกค้า แต้มสะสม ส่วนลด คูปอง ครบในที่เดียว" />
          <Feature icon={<Bot size={22} />} title="แจ้งเตือนอัตโนมัติ" desc="ส่ง reminder 24 ชม. / 1 ชม. ก่อนคิว และ follow-up หลังใช้บริการ" />
          <Feature icon={<BarChart3 size={22} />} title="Dashboard realtime" desc="เจ้าของร้านเห็นคิววันนี้ ยอดขาย และลูกค้าประจำ live ไม่ต้องรีเฟรช" />
          <Feature icon={<Check size={22} />} title="ป้องกันคิวชน" desc="DB constraint ป้องกัน double-booking ของช่างคนเดียวกัน" />
          <Feature icon={<Sparkles size={22} />} title="พรีเซทธุรกิจ" desc="เลือกประเภทร้าน ระบบจะสร้างบริการ เวลา และข้อความให้อัตโนมัติ" />
        </div>
      </section>

      {/* Presets */}
      <section id="presets" className="relative z-10 max-w-6xl mx-auto px-5 pb-20">
        <div className="text-center mb-8">
          <div className="linex-kicker">Business Presets</div>
          <h2 className="linex-title text-2xl sm:text-3xl mt-1">เลือกประเภทร้าน ได้ระบบพร้อมใช้ใน 10 นาที</h2>
          <p className="mt-2 text-ink-600 text-sm max-w-xl mx-auto">
            เลือก 1 ใน 3 พรีเซท ระบบจะติดตั้งบริการเริ่มต้น เวลาทำการ และข้อความอัตโนมัติให้คุณทันที — แก้ไขทีหลังได้ทั้งหมด
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PresetCard emoji="💇" name="ร้านเสริมสวย / บาร์เบอร์" desc="ตัด, สี, ทรีตเมนต์, สระ-ไดร์" services={6} />
          <PresetCard emoji="💅" name="ร้านทำเล็บ" desc="ทำเล็บมือ-เท้า, เจล, ต่อเล็บ, เพ้นท์ลาย" services={7} />
          <PresetCard emoji="🌿" name="สปา / ร้านนวด" desc="นวดไทย, น้ำมัน, อโรม่า, สปาหน้า" services={7} />
        </div>
        <div className="mt-10 text-center">
          <Link href="/signup" className="glow-btn">เริ่มสร้างร้านของคุณ</Link>
        </div>
      </section>

      <footer className="relative z-10 max-w-6xl mx-auto px-5 py-8 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} LineBook · ระบบจองคิวสำหรับธุรกิจบริการไทย
      </footer>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="linex-panel p-5">
      <div className="w-10 h-10 rounded-xl bg-linex-600/10 text-linex-600 flex items-center justify-center mb-3">{icon}</div>
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-ink-600 mt-1">{desc}</div>
    </div>
  );
}

function PresetCard({ emoji, name, desc, services }: { emoji: string; name: string; desc: string; services: number }) {
  return (
    <div className="linex-panel p-5 flex flex-col gap-2">
      <div className="text-3xl">{emoji}</div>
      <div className="font-semibold">{name}</div>
      <div className="text-sm text-ink-600">{desc}</div>
      <div className="mt-auto text-xs text-ink-400 pt-3">รวม {services} บริการเริ่มต้น</div>
    </div>
  );
}
