import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 mesh-bg opacity-70 pointer-events-none" />
      <div className="linex-panel max-w-md w-full p-8 text-center space-y-5 animate-fade-up relative">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-linex-600 text-white flex items-center justify-center text-2xl shadow-linex-glow animate-float">
          💚
        </div>
        <div>
          <div className="linex-kicker mb-1">Booking System</div>
          <h1 className="linex-title text-3xl gradient-text">LineBook</h1>
          <p className="text-sm text-ink-500 mt-2">ระบบจองคิวผ่าน LINE<br/>ร้านตัดผม / เสริมสวย / ทำเล็บ</p>
        </div>
        <div className="flex flex-col gap-2.5 pt-2">
          <Link href="/liff" className="glow-btn w-full justify-center">เปิดหน้า LIFF</Link>
          <Link href="/admin" className="btn-secondary w-full">หน้าแอดมิน</Link>
        </div>
        <p className="text-[11px] text-ink-400 pt-1">
          หน้า LIFF ต้องเปิดผ่าน LINE app หรือ <code className="bg-ink-100 px-1.5 py-0.5 rounded-md font-mono text-[10px]">liff.line.me/&lt;LIFF_ID&gt;</code>
        </p>
      </div>
    </main>
  );
}
