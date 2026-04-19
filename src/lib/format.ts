import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TZ = process.env.SHOP_TIMEZONE || "Asia/Bangkok";

const THAI_DAY = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const THAI_MONTH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

export function formatDateTH(iso: string): string {
  const d = toZonedTime(new Date(iso), TZ);
  return `${THAI_DAY[d.getDay()]} ${d.getDate()} ${THAI_MONTH[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function formatTimeRange(startIso: string, endIso: string): string {
  const s = toZonedTime(new Date(startIso), TZ);
  const e = toZonedTime(new Date(endIso), TZ);
  return `${format(s, "HH:mm")} – ${format(e, "HH:mm")}`;
}

export function formatTime(iso: string): string {
  return format(toZonedTime(new Date(iso), TZ), "HH:mm");
}
