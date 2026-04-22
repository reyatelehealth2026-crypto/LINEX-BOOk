import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Users,
  Bell,
  BarChart3,
  ShieldCheck,
  LayoutGrid,
  Scissors,
  Sparkle,
  Leaf,
  Check,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold tracking-tight">
              LB
            </div>
            <span className="font-semibold tracking-tight text-[15px]">LineBook</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-7 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition">ฟีเจอร์</a>
            <a href="#presets" className="hover:text-slate-900 transition">ประเภทร้าน</a>
            <a href="#how" className="hover:text-slate-900 transition">การใช้งาน</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-slate-600 hover:text-slate-900 hidden sm:inline transition">
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition"
            >
              เริ่มใช้งาน
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs text-slate-600 border border-slate-200 rounded-full px-3 py-1 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              ระบบจองคิวและ CRM สำหรับธุรกิจบริการ
            </div>
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] text-slate-900">
              ระบบจองคิวผ่าน LINE<br className="hidden sm:block" />
              <span className="text-slate-500"> สำหรับธุรกิจบริการไทย</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
              ลูกค้าจองคิวผ่าน LINE ของร้านได้โดยตรง เจ้าของร้านจัดการคิว บริการ
              และข้อมูลลูกค้าแบบเรียลไทม์ ระบบพร้อมใช้งานใน 10 นาที
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-md font-medium transition"
              >
                สมัครใช้งาน
                <ArrowRight size={16} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-900 px-6 py-3 rounded-md font-medium transition"
              >
                ดูฟีเจอร์ทั้งหมด
              </a>
            </div>
            <dl className="mt-14 grid grid-cols-3 gap-8 max-w-xl">
              <Stat value="10 นาที" label="เวลาติดตั้ง" />
              <Stat value="3 ประเภท" label="พรีเซทธุรกิจ" />
              <Stat value="ฟรี" label="ไม่มีค่ารายเดือน" />
            </dl>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="border-b border-slate-200 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <SectionHead
            kicker="ฟีเจอร์หลัก"
            title="ทุกสิ่งที่ร้านบริการต้องการ"
            desc="ระบบจองคิว บริหารลูกค้า และการสื่อสารอัตโนมัติในที่เดียว"
          />
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            <Feature
              icon={<CalendarClock size={22} />}
              title="จองคิวผ่าน LINE"
              desc="ลูกค้าจองคิวผ่าน LIFF Mini App ในแชทของร้าน ไม่ต้องดาวน์โหลดแอปเพิ่ม"
            />
            <Feature
              icon={<Users size={22} />}
              title="CRM และแต้มสะสม"
              desc="เก็บประวัติการใช้บริการ แต้มสะสม และข้อมูลลูกค้าอัตโนมัติ"
            />
            <Feature
              icon={<Bell size={22} />}
              title="แจ้งเตือนอัตโนมัติ"
              desc="ส่งข้อความเตือนก่อนคิว 24 ชั่วโมงและ 1 ชั่วโมง พร้อมข้อความขอบคุณ"
            />
            <Feature
              icon={<BarChart3 size={22} />}
              title="แดชบอร์ดเรียลไทม์"
              desc="ดูคิววันนี้ ยอดขาย และลูกค้าประจำได้ทันที ไม่ต้องรีเฟรชหน้าจอ"
            />
            <Feature
              icon={<ShieldCheck size={22} />}
              title="ป้องกันคิวซ้อน"
              desc="ระบบตรวจสอบการจองซ้อนของช่างคนเดียวกันในระดับฐานข้อมูล"
            />
            <Feature
              icon={<LayoutGrid size={22} />}
              title="พรีเซทพร้อมใช้"
              desc="เลือกประเภทร้านแล้วระบบสร้างบริการ เวลา และข้อความเริ่มต้นให้"
            />
          </div>
        </div>
      </section>

      {/* ── Presets ────────────────────────────────────────── */}
      <section id="presets" className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <SectionHead
            kicker="พรีเซทธุรกิจ"
            title="เริ่มต้นด้วยข้อมูลที่เหมาะกับธุรกิจของคุณ"
            desc="เลือก 1 ใน 3 ประเภท ระบบจะติดตั้งบริการเริ่มต้น เวลาทำการ และข้อความอัตโนมัติ ปรับแก้ได้ทั้งหมดภายหลัง"
          />
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            <PresetCard
              icon={<Scissors size={20} />}
              name="ร้านเสริมสวย / บาร์เบอร์"
              desc="สำหรับร้านตัดผม ย้อมสี ทำทรีตเมนต์ และสระไดร์"
              services={[
                "ตัดผมชาย / ตัดผม + สระ",
                "สระ + ไดร์ / ทรีตเมนต์",
                "ทำสีผม / ดัด / ยืด",
              ]}
              count="6 บริการเริ่มต้น"
            />
            <PresetCard
              icon={<Sparkle size={20} />}
              name="ร้านทำเล็บ"
              desc="สำหรับร้านทำเล็บมือ เล็บเท้า ต่อเล็บ และเพ้นท์ลาย"
              services={[
                "ทำเล็บมือ / เล็บเท้า",
                "เจลสีมือ / เจลสีเท้า",
                "ต่อเล็บอะคริลิค / เพ้นท์ลาย",
              ]}
              count="7 บริการเริ่มต้น"
            />
            <PresetCard
              icon={<Leaf size={20} />}
              name="สปา / ร้านนวด"
              desc="สำหรับร้านนวดไทย นวดน้ำมัน อโรม่า และสปาหน้า"
              services={[
                "นวดไทย 60 / 90 นาที",
                "นวดน้ำมัน / อโรม่า",
                "สปาหน้า / สปาตัว",
              ]}
              count="7 บริการเริ่มต้น"
            />
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section id="how" className="border-b border-slate-200 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <SectionHead
            kicker="การใช้งาน"
            title="เริ่มใช้งานใน 4 ขั้นตอน"
          />
          <div className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-6">
            <Step n={1} title="กรอกข้อมูลร้าน" desc="ชื่อร้าน URL เบอร์โทร และที่อยู่" />
            <Step n={2} title="เลือกประเภทธุรกิจ" desc="พรีเซทบริการและเวลาทำการ" />
            <Step n={3} title="เชื่อม LINE OA" desc="กรอก Channel Token และ LIFF ID" />
            <Step n={4} title="เริ่มรับการจอง" desc="ส่งลิงก์ให้ลูกค้าผ่าน LINE" />
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              พร้อมยกระดับการให้บริการของคุณ
            </h2>
            <p className="mt-4 text-slate-600 text-lg leading-relaxed">
              สร้างร้านของคุณได้ในไม่กี่นาที ไม่มีค่าใช้จ่ายแอบแฝง
              ไม่ต้องใช้บัตรเครดิตในการสมัคร
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-md font-medium transition"
              >
                สมัครใช้งานฟรี
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center justify-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-900 px-6 py-3 rounded-md font-medium transition"
              >
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer>
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
              LB
            </div>
            <span className="text-sm text-slate-600">LineBook · ระบบจองคิวสำหรับธุรกิจบริการไทย</span>
          </div>
          <div className="text-xs text-slate-500">© {new Date().getFullYear()} LineBook. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-2xl font-semibold text-slate-900 tracking-tight">{value}</dt>
      <dd className="text-sm text-slate-600 mt-1">{label}</dd>
    </div>
  );
}

function SectionHead({ kicker, title, desc }: { kicker: string; title: string; desc?: string }) {
  return (
    <div className="max-w-2xl">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{kicker}</div>
      <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">{title}</h2>
      {desc && <p className="mt-4 text-slate-600 text-base leading-relaxed">{desc}</p>}
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-white p-7">
      <div className="w-10 h-10 rounded-md border border-slate-200 text-slate-700 flex items-center justify-center mb-5">
        {icon}
      </div>
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="text-sm text-slate-600 mt-2 leading-relaxed">{desc}</div>
    </div>
  );
}

function PresetCard({
  icon, name, desc, services, count,
}: {
  icon: React.ReactNode; name: string; desc: string; services: string[]; count: string;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-7 bg-white flex flex-col">
      <div className="w-10 h-10 rounded-md border border-slate-200 text-slate-700 flex items-center justify-center mb-5">
        {icon}
      </div>
      <div className="font-semibold text-slate-900">{name}</div>
      <div className="text-sm text-slate-600 mt-2 leading-relaxed">{desc}</div>
      <ul className="mt-6 space-y-2 text-sm text-slate-700">
        {services.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check size={14} className="mt-1 shrink-0 text-slate-400" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6 text-xs text-slate-500 uppercase tracking-wider border-t border-slate-100 mt-6">
        {count}
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500 font-mono">0{n}</div>
      <div className="mt-2 font-semibold text-slate-900">{title}</div>
      <div className="text-sm text-slate-600 mt-1.5 leading-relaxed">{desc}</div>
    </div>
  );
}
