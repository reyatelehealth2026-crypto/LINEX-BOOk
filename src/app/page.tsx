import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  Users,
  Bell,
  BarChart3,
  ShieldCheck,
  LayoutGrid,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen text-[#0a0a0a]" style={{ backgroundColor: "#faf9f5" }}>
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="border-b border-[#e8e6df]">
        <div className="max-w-[1280px] mx-auto px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0a0a0a] text-[#faf9f5] flex items-center justify-center text-[10px] font-semibold tracking-wider">
              LB
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-[17px] font-semibold tracking-tight">LineBook</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-9 text-[13px] text-[#4a4a4a]">
            <a href="#capabilities" className="hover:text-[#0a0a0a] transition">Capabilities</a>
            <a href="#industries" className="hover:text-[#0a0a0a] transition">Industries</a>
            <a href="#process" className="hover:text-[#0a0a0a] transition">Process</a>
          </nav>
          <div className="flex items-center gap-5">
            <Link href="/admin" className="text-[13px] text-[#4a4a4a] hover:text-[#0a0a0a] transition hidden sm:inline">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="group inline-flex items-center gap-1.5 bg-[#0a0a0a] hover:bg-[#2a2a2a] text-[#faf9f5] px-4 py-2 text-[13px] font-medium tracking-tight transition"
            >
              เริ่มใช้งาน
              <ArrowUpRight size={13} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="border-b border-[#e8e6df]">
        <div className="max-w-[1280px] mx-auto px-8 py-24 md:py-36">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-8">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[#6a6a6a] mb-10 font-mono">
                <span className="inline-block w-6 h-px bg-[#b8b5ab]" />
                <span>EST. 2026 — Booking Infrastructure</span>
              </div>
              <h1 className="font-serif font-normal text-[clamp(2.5rem,6.5vw,5.75rem)] leading-[0.98] tracking-[-0.02em] text-[#0a0a0a]">
                ระบบจองคิวผ่าน LINE<br />
                <span className="italic text-[#2a2a2a]">สำหรับธุรกิจบริการ</span><br />
                <span className="text-[#6a6a6a]">ของคุณ</span>
              </h1>
              <p className="mt-10 max-w-xl text-[17px] leading-[1.65] text-[#3a3a3a]">
                แพลตฟอร์มจองคิวและการดูแลลูกค้าที่ออกแบบสำหรับร้านเสริมสวย
                ร้านทำเล็บ และสปา — ทำงานร่วมกับ LINE Official Account
                ของร้านโดยตรง พร้อมระบบบริหารจัดการคิวและข้อมูลลูกค้าแบบเรียลไทม์
              </p>
              <div className="mt-12 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 bg-[#0a0a0a] hover:bg-[#2a2a2a] text-[#faf9f5] px-7 py-3.5 text-[14px] font-medium tracking-tight transition"
                >
                  สมัครใช้งาน
                  <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <a
                  href="#capabilities"
                  className="inline-flex items-center gap-2 border border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#faf9f5] px-7 py-3.5 text-[14px] font-medium tracking-tight transition"
                >
                  ศึกษาระบบ
                </a>
              </div>
            </div>

            <aside className="md:col-span-4 md:border-l md:border-[#e8e6df] md:pl-10 flex flex-col justify-end">
              <div className="space-y-9">
                <Metric number="10" unit="นาที" label="เวลาในการติดตั้งระบบ" />
                <div className="h-px bg-[#e8e6df]" />
                <Metric number="03" unit="ประเภท" label="พรีเซทธุรกิจที่รองรับ" />
                <div className="h-px bg-[#e8e6df]" />
                <Metric number="00" unit="บาท" label="ค่าธรรมเนียมรายเดือน" />
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Capabilities ─────────────────────────────────────── */}
      <section id="capabilities" className="border-b border-[#e8e6df]">
        <div className="max-w-[1280px] mx-auto px-8 py-24 md:py-32">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-20">
            <div className="md:col-span-3">
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#6a6a6a]">
                § 01 — Capabilities
              </div>
            </div>
            <div className="md:col-span-9">
              <h2 className="font-serif font-normal text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.015em] text-[#0a0a0a] max-w-2xl">
                ทุกองค์ประกอบที่ร้านบริการต้องการ<br />
                <span className="italic text-[#4a4a4a]">ออกแบบมาอย่างพิถีพิถัน</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-14">
            <Capability
              num="01"
              icon={<CalendarClock size={20} strokeWidth={1.4} />}
              title="การจองผ่าน LINE"
              desc="ลูกค้าจองคิวผ่าน LIFF Mini App ภายในแชทของร้าน ไม่ต้องดาวน์โหลดแอปเพิ่มเติม รองรับการเลือกบริการ ช่าง วัน และเวลา"
            />
            <Capability
              num="02"
              icon={<Users size={20} strokeWidth={1.4} />}
              title="ระบบ CRM"
              desc="เก็บข้อมูลลูกค้า ประวัติการใช้บริการ แต้มสะสม และวันเกิด อัตโนมัติทุกครั้งที่มีการจอง ช่วยให้การดูแลลูกค้าประจำทำได้ง่าย"
            />
            <Capability
              num="03"
              icon={<Bell size={20} strokeWidth={1.4} />}
              title="การแจ้งเตือนอัตโนมัติ"
              desc="ส่งข้อความเตือนก่อนเวลาคิว 24 ชั่วโมงและ 1 ชั่วโมง รวมถึงข้อความขอบคุณหลังรับบริการ ลดอัตราการไม่มาตามนัด"
            />
            <Capability
              num="04"
              icon={<BarChart3 size={20} strokeWidth={1.4} />}
              title="รายงานแบบเรียลไทม์"
              desc="แดชบอร์ดแสดงคิววันนี้ ยอดขาย และสถิติลูกค้าอัปเดตทันทีที่มีการเปลี่ยนแปลง ไม่ต้องรีเฟรชหน้าจอ"
            />
            <Capability
              num="05"
              icon={<ShieldCheck size={20} strokeWidth={1.4} />}
              title="การป้องกันความผิดพลาด"
              desc="ระบบตรวจสอบการจองซ้อนของช่างคนเดียวกันในระดับฐานข้อมูล ลดโอกาสผิดพลาดในการจัดคิวเหลือเป็นศูนย์"
            />
            <Capability
              num="06"
              icon={<LayoutGrid size={20} strokeWidth={1.4} />}
              title="พรีเซทสำเร็จรูป"
              desc="เลือกประเภทธุรกิจ ระบบจะติดตั้งบริการเริ่มต้น เวลาทำการ และข้อความอัตโนมัติ พร้อมใช้งานทันที ปรับแก้ได้ทุกรายละเอียด"
            />
          </div>
        </div>
      </section>

      {/* ── Industries ────────────────────────────────────── */}
      <section id="industries" className="border-b border-[#e8e6df]" style={{ backgroundColor: "#f4f2ea" }}>
        <div className="max-w-[1280px] mx-auto px-8 py-24 md:py-32">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-20">
            <div className="md:col-span-3">
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#6a6a6a]">
                § 02 — Industries
              </div>
            </div>
            <div className="md:col-span-9">
              <h2 className="font-serif font-normal text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.015em] text-[#0a0a0a] max-w-2xl">
                รองรับธุรกิจบริการ<br />
                <span className="italic text-[#4a4a4a]">สามประเภทหลัก</span>
              </h2>
            </div>
          </div>

          <div className="space-y-px">
            <Industry
              num="01"
              name="ร้านเสริมสวย และบาร์เบอร์"
              name_en="Salon & Barber"
              desc="สำหรับร้านตัดผม ย้อมสี ทำทรีตเมนต์ และบริการสระไดร์"
              services={["ตัดผมชาย", "ตัดผม + สระ", "สระ + ไดร์", "ทำสีผม", "ทรีตเมนต์", "ดัด / ยืด"]}
            />
            <Industry
              num="02"
              name="ร้านทำเล็บ"
              name_en="Nail Salon"
              desc="สำหรับร้านทำเล็บมือ เล็บเท้า ต่อเล็บ และบริการเพ้นท์ลาย"
              services={["ทำเล็บมือ", "ทำเล็บเท้า", "สปามือ", "เจลสีเล็บมือ", "เจลสีเล็บเท้า", "ต่อเล็บอะคริลิค", "เพ้นท์ลาย"]}
            />
            <Industry
              num="03"
              name="สปา และร้านนวด"
              name_en="Spa & Massage"
              desc="สำหรับร้านนวดไทย นวดน้ำมัน อโรม่าเทอราปี และบริการสปา"
              services={["นวดไทย 60 นาที", "นวดไทย 90 นาที", "นวดน้ำมัน", "นวดอโรม่า", "นวดฝ่าเท้า", "สปาหน้า", "สปาตัว + ขัดผิว"]}
            />
          </div>
        </div>
      </section>

      {/* ── Process ────────────────────────────────────────── */}
      <section id="process" className="border-b border-[#e8e6df]">
        <div className="max-w-[1280px] mx-auto px-8 py-24 md:py-32">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-20">
            <div className="md:col-span-3">
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#6a6a6a]">
                § 03 — Process
              </div>
            </div>
            <div className="md:col-span-9">
              <h2 className="font-serif font-normal text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] tracking-[-0.015em] text-[#0a0a0a] max-w-2xl">
                ขั้นตอนการติดตั้ง<br />
                <span className="italic text-[#4a4a4a]">ใช้เวลาไม่เกินสิบนาที</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6">
            <Step n="01" title="กรอกข้อมูลร้าน" desc="ระบุชื่อร้าน URL เบอร์โทร และที่อยู่ที่ใช้สำหรับการจอง" />
            <Step n="02" title="เลือกประเภทธุรกิจ" desc="ระบบจะสร้างบริการเริ่มต้นและเวลาทำการตามพรีเซทที่เลือก" />
            <Step n="03" title="เชื่อม LINE OA" desc="กรอก Channel Access Token และ LIFF ID ของร้านจาก LINE Developers" />
            <Step n="04" title="เริ่มรับการจอง" desc="แชร์ลิงก์หรือ QR ให้ลูกค้าผ่าน LINE เพื่อเริ่มรับการจองทันที" />
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="border-b border-[#e8e6df]">
        <div className="max-w-[1280px] mx-auto px-8 py-28 md:py-40">
          <div className="max-w-3xl">
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#6a6a6a] mb-8">
              Ready to begin
            </div>
            <h2 className="font-serif font-normal text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1] tracking-[-0.02em] text-[#0a0a0a]">
              ยกระดับการบริหารจัดการร้าน<br />
              <span className="italic text-[#4a4a4a]">ของคุณในวันนี้</span>
            </h2>
            <p className="mt-8 text-[17px] leading-[1.65] text-[#3a3a3a] max-w-xl">
              สร้างบัญชีได้ทันที โดยไม่ต้องใช้บัตรเครดิตและไม่มีค่าใช้จ่ายแอบแฝง
            </p>
            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 bg-[#0a0a0a] hover:bg-[#2a2a2a] text-[#faf9f5] px-8 py-4 text-[14px] font-medium tracking-tight transition"
              >
                สมัครใช้งานฟรี
                <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 border border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#faf9f5] px-8 py-4 text-[14px] font-medium tracking-tight transition"
              >
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer>
        <div className="max-w-[1280px] mx-auto px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#0a0a0a] text-[#faf9f5] flex items-center justify-center text-[10px] font-semibold tracking-wider">
                  LB
                </div>
                <span className="font-serif text-[17px] font-semibold tracking-tight">LineBook</span>
              </div>
              <p className="text-[13px] text-[#6a6a6a] leading-relaxed max-w-xs">
                Booking infrastructure for<br />service businesses in Thailand
              </p>
            </div>
            <FooterCol title="Product" links={[["ฟีเจอร์", "#capabilities"], ["ประเภทธุรกิจ", "#industries"], ["การใช้งาน", "#process"]]} />
            <FooterCol title="Resources" links={[["สมัครใช้งาน", "/signup"], ["เข้าสู่ระบบ", "/admin"]]} />
            <FooterCol title="Contact" links={[["LINE Developers", "https://developers.line.biz"]]} />
          </div>
          <div className="pt-8 border-t border-[#e8e6df] flex flex-col sm:flex-row justify-between gap-3 text-[12px] text-[#8a8a8a]">
            <div>© {new Date().getFullYear()} LineBook. All rights reserved.</div>
            <div className="font-mono tracking-wider uppercase">v1.0 — Released 2026</div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Metric({ number, unit, label }: { number: string; unit: string; label: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-6xl font-light leading-none tracking-[-0.02em] text-[#0a0a0a] tabular-nums">
          {number}
        </span>
        <span className="text-[13px] text-[#6a6a6a] tracking-tight">{unit}</span>
      </div>
      <div className="mt-3 text-[12px] text-[#6a6a6a] tracking-tight">{label}</div>
    </div>
  );
}

function Capability({
  num, icon, title, desc,
}: { num: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="max-w-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-[#8a8a8a]">{icon}</div>
        <span className="text-[11px] font-mono tracking-[0.18em] text-[#8a8a8a]">{num}</span>
      </div>
      <h3 className="font-serif text-[22px] font-medium tracking-tight leading-tight text-[#0a0a0a]">
        {title}
      </h3>
      <p className="mt-3 text-[14px] leading-[1.65] text-[#4a4a4a]">{desc}</p>
    </div>
  );
}

function Industry({
  num, name, name_en, desc, services,
}: { num: string; name: string; name_en: string; desc: string; services: string[] }) {
  return (
    <div className="py-10 border-t border-[#d8d5cb] grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 group">
      <div className="md:col-span-1">
        <div className="font-mono text-[11px] tracking-[0.18em] text-[#8a8a8a]">{num}</div>
      </div>
      <div className="md:col-span-5">
        <h3 className="font-serif text-[28px] md:text-[34px] font-normal tracking-[-0.01em] leading-[1.1] text-[#0a0a0a]">
          {name}
        </h3>
        <div className="mt-1 text-[12px] font-mono tracking-[0.1em] text-[#8a8a8a] uppercase">
          {name_en}
        </div>
        <p className="mt-5 text-[14px] leading-[1.65] text-[#4a4a4a] max-w-md">{desc}</p>
      </div>
      <div className="md:col-span-6">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px] text-[#3a3a3a]">
          {services.map((s, i) => (
            <li key={i} className="flex items-baseline gap-2.5">
              <span className="font-mono text-[10px] text-[#b8b5ab]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] tracking-[0.18em] text-[#8a8a8a] mb-5">{n}</div>
      <h3 className="font-serif text-[20px] font-medium tracking-tight leading-tight text-[#0a0a0a]">
        {title}
      </h3>
      <p className="mt-3 text-[13px] leading-[1.65] text-[#4a4a4a]">{desc}</p>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#6a6a6a] mb-5">
        {title}
      </div>
      <ul className="space-y-2.5">
        {links.map(([label, href], i) => (
          <li key={i}>
            <a href={href} className="text-[13px] text-[#2a2a2a] hover:text-[#0a0a0a] hover:underline underline-offset-4 transition">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
