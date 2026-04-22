import Link from "next/link";
import {
  Check,
  Zap,
  HeartHandshake,
  Sparkles,
  Bot,
  BarChart3,
  Scissors,
  Hand,
  Leaf,
  ArrowRight,
  CalendarCheck,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-ink-200">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-ink-900 text-white flex items-center justify-center">
              <CalendarCheck size={16} strokeWidth={2.25} />
            </span>
            <span className="font-semibold tracking-tight text-[15px] text-ink-900">LineBook</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="#features" className="text-sm text-ink-600 hover:text-ink-900 px-3 py-1.5 hidden sm:inline">ฟีเจอร์</Link>
            <Link href="#presets" className="text-sm text-ink-600 hover:text-ink-900 px-3 py-1.5 hidden sm:inline">พรีเซท</Link>
            <Link href="/signup" className="btn-primary text-sm">เริ่มฟรี</Link>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 pt-20 pb-20">
        <div className="max-w-3xl">
          <div className="eyebrow mb-4">ระบบจองคิวสำหรับธุรกิจบริการ</div>
          <h1 className="h-display text-[40px] sm:text-[56px] leading-[1.05]">
            จองคิวผ่าน LINE<br />จบในแชทเดียว
          </h1>
          <p className="mt-5 text-ink-600 max-w-xl text-[15px] leading-relaxed">
            ระบบจองคิว CRM และแต้มสะสม สำหรับร้านเสริมสวย ร้านทำเล็บ และสปา
            เชื่อมกับ LINE OA ของร้าน ลูกค้าจองได้ทันทีในแชท
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/signup" className="btn-primary">
              สมัครฟรี เริ่มใช้ได้เลย <ArrowRight size={16} />
            </Link>
            <Link href="#features" className="btn-secondary">ดูฟีเจอร์ทั้งหมด</Link>
          </div>
          <p className="mt-4 text-xs text-ink-500">ไม่ต้องใส่บัตรเครดิต · ใช้ LINE OA ของร้านเอง</p>
        </div>
      </section>

      <section id="features" className="border-t border-ink-200">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="mb-10 max-w-xl">
            <div className="eyebrow mb-3">ฟีเจอร์</div>
            <h2 className="h-display text-2xl sm:text-3xl">ทุกอย่างที่ร้านบริการต้องใช้</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink-200 border border-ink-200 rounded-xl overflow-hidden">
            <Feature icon={<Zap size={18} />} title="จบในแชท LINE" desc="ลูกค้าไม่ต้องดาวน์โหลดแอป จองผ่าน LIFF ในแชทร้านเอง" />
            <Feature icon={<HeartHandshake size={18} />} title="CRM และแต้มสะสม" desc="ประวัติลูกค้า แต้มสะสม ส่วนลด คูปอง ครบในที่เดียว" />
            <Feature icon={<Bot size={18} />} title="แจ้งเตือนอัตโนมัติ" desc="ส่ง reminder 24 ชม. และ 1 ชม. ก่อนคิว รวมถึง follow-up หลังใช้บริการ" />
            <Feature icon={<BarChart3 size={18} />} title="Dashboard เรียลไทม์" desc="เห็นคิววันนี้ ยอดขาย และลูกค้าประจำแบบสดไม่ต้องรีเฟรช" />
            <Feature icon={<Check size={18} />} title="ป้องกันคิวชน" desc="DB constraint ป้องกัน double-booking ของช่างคนเดียวกัน" />
            <Feature icon={<Sparkles size={18} />} title="พรีเซทธุรกิจ" desc="เลือกประเภทร้าน ระบบจะสร้างบริการ เวลา และข้อความให้อัตโนมัติ" />
          </div>
        </div>
      </section>

      <section id="presets" className="border-t border-ink-200 bg-ink-50">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="mb-10 max-w-xl">
            <div className="eyebrow mb-3">Business Presets</div>
            <h2 className="h-display text-2xl sm:text-3xl">เลือกประเภทร้าน ได้ระบบพร้อมใช้ใน 10 นาที</h2>
            <p className="mt-3 text-ink-600 text-[15px]">
              เลือก 1 ใน 3 พรีเซท ระบบจะติดตั้งบริการเริ่มต้น เวลาทำการ และข้อความอัตโนมัติให้ทันที
              แก้ไขทีหลังได้ทั้งหมด
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PresetCard icon={<Scissors size={20} />} name="ร้านเสริมสวย / บาร์เบอร์" desc="ตัด สี ทรีตเมนต์ สระ-ไดร์" services={6} />
            <PresetCard icon={<Hand size={20} />} name="ร้านทำเล็บ" desc="ทำเล็บมือ-เท้า เจล ต่อเล็บ เพ้นท์ลาย" services={7} />
            <PresetCard icon={<Leaf size={20} />} name="สปา / ร้านนวด" desc="นวดไทย น้ำมัน อโรม่า สปาหน้า" services={7} />
          </div>
          <div className="mt-10">
            <Link href="/signup" className="btn-primary">
              เริ่มสร้างร้านของคุณ <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-200">
        <div className="max-w-6xl mx-auto px-5 py-8 text-xs text-ink-500 flex flex-col sm:flex-row justify-between gap-2">
          <div>© {new Date().getFullYear()} LineBook</div>
          <div>ระบบจองคิวสำหรับธุรกิจบริการไทย</div>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-white p-6">
      <div className="w-9 h-9 rounded-md border border-ink-200 bg-ink-50 text-ink-700 flex items-center justify-center mb-4">
        {icon}
      </div>
      <div className="font-semibold text-ink-900 text-[15px]">{title}</div>
      <div className="text-sm text-ink-600 mt-1 leading-relaxed">{desc}</div>
    </div>
  );
}

function PresetCard({ icon, name, desc, services }: { icon: React.ReactNode; name: string; desc: string; services: number }) {
  return (
    <div className="card p-5 flex flex-col gap-2">
      <div className="w-9 h-9 rounded-md border border-ink-200 bg-white text-ink-700 flex items-center justify-center">
        {icon}
      </div>
      <div className="font-semibold text-ink-900 mt-1">{name}</div>
      <div className="text-sm text-ink-600">{desc}</div>
      <div className="mt-auto text-xs text-ink-500 pt-3 border-t border-ink-100">{services} บริการเริ่มต้น</div>
    </div>
  );
}
