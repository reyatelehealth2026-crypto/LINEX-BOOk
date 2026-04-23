import Link from "next/link";
import {
  Check,
  BarChart3,
  Scissors,
  Hand,
  Leaf,
  ArrowRight,
  Eye,
  Calendar as CalIcon,
  Link2,
  MessageSquareText,
  Gift,
  Users,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-paper-1 text-ink-900">
      {/* ── Top nav ───────────────────────────────────────── */}
      <header className="border-b border-paper-3 bg-paper-1">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-14 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-[10px] bg-forest-500 text-white grid place-items-center font-display font-semibold text-[16px]">
              จก
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display text-[19px] tracking-tight text-ink-900">
                LineBook
              </span>
              <span className="text-[10px] text-ink-500 font-mono tracking-[0.1em] uppercase">
                จองคิว.net
              </span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-[13px] text-ink-700">
            <Link href="#features" className="hover:text-ink-900">ฟีเจอร์</Link>
            <Link href="#presets" className="hover:text-ink-900">พรีเซท</Link>
            <Link href="#pricing" className="hover:text-ink-900">ราคา</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost text-[13px]">เข้าสู่ระบบ</Link>
            <Link href="/signup" className="btn-dark text-[13px]">
              ทดลองฟรี 14 วัน
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-14 pt-16 lg:pt-20 pb-16 lg:pb-24 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-forest-50 border border-forest-100 text-[12px] text-forest-700 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-forest-500" />
              ใหม่ · แจ้งเตือนอัตโนมัติผ่าน LINE OA
            </div>
            <h1 className="font-display font-normal tracking-[-0.03em] text-[44px] sm:text-[64px] lg:text-[72px] leading-[1.02] text-ink-900">
              รับจองคิว
              <br />
              <span className="italic text-forest-600">ด้วยลิงก์เดียว</span>
            </h1>
            <p className="mt-6 text-[17px] leading-[1.65] text-ink-600 max-w-[520px]">
              จัดการนัดหมายลูกค้า พนักงาน และรายได้ของร้าน ในระบบเดียว
              ครบเครื่องตั้งแต่ลูกค้ากดจอง จนถึงการวิเคราะห์ยอดขาย
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="btn-primary text-[14px] px-5 py-3">
                เริ่มใช้งานฟรี <ArrowRight size={14} />
              </Link>
              <Link href="#features" className="btn-secondary text-[14px] px-5 py-3">
                <Eye size={14} /> ดูตัวอย่างระบบ
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-2 text-[12px] text-ink-500">
              <span>✓ ไม่ต้องใส่บัตรเครดิต</span>
              <span>✓ ตั้งค่าได้ใน 5 นาที</span>
              <span>✓ รองรับภาษาไทย</span>
            </div>
          </div>

          {/* ── Stacked hero mockups ─────────────────── */}
          <div className="relative h-[460px] lg:h-[560px] hidden lg:block">
            {/* Calendar card */}
            <div
              className="absolute right-0 top-4 w-[420px] bg-paper-0 rounded-[16px] shadow-editorial border border-paper-3 p-5"
              style={{ transform: "rotate(2deg)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="font-display text-[15px]">เมษายน 2569</div>
                <div className="flex gap-1">
                  <span className="w-5 h-5 rounded bg-paper-2" />
                  <span className="w-5 h-5 rounded bg-paper-2" />
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-[10px] text-ink-500 mb-1">
                {["จ","อ","พ","พฤ","ศ","ส","อา"].map((dd) => (
                  <div key={dd} className="text-center">{dd}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 28 }).map((_, i) => {
                  const busy = [3,7,10,14,15,17,21,23].includes(i);
                  const full = [9,16].includes(i);
                  const today = i === 22;
                  const cls = full
                    ? "bg-clay-200 text-clay-700 font-medium"
                    : busy
                      ? "bg-forest-200 text-forest-700 font-medium"
                      : "bg-paper-1 text-ink-700";
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-md grid place-items-center text-[11px] ${cls}`}
                      style={today ? { boxShadow: "0 0 0 2px var(--ink-900)" } : undefined}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Booking card */}
            <div
              className="absolute left-2 bottom-8 w-[280px] bg-paper-0 rounded-[16px] shadow-editorial border border-paper-3 p-5"
              style={{ transform: "rotate(-3deg)" }}
            >
              <div className="text-[11px] text-ink-500 mb-1">วันนี้ · 14:30</div>
              <div className="font-display text-[18px] mb-3">ตัดผม + สระไดร์</div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-full bg-ochre-200 grid place-items-center text-[11px] font-semibold text-ink-900">
                  ณฐ
                </div>
                <div>
                  <div className="text-[13px] font-medium">ณัฐพร ใจดี</div>
                  <div className="text-[10px] text-ink-500">ลูกค้าประจำ · 12 ครั้ง</div>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-dashed border-paper-3 text-[12px]">
                <span className="text-ink-500">ราคา</span>
                <span className="font-semibold">฿ 550</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                <span className="pill-forest">ยืนยันแล้ว</span>
                <span className="pill-cream">แต้ม +55</span>
              </div>
            </div>

            {/* Revenue card */}
            <div className="absolute right-16 bottom-14 w-[200px] bg-forest-700 text-white rounded-[16px] shadow-editorial p-5">
              <div className="text-[10px] opacity-70 uppercase tracking-[0.1em]">สัปดาห์นี้</div>
              <div className="font-display text-[30px] font-medium mt-1 leading-none">
                ฿48,320
              </div>
              <div className="text-[11px] text-sage-200 mt-1">↑ 18.2% จากสัปดาห์ก่อน</div>
              <div className="flex items-end gap-1 h-10 mt-3">
                {[30, 45, 25, 60, 40, 70, 85].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-[2px] ${i === 6 ? "bg-sage-200" : "bg-white/30"}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile hero companion */}
        <div className="lg:hidden max-w-[420px] mx-auto px-6 pb-12">
          <div className="bg-forest-700 text-white rounded-[16px] shadow-editorial p-5">
            <div className="text-[10px] opacity-70 uppercase tracking-[0.1em]">สัปดาห์นี้</div>
            <div className="font-display text-[30px] font-medium mt-1 leading-none">฿48,320</div>
            <div className="text-[11px] text-sage-200 mt-1">↑ 18.2% จากสัปดาห์ก่อน</div>
            <div className="flex items-end gap-1 h-10 mt-3">
              {[30, 45, 25, 60, 40, 70, 85].map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-[2px] ${i === 6 ? "bg-sage-200" : "bg-white/30"}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Logo strip ────────────────────────────────────── */}
      <section className="border-y border-paper-3 bg-paper-1">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-14 py-7 flex flex-wrap items-center justify-between gap-x-10 gap-y-4">
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-500">
            ใช้โดยธุรกิจกว่า 2,800 แห่งทั่วไทย
          </span>
          {["Siam Salon", "บ้านนวด", "Bloom & Co", "ทันตกรรมฟ้าใส", "Studio K", "Pet Care +"].map(
            (n) => (
              <span key={n} className="font-display italic text-[17px] text-ink-400">
                {n}
              </span>
            ),
          )}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section id="features" className="bg-paper-1">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-14 py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-12 mb-14">
            <div>
              <div className="eyebrow mb-3">— ฟีเจอร์หลัก</div>
              <h2 className="h-display text-[36px] sm:text-[44px] leading-[1.08]">
                ทุกอย่างที่ร้านคุณ
                <br />
                <span className="italic text-forest-600">ต้องการ</span>
              </h2>
            </div>
            <p className="text-[16px] leading-[1.7] text-ink-600 self-end">
              ตั้งแต่การรับจองคิวผ่าน LINE, ปฏิทินแบบ real-time, ระบบสะสมแต้มอัตโนมัติ
              ไปจนถึง dashboard วิเคราะห์รายได้ — ครบในแอปเดียว ไม่ต้องสลับเครื่องมือ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              variant="featured"
              icon={<Link2 size={20} />}
              title="ลิงก์จองเดียว"
              desc="แปะลิงก์เดียวทุกที่ — ลูกค้ากดจองได้ 24 ชม. ระบบจัดการคิวอัตโนมัติ"
            />
            <FeatureCard
              icon={<CalIcon size={20} />}
              title="ปฏิทินอัจฉริยะ"
              desc="ป้องกันการจองซ้อน จัดสรรตามพนักงาน เห็นภาพรวมทั้งสัปดาห์"
            />
            <FeatureCard
              icon={<MessageSquareText size={20} />}
              title="แจ้งเตือน LINE"
              desc="ส่งยืนยันและเตือนลูกค้าอัตโนมัติ ลดการไม่มาตามนัด"
            />
            <FeatureCard
              icon={<Gift size={20} />}
              title="สะสมแต้ม"
              desc="ระบบลอยัลตี้ในตัว รีวอร์ด ส่วนลด บัตรสะสมแต้ม"
            />
            <FeatureCard
              icon={<Users size={20} />}
              title="ลูกค้าสัมพันธ์"
              desc="เก็บประวัติการใช้บริการ หมายเหตุส่วนตัว วันเกิด"
            />
            <FeatureCard
              icon={<BarChart3 size={20} />}
              title="รายงาน"
              desc="วิเคราะห์รายได้ต่อพนักงาน ต่อบริการ เปรียบเทียบช่วงเวลา"
            />
          </div>
        </div>
      </section>

      {/* ── Dashboard showcase ────────────────────────────── */}
      <section className="bg-paper-1">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-14 pb-20 lg:pb-24">
          <div className="bg-forest-800 rounded-[20px] p-8 sm:p-14 pb-0 overflow-hidden text-paper-1">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-sage-200 mb-3">
                  — แดชบอร์ด
                </div>
                <h2 className="font-display text-[36px] sm:text-[44px] leading-[1.08] tracking-[-0.02em]">
                  ภาพรวมร้าน
                  <br />
                  <span className="italic text-sage-200">ในหน้าเดียว</span>
                </h2>
              </div>
              <p className="text-white/65 max-w-[380px] text-[14px] leading-[1.65]">
                เห็นทุกอย่างที่สำคัญตั้งแต่แรกเข้า — นัดหมายวันนี้ รายได้
                และพนักงานที่ว่างในแต่ละช่วงเวลา
              </p>
            </div>

            <div className="mt-10 rounded-t-[12px] overflow-hidden bg-paper-1 text-ink-900 border border-paper-3 shadow-[0_-20px_60px_rgba(0,0,0,0.3)]">
              <div className="flex">
                <div className="hidden md:flex flex-col w-[180px] bg-forest-800 text-paper-1 p-4 gap-1">
                  {["แดชบอร์ด","ปฏิทิน","วิเคราะห์","บริการ","พนักงาน","ลูกค้า","สะสมแต้ม"].map((n, i) => (
                    <div
                      key={n}
                      className={`text-[11px] px-2 py-1.5 rounded ${
                        i === 0 ? "bg-forest-600 text-white" : "text-white/70"
                      }`}
                    >
                      {n}
                    </div>
                  ))}
                </div>
                <div className="flex-1 p-5 sm:p-7">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500">
                    วันพฤหัสที่ 23 เมษายน 2569
                  </div>
                  <div className="font-display text-[28px] mt-1">แดชบอร์ด</div>
                  <div className="grid grid-cols-4 gap-3 mt-5">
                    <MiniKpi tone="forest" label="นัดวันนี้" value="18" />
                    <MiniKpi tone="dark" label="รายได้" value="฿14,280" />
                    <MiniKpi tone="cream" label="ลูกค้าใหม่" value="12" />
                    <MiniKpi tone="cream" label="อัตราการมา" value="94%" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Presets ───────────────────────────────────────── */}
      <section id="presets" className="border-t border-paper-3 bg-paper-2">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-14 py-20 lg:py-24">
          <div className="mb-10 max-w-2xl">
            <div className="eyebrow mb-3">— พรีเซทธุรกิจ</div>
            <h2 className="h-display text-[32px] sm:text-[40px] leading-[1.08]">
              เลือกประเภทร้าน ได้ระบบพร้อมใช้ใน
              <span className="italic text-forest-600"> 10 นาที</span>
            </h2>
            <p className="mt-4 text-ink-600 text-[15px] leading-[1.65]">
              เลือก 1 ใน 3 พรีเซท ระบบจะติดตั้งบริการเริ่มต้น เวลาทำการ และข้อความอัตโนมัติให้ทันที —
              แก้ไขทีหลังได้ทั้งหมด
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PresetCard icon={<Scissors size={22} />} name="ร้านเสริมสวย / บาร์เบอร์" desc="ตัด สี ทรีตเมนต์ สระ-ไดร์" services={6} />
            <PresetCard icon={<Hand size={22} />} name="ร้านทำเล็บ" desc="ทำเล็บมือ-เท้า เจล ต่อเล็บ เพ้นท์ลาย" services={7} />
            <PresetCard icon={<Leaf size={22} />} name="สปา / ร้านนวด" desc="นวดไทย น้ำมัน อโรม่า สปาหน้า" services={7} />
          </div>
          <div className="mt-10">
            <Link href="/signup" className="btn-primary text-[14px] px-5 py-3">
              เริ่มสร้างร้านของคุณ <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────── */}
      <section id="pricing" className="border-t border-paper-3 bg-paper-1">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-14 py-20 lg:py-24">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <div className="eyebrow mb-3">— แผนการใช้งาน</div>
            <h2 className="h-display text-[36px] sm:text-[44px] leading-[1.08]">
              ราคาที่<span className="italic text-forest-600">เหมาะกับร้านคุณ</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[1100px] mx-auto">
            <PricingCard
              name="Starter"
              desc="เริ่มต้นสำหรับร้านเล็ก"
              price="0"
              per="ฟรี"
              features={["พนักงาน 2 คน", "นัดหมาย 50/เดือน", "ลิงก์จอง"]}
            />
            <PricingCard
              name="Professional"
              desc="ร้านที่กำลังเติบโต"
              price="690"
              per="/เดือน"
              features={["พนักงาน 15 คน", "นัดหมายไม่จำกัด", "LINE OA + SMS", "สะสมแต้ม", "รายงาน"]}
              featured
            />
            <PricingCard
              name="Business"
              desc="หลายสาขา / องค์กร"
              price="1,490"
              per="/เดือน"
              features={["พนักงานไม่จำกัด", "หลายสาขา", "API", "ซัพพอร์ตเฉพาะ"]}
            />
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="bg-ink-900 text-paper-2">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-14 py-12 flex flex-col sm:flex-row sm:items-start justify-between gap-10">
          <div>
            <div className="font-display text-[26px] text-white">
              LineBook<span className="text-forest-300">.</span>
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              © {new Date().getFullYear()} LineBook · ทุกสิทธิ์สงวน
            </div>
            <div className="text-[11px] text-white/50 mt-3 max-w-sm">
              ระบบจองคิวสำหรับธุรกิจบริการไทย
            </div>
          </div>
          <div className="grid grid-cols-3 gap-10 text-[12px]">
            <FooterCol
              heading="ผลิตภัณฑ์"
              items={[
                { label: "ฟีเจอร์", href: "#features" },
                { label: "พรีเซท", href: "#presets" },
                { label: "ราคา", href: "#pricing" },
              ]}
            />
            <FooterCol
              heading="บริษัท"
              items={[
                { label: "เกี่ยวกับเรา", href: "#" },
                { label: "ข่าวสาร", href: "#" },
                { label: "ติดต่อ", href: "#" },
              ]}
            />
            <FooterCol
              heading="ช่วยเหลือ"
              items={[
                { label: "ศูนย์ช่วยเหลือ", href: "#" },
                { label: "สถานะระบบ", href: "#" },
                { label: "เข้าสู่ระบบ", href: "/login" },
              ]}
            />
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ---------- sub-components ---------- */

function FeatureCard({
  icon,
  title,
  desc,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  variant?: "featured";
}) {
  const featured = variant === "featured";
  return (
    <div
      className={`rounded-[16px] p-7 min-h-[220px] flex flex-col justify-between border ${
        featured
          ? "bg-ink-900 text-paper-1 border-transparent"
          : "bg-paper-0 text-ink-900 border-paper-3"
      }`}
    >
      <div
        className={`w-11 h-11 rounded-[10px] grid place-items-center ${
          featured ? "bg-forest-500 text-white" : "bg-forest-50 text-forest-600"
        }`}
      >
        {icon}
      </div>
      <div className="mt-6">
        <div className="font-display text-[22px] font-medium tracking-tight">{title}</div>
        <div className={`text-[13px] leading-[1.55] mt-1.5 ${featured ? "text-white/65" : "text-ink-500"}`}>
          {desc}
        </div>
      </div>
    </div>
  );
}

function MiniKpi({
  tone,
  label,
  value,
}: {
  tone: "forest" | "dark" | "cream";
  label: string;
  value: string;
}) {
  const cls =
    tone === "dark"
      ? "bg-ink-900 text-paper-1"
      : tone === "forest"
        ? "bg-forest-500 text-white"
        : "bg-paper-0 text-ink-900 border border-paper-3";
  return (
    <div className={`rounded-[12px] p-3 ${cls}`}>
      <div className={`text-[9px] uppercase tracking-[0.14em] ${tone === "cream" ? "text-ink-500" : "opacity-75"}`}>
        {label}
      </div>
      <div className="font-display text-[22px] font-medium leading-none mt-1">
        {value}
      </div>
    </div>
  );
}

function PresetCard({
  icon,
  name,
  desc,
  services,
}: {
  icon: React.ReactNode;
  name: string;
  desc: string;
  services: number;
}) {
  return (
    <div className="card p-6 flex flex-col gap-3">
      <div className="w-11 h-11 rounded-[10px] bg-forest-50 text-forest-600 grid place-items-center">
        {icon}
      </div>
      <div className="font-display text-[18px] mt-1">{name}</div>
      <div className="text-[13px] text-ink-500">{desc}</div>
      <div className="mt-auto pt-4 border-t border-paper-3 text-[11px] text-ink-500 font-mono">
        {services} บริการเริ่มต้น
      </div>
    </div>
  );
}

function PricingCard({
  name,
  desc,
  price,
  per,
  features,
  featured,
}: {
  name: string;
  desc: string;
  price: string;
  per: string;
  features: string[];
  featured?: boolean;
}) {
  const surfaceCls = featured
    ? "bg-ink-900 text-paper-1 border-transparent"
    : "bg-paper-0 text-ink-900 border-paper-3";
  const subCls = featured ? "text-white/65" : "text-ink-500";

  return (
    <div className={`rounded-[16px] border ${surfaceCls} p-8 relative shadow-soft`}>
      {featured && (
        <span className="absolute -top-3 left-6 pill bg-ochre-200 text-ochre-700">แนะนำ</span>
      )}
      <div className="font-display text-[24px] font-medium">{name}</div>
      <div className={`text-[12px] ${subCls} mt-0.5 mb-5`}>{desc}</div>
      <div className="flex items-baseline gap-1.5 mb-6">
        <span className="font-display text-[48px] font-medium leading-none">฿{price}</span>
        <span className={`text-[13px] ${subCls}`}>{per}</span>
      </div>
      <div className="flex flex-col gap-2.5 mb-6">
        {features.map((f) => (
          <div key={f} className="flex items-center gap-2 text-[13px]">
            <Check size={14} className={featured ? "text-sage-200" : "text-forest-500"} />
            <span>{f}</span>
          </div>
        ))}
      </div>
      <Link
        href="/signup"
        className={`${featured ? "btn-primary" : "btn-secondary"} w-full justify-center`}
      >
        เลือกแผนนี้
      </Link>
    </div>
  );
}

function FooterCol({
  heading,
  items,
}: {
  heading: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="text-white/45 mb-3 tracking-[0.1em] uppercase text-[10px]">{heading}</div>
      <div className="flex flex-col gap-2">
        {items.map((i) => (
          <Link key={i.label} href={i.href} className="text-paper-2/85 hover:text-white transition">
            {i.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
