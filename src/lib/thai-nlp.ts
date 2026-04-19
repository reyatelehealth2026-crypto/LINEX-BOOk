// thai-nlp.ts — Thai natural language parser for booking & admin commands.
// Parses conversational Thai into structured booking intent or admin action.

import type { Service, Staff } from "@/types/db";

// ───────────────── Types ─────────────────

export interface BookingIntent {
  serviceId?: number;
  staffId?: number;
  date?: string; // YYYY-MM-DD (shop-local)
  time?: string; // HH:mm (shop-local)
  confidence: "high" | "medium" | "low";
  missing: ("service" | "date" | "time")[];
  original: string;
}

export interface AdminCommand {
  action:
    | "queue_today"
    | "queue_tomorrow"
    | "queue_date"
    | "revenue"
    | "setup_menu"
    | "help"
    | "logout"
    | "confirm"
    | "complete"
    | "cancel"
    | "noshow"
    | "add_service"
    | "add_staff"
    | "set_shop_name"
    | "set_shop_phone"
    | "set_shop_address"
    | "set_hours"
    | "set_staff_hours";
  args: Record<string, any>;
}

// ───────────────── Constants ─────────────────

const THAI_NUMS: Record<string, number> = {
  หนึ่ง: 1, เอ็ด: 1,
  สอง: 2,
  สาม: 3,
  สี่: 4,
  ห้า: 5,
  หก: 6,
  เจ็ด: 7,
  แปด: 8,
  เก้า: 9,
  สิบ: 10,
  ยี่สิบ: 20, ยีสิบ: 20,
  สามสิบ: 30,
  สี่สิบ: 40,
  ห้าสิบ: 50,
};

function thaiNum(n: number): string {
  const map = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  if (n <= 9) return map[n];
  if (n === 10) return "สิบ";
  if (n === 11) return "สิบเอ็ด";
  if (n < 20) return "สิบ" + map[n - 10];
  if (n % 10 === 0) {
    const tens = n / 10;
    return (tens === 2 ? "ยี่" : map[tens]) + "สิบ";
  }
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (tens === 2 ? "ยี่" : map[tens]) + "สิบ" + (ones === 1 ? "เอ็ด" : map[ones]);
}

const THAI_MONTHS: [string[], number][] = [
  [["มกราคม", "มกรา", "ม.ค.", "มค"], 1],
  [["กุมภาพันธ์", "กุมภา", "ก.พ.", "กพ"], 2],
  [["มีนาคม", "มี.ค.", "มีค"], 3],
  [["เมษายน", "เม.ย.", "เมย", "เม.ษ."], 4],
  [["พฤษภาคม", "พฤษภา", "พ.ค.", "พค"], 5],
  [["มิถุนายน", "มิ.ย.", "มิย", "มิถุนา"], 6],
  [["กรกฎาคม", "ก.ค.", "กค"], 7],
  [["สิงหาคม", "ส.ค.", "สค"], 8],
  [["กันยายน", "ก.ย.", "กย"], 9],
  [["ตุลาคม", "ต.ค.", "ตค"], 10],
  [["พฤศจิกายน", "พ.ย.", "พย"], 11],
  [["ธันวาคม", "ธันวา", "ธ.ค.", "ธค"], 12],
];

const THAI_DAYS: [string[], number][] = [
  [["อาทิตย์", "อา."], 0],
  [["จันทร์", "จ."], 1],
  [["อังคาร", "อัง.", "อ."], 2],
  [["พุธ", "พ."], 3],
  [["พฤหัสบดี", "พฤหัส", "พฤ."], 4],
  [["ศุกร์", "ศ."], 5],
  [["เสาร์", "ส."], 6],
];

// ───────────────── Helpers ─────────────────

function normalize(text: string): string {
  return text
    .replace(/\s+/g, "")
    .replace(/[+\+]/g, "+")
    .toLowerCase();
}

function normalizeLoose(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextDayOfWeek(target: number): string {
  const d = new Date();
  const current = d.getDay();
  let diff = target - current;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function parseDayOfWeek(raw: string): number | null {
  const t = normalizeLoose(raw);
  for (const [aliases, day] of THAI_DAYS) {
    if (aliases.some((a) => t === a.toLowerCase() || t.includes(a.toLowerCase()))) return day;
  }

  if (/sun/.test(t)) return 0;
  if (/mon/.test(t)) return 1;
  if (/tue/.test(t)) return 2;
  if (/wed/.test(t)) return 3;
  if (/thu/.test(t)) return 4;
  if (/fri/.test(t)) return 5;
  if (/sat/.test(t)) return 6;

  return null;
}

// ───────────────── Time Extraction ─────────────────

interface TimeMatch {
  hour: number;
  minute: number;
  start: number;
  end: number;
}

function extractTime(raw: string): TimeMatch | null {
  const t = normalize(raw);
  let match: TimeMatch | null = null;

  // 1) Digital: "14:00", "14.00", "14:30"
  {
    const m = raw.match(/(\d{1,2})[:.](\d{2})/);
    if (m) {
      const h = parseInt(m[1]);
      const min = parseInt(m[2]);
      if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
        match = { hour: h, minute: min, start: m.index!, end: m.index! + m[0].length };
      }
    }
  }

  // 2) "Xน." / "Xนาฬิกา"
  if (!match) {
    const m = raw.match(/(\d{1,2})\s*(?:นาฬิกา|น\.?)/);
    if (m) {
      const h = parseInt(m[1]);
      if (h >= 1 && h <= 23) {
        match = { hour: h, minute: 0, start: m.index!, end: m.index! + m[0].length };
      }
    }
  }

  // 3) "เที่ยง[ครึ่ง]"
  if (!match) {
    if (t.includes("เที่ยงคืน")) {
      match = { hour: 0, minute: 0, start: t.indexOf("เที่ยงคืน"), end: t.indexOf("เที่ยงคืน") + 8 };
    } else if (t.includes("เที่ยงครึ่ง")) {
      match = { hour: 12, minute: 30, start: t.indexOf("เที่ยงครึ่ง"), end: t.indexOf("เที่ยงครึ่ง") + 11 };
    } else if (t.includes("เที่ยง")) {
      match = { hour: 12, minute: 0, start: t.indexOf("เที่ยง"), end: t.indexOf("เที่ยง") + 4 };
    }
  }

  // 4) "บ่าย[ThaiNum][ครึ่ง|Xสิบ]?"
  if (!match) {
    for (let n = 5; n >= 1; n--) {
      const word = thaiNum(n);
      // "บ่ายสองครึ่ง" = 14:30
      const patHalf = `บ่าย${word}ครึ่ง`;
      if (t.includes(patHalf)) {
        match = { hour: 12 + n, minute: 30, start: t.indexOf(patHalf), end: t.indexOf(patHalf) + patHalf.length };
        break;
      }
      // "บ่ายสอง"
      const pat = `บ่าย${word}`;
      if (t.includes(pat)) {
        match = { hour: 12 + n, minute: 0, start: t.indexOf(pat), end: t.indexOf(pat) + pat.length };
        break;
      }
    }
    // "บ่ายโมง" = 13:00
    if (!match && t.includes("บ่ายโมง")) {
      match = { hour: 13, minute: 0, start: t.indexOf("บ่ายโมง"), end: t.indexOf("บ่ายโมง") + 7 };
    }
  }

  // 5) "[ThaiNum]โมง[ครึ่ง|ThaiNumสิบ]?[เช้า|เย็น]?"
  if (!match) {
    for (let n = 12; n >= 1; n--) {
      const word = thaiNum(n);
      // "[n]โมงครึ่ง"
      const patHalf = `${word}โมงครึ่ง`;
      if (t.includes(patHalf)) {
        let hour = n >= 7 ? n : n + 12; // 7-12 = morning, 1-6 = assume afternoon
        if (t.includes("เช้า") && n <= 6) hour = n;
        if (t.includes("เย็น") && n <= 6) hour = n + 12;
        match = { hour, minute: 30, start: t.indexOf(patHalf), end: t.indexOf(patHalf) + patHalf.length };
        break;
      }

      // "[n]โมง"
      const pat = `${word}โมง`;
      if (t.includes(pat)) {
        let hour = n >= 7 ? n : n + 12; // 7-12 stay, 1-6 → +12
        if (t.includes("เช้า") && n <= 6) hour = n;
        if (t.includes("เย็น") && n <= 6) hour = n + 12;
        match = { hour, minute: 0, start: t.indexOf(pat), end: t.indexOf(pat) + pat.length };
        break;
      }
    }
  }

  // 6) "ตี[ThaiNum]"
  if (!match) {
    for (let n = 5; n >= 1; n--) {
      const pat = `ตี${thaiNum(n)}`;
      if (t.includes(pat)) {
        match = { hour: n, minute: 0, start: t.indexOf(pat), end: t.indexOf(pat) + pat.length };
        break;
      }
    }
  }

  // 7) "[ThaiNum]ทุ่ม"
  if (!match) {
    for (let n = 7; n >= 1; n--) {
      const pat = `${thaiNum(n)}ทุ่ม`;
      if (t.includes(pat)) {
        match = { hour: 18 + n, minute: 0, start: t.indexOf(pat), end: t.indexOf(pat) + pat.length };
        break;
      }
    }
  }

  // 8) Time keywords
  if (!match) {
    if (t.includes("ตอนเช้า")) {
      match = { hour: 10, minute: 0, start: t.indexOf("ตอนเช้า"), end: t.indexOf("ตอนเช้า") + 7 };
    } else if (t.includes("ตอนบ่าย")) {
      match = { hour: 14, minute: 0, start: t.indexOf("ตอนบ่าย"), end: t.indexOf("ตอนบ่าย") + 7 };
    } else if (t.includes("ตอนเย็น")) {
      match = { hour: 17, minute: 0, start: t.indexOf("ตอนเย็น"), end: t.indexOf("ตอนเย็น") + 7 };
    }
  }

  return match;
}

// ───────────────── Date Extraction ─────────────────

interface DateMatch {
  date: string; // YYYY-MM-DD
  start: number;
  end: number;
}

function extractDate(raw: string): DateMatch | null {
  const t = normalize(raw);

  // 1) "วันนี้"
  if (t.includes("วันนี้")) {
    return { date: today(), start: t.indexOf("วันนี้"), end: t.indexOf("วันนี้") + 5 };
  }

  // 2) "พรุ่งนี้" / "วันพรุ่งนี้"
  if (t.includes("พรุ่งนี้")) {
    return { date: addDays(1), start: t.indexOf("พรุ่งนี้"), end: t.indexOf("พรุ่งนี้") + 8 };
  }

  // 3) "มะรืน[นี้]"
  if (t.includes("มะรืน")) {
    return { date: addDays(2), start: t.indexOf("มะรืน"), end: t.indexOf("มะรืน") + 4 };
  }

  // 4) "วัน[Day][หน้า]" — e.g. "วันจันทร์หน้า"
  for (const [names, dow] of THAI_DAYS) {
    for (const name of names) {
      const patWithNext = `วัน${name}หน้า`;
      if (raw.includes(patWithNext)) {
        const d = new Date();
        const current = d.getDay();
        let diff = dow - current;
        if (diff <= 0) diff += 7;
        diff += 7; // next week
        d.setDate(d.getDate() + diff);
        return { date: d.toISOString().slice(0, 10), start: raw.indexOf(patWithNext), end: raw.indexOf(patWithNext) + patWithNext.length };
      }
      const pat = `วัน${name}`;
      if (raw.includes(pat)) {
        return { date: nextDayOfWeek(dow), start: raw.indexOf(pat), end: raw.indexOf(pat) + pat.length };
      }
    }
  }

  // 5) "[Day]หน้า" without วัน — e.g. "จันทร์หน้า"
  for (const [names, dow] of THAI_DAYS) {
    for (const name of names) {
      if (name.length <= 2) continue; // skip abbreviations to avoid false matches
      const patWithNext = `${name}หน้า`;
      if (raw.includes(patWithNext)) {
        const d = new Date();
        const current = d.getDay();
        let diff = dow - current;
        if (diff <= 0) diff += 7;
        diff += 7;
        d.setDate(d.getDate() + diff);
        return { date: d.toISOString().slice(0, 10), start: raw.indexOf(patWithNext), end: raw.indexOf(patWithNext) + patWithNext.length };
      }
      // Just day name → next occurrence
      if (raw.includes(name) && !raw.includes("วัน" + name)) {
        return { date: nextDayOfWeek(dow), start: raw.indexOf(name), end: raw.indexOf(name) + name.length };
      }
    }
  }

  // 6) Digital date: "20/4", "20-04", "20/04/69", "20-04-2026"
  {
    const m = raw.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
    if (m) {
      let day = parseInt(m[1]);
      let month = parseInt(m[2]);
      let year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
      if (year < 100) year += 2000;
      if (year > 2100) year -= 543; // Buddhist year
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const d = new Date(year, month - 1, day);
        const iso = d.toISOString().slice(0, 10);
        return { date: iso, start: m.index!, end: m.index! + m[0].length };
      }
    }
  }

  // 7) "[N][Month]" — e.g. "20เม.ย.", "20พฤษภา"
  for (const [names, month] of THAI_MONTHS) {
    for (const name of names) {
      const pat = raw.match(new RegExp(`(\\d{1,2})\\s*${name.replace(".", "\\.")}`));
      if (pat) {
        const day = parseInt(pat[1]);
        const year = new Date().getFullYear();
        const d = new Date(year, month - 1, day);
        // If the date is in the past, try next year
        if (d < new Date()) d.setFullYear(year + 1);
        return { date: d.toISOString().slice(0, 10), start: pat.index!, end: pat.index! + pat[0].length };
      }
    }
  }

  return null;
}

// ───────────────── Service Matching ─────────────────

interface ServiceMatch {
  serviceId: number;
  name: string;
  start: number;
  end: number;
}

function matchService(raw: string, services: Array<Pick<Service, "id" | "name" | "name_en">>): ServiceMatch | null {
  const t = normalizeLoose(raw);
  // Sort by name length descending (longest match first)
  const sorted = [...services].sort((a, b) => b.name.length - a.name.length);

  for (const svc of sorted) {
    // Try Thai name
    const idx = t.indexOf(svc.name.toLowerCase());
    if (idx !== -1) {
      return { serviceId: svc.id, name: svc.name, start: idx, end: idx + svc.name.length };
    }
    // Try English name
    if (svc.name_en) {
      const idxEn = t.indexOf(svc.name_en.toLowerCase());
      if (idxEn !== -1) {
        return { serviceId: svc.id, name: svc.name, start: idxEn, end: idxEn + svc.name_en.length };
      }
    }
    // Try partial match on key words
    const words = svc.name.split(/[+\s]/).filter(w => w.length >= 3);
    for (const w of words) {
      if (t.includes(w.toLowerCase())) {
        return { serviceId: svc.id, name: svc.name, start: t.indexOf(w.toLowerCase()), end: t.indexOf(w.toLowerCase()) + w.length };
      }
    }
  }

  return null;
}

// ───────────────── Staff Matching ─────────────────

interface StaffMatch {
  staffId: number;
  name: string;
}

function matchStaff(raw: string, staff: Array<Pick<Staff, "id" | "name" | "nickname">>): StaffMatch | null {
  const t = normalizeLoose(raw);

  // Sort by name length descending
  const sorted = [...staff].sort((a, b) => (b.nickname ?? b.name).length - (a.nickname ?? a.name).length);

  for (const s of sorted) {
    // Try "พี่[Nickname]" or "[Nickname]"
    if (s.nickname) {
      if (t.includes(`พี่${s.nickname.toLowerCase()}`) || t.includes(s.nickname.toLowerCase())) {
        return { staffId: s.id, name: s.nickname };
      }
    }
    // Try full name
    if (t.includes(s.name.toLowerCase())) {
      return { staffId: s.id, name: s.nickname ?? s.name };
    }
    // Try "ช่าง[Name]"
    if (t.includes(`ช่าง${s.name.toLowerCase()}`) || (s.nickname && t.includes(`ช่าง${s.nickname.toLowerCase()}`))) {
      return { staffId: s.id, name: s.nickname ?? s.name };
    }
  }

  return null;
}

// ───────────────── Intent Detection ─────────────────

function isBookingIntent(text: string): boolean {
  const t = normalizeLoose(text);
  return /จอง|book|booking|จองคิว|จองนัด|อยากจอง|ขอจอง|จองตั๋ว|นัด|เขียนคิว|จัดคิว|ลงคิว|ลงนัด/i.test(t);
}

// ───────────────── Main: Parse Booking Intent ─────────────────

export function parseBookingIntent(
  raw: string,
  services: Array<Pick<Service, "id" | "name" | "name_en">>,
  staff: Array<Pick<Staff, "id" | "name" | "nickname">>
): BookingIntent | null {
  if (!isBookingIntent(raw)) return null;

  const result: BookingIntent = {
    confidence: "low",
    missing: [],
    original: raw,
  };

  // Extract time
  const timeMatch = extractTime(raw);
  if (timeMatch) {
    result.time = `${String(timeMatch.hour).padStart(2, "0")}:${String(timeMatch.minute).padStart(2, "0")}`;
  }

  // Extract date
  const dateMatch = extractDate(raw);
  if (dateMatch) {
    result.date = dateMatch.date;
  }

  // Match service
  const svcMatch = matchService(raw, services);
  if (svcMatch) {
    result.serviceId = svcMatch.serviceId;
  }

  // Match staff
  const stfMatch = matchStaff(raw, staff);
  if (stfMatch) {
    result.staffId = stfMatch.staffId;
  }

  // Determine missing fields
  if (!result.serviceId) result.missing.push("service");
  if (!result.date) result.missing.push("date");
  if (!result.time) result.missing.push("time");

  // Determine confidence
  const found = 3 - result.missing.length;
  if (found === 3) result.confidence = "high";
  else if (found >= 1) result.confidence = "medium";
  else result.confidence = "low";

  // Return only if we found at least one booking field
  if (found === 0) return null;

  return result;
}

// ───────────────── Parse Admin Command ─────────────────

export function parseAdminCommand(raw: string): AdminCommand | null {
  const t = normalizeLoose(raw);

  if (/^(?:ตั้งค่าแอดมิน|เมนูแอดมิน|admin menu|admin setup|setup)$/i.test(t)) {
    return { action: "setup_menu", args: {} };
  }

  if (/^(?:ช่วยแอดมิน|ช่วยเหลือแอดมิน|admin help|help)$/i.test(t)) {
    return { action: "help", args: {} };
  }

  if (/^(?:ออกจากโหมดแอดมิน|ออกจากแอดมิน|admin logout|logout)$/i.test(t)) {
    return { action: "logout", args: {} };
  }

  // "ยืนยัน #5" / "ยืนยัน5" / "confirm 5"
  {
    const m = t.match(/(?:ยืนยัน|confirm)\s*[#]?\s*(\d+)/);
    if (m) return { action: "confirm", args: { id: parseInt(m[1]) } };
  }

  // "เสร็จ #5" / "เสร็จสิ้น5" / "complete 5"
  {
    const m = t.match(/(?:เสร็จ|เสร็จสิ้น|complete|done)\s*[#]?\s*(\d+)/);
    if (m) return { action: "complete", args: { id: parseInt(m[1]) } };
  }

  // "ยกเลิก #5" / "cancel 5"
  {
    const m = t.match(/(?:ยกเลิก|cancel)\s*[#]?\s*(\d+)/);
    if (m) return { action: "cancel", args: { id: parseInt(m[1]) } };
  }

  // "ไม่มา #5" / "noshow 5"
  {
    const m = t.match(/(?:ไม่มา|no.?show|noshow)\s*[#]?\s*(\d+)/);
    if (m) return { action: "noshow", args: { id: parseInt(m[1]) } };
  }

  // "คิวพรุ่งนี้" / "คิววันนี้"
  if (/คิว.*พรุ่งนี้/.test(t) || /queue.*tomorrow/.test(t)) {
    return { action: "queue_tomorrow", args: {} };
  }

  // "คิว" / "คิววันนี้" / "queue"
  if (/^(?:คิว|คิววันนี้|queue|คิววันนี้)$/.test(t) || t === "คิว" || t.startsWith("คิววันนี้")) {
    return { action: "queue_today", args: {} };
  }

  // "คิว [date]" — e.g. "คิว 20/4" "คิว วันศุกร์"
  {
    const m = t.match(/^คิว\s+(.+)/);
    if (m) {
      const dateStr = m[1];
      const dm = extractDate(dateStr);
      if (dm) {
        return { action: "queue_date", args: { date: dm.date } };
      }
    }
  }

  // "ยอด" / "ยอดวันนี้" / "revenue"
  if (/ยอด|revenue|รายได้/.test(t)) {
    return { action: "revenue", args: {} };
  }

  // "เพิ่มบริการ [name] [price] [duration]"
  {
    const m = raw.match(/เพิ่มบริการ\s+(.+?)\s+(\d+)\s*บาท?\s*(\d+)?\s*(?:นาที)?/i);
    if (m) {
      return {
        action: "add_service",
        args: { name: m[1].trim(), price: parseInt(m[2]), duration: m[3] ? parseInt(m[3]) : 60 },
      };
    }
  }

  // "เพิ่มช่าง [name]"
  {
    const m = raw.match(/เพิ่มช่าง\s+(.+)/i);
    if (m) {
      return { action: "add_staff", args: { name: m[1].trim() } };
    }
  }

  // "ตั้งชื่อร้าน [name]"
  {
    const m = raw.match(/(?:ตั้งชื่อร้าน|ชื่อร้าน)\s+(.+)/i);
    if (m) {
      return { action: "set_shop_name", args: { name: m[1].trim() } };
    }
  }

  // "เบอร์ร้าน [phone]"
  {
    const m = raw.match(/(?:เบอร์ร้าน|โทรร้าน|phone)\s+(.+)/i);
    if (m) {
      return { action: "set_shop_phone", args: { phone: m[1].trim() } };
    }
  }

  // "ที่อยู่ร้าน [address]"
  {
    const m = raw.match(/(?:ที่อยู่ร้าน|address)\s+(.+)/i);
    if (m) {
      return { action: "set_shop_address", args: { address: m[1].trim() } };
    }
  }

  // "ตั้งเวลา จันทร์ 10:00-20:00"
  {
    const m = raw.match(/(?:ตั้งเวลา|เวลาเปิดปิด)\s+(.+?)\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/i);
    if (m) {
      const dayOfWeek = parseDayOfWeek(m[1]);
      if (dayOfWeek !== null) {
        return { action: "set_hours", args: { dayOfWeek, openTime: m[2], closeTime: m[3], dayLabel: m[1].trim() } };
      }
    }
  }

  // "ตั้งเวลาช่าง พี่โอ๋ จันทร์ 10:00-20:00"
  {
    const m = raw.match(/(?:ตั้งเวลาช่าง)\s+(.+?)\s+(.+?)\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/i);
    if (m) {
      const dayOfWeek = parseDayOfWeek(m[2]);
      if (dayOfWeek !== null) {
        return {
          action: "set_staff_hours",
          args: { staffName: m[1].trim(), dayOfWeek, openTime: m[3], closeTime: m[4], dayLabel: m[2].trim() }
        };
      }
    }
  }

  return null;
}
