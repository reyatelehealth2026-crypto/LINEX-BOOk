import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-lg w-full p-8 text-center space-y-4">
        <div className="text-5xl">💚</div>
        <h1 className="text-2xl font-bold">LineBook</h1>
        <p className="text-neutral-600">ระบบจองคิวผ่าน LINE สำหรับร้านตัดผม / เสริมสวย / ทำเล็บ</p>
        <div className="flex flex-col gap-2 pt-4">
          <Link href="/liff" className="btn-primary">เปิดหน้า LIFF (ทดสอบ)</Link>
          <Link href="/admin" className="btn-secondary">หน้าแอดมิน</Link>
        </div>
        <p className="text-xs text-neutral-400 pt-4">
          หน้า LIFF จะต้องเปิดผ่าน LINE app หรือ <code>liff.line.me/&lt;LIFF_ID&gt;</code>
        </p>
      </div>
    </main>
  );
}
