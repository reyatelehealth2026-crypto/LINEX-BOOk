import type { BusinessPreset } from "./types";

export const salonPreset: BusinessPreset = {
  key: "salon",
  label_th: "ร้านเสริมสวย / ร้านตัดผม",
  label_en: "Salon / Barber",
  tagline_th: "บริการตัด / สี / ทรีตเมนต์ เหมาะกับร้านเสริมสวยและบาร์เบอร์",
  emoji: "💇",
  theme_id: "beauty",
  services: [
    { name: "ตัดผมชาย",    name_en: "Men's Haircut",     duration_min: 45,  price: 250,  sort_order: 1 },
    { name: "ตัดผม + สระ", name_en: "Cut + Wash",        duration_min: 60,  price: 350,  sort_order: 2 },
    { name: "สระ + ไดร์",   name_en: "Wash + Blow Dry",  duration_min: 45,  price: 300,  sort_order: 3 },
    { name: "ทำสีผม",      name_en: "Hair Coloring",     duration_min: 120, price: 1200, sort_order: 4 },
    { name: "ทรีตเมนต์",    name_en: "Hair Treatment",    duration_min: 60,  price: 800,  sort_order: 5 },
    { name: "ดัด / ยืด",    name_en: "Perm / Straighten", duration_min: 180, price: 2500, sort_order: 6 },
  ],
  staff_roles: ["สไตลิสต์", "ช่างตัดผม"],
  default_hours: [
    { day_of_week: 1, open_time: "10:00", close_time: "20:00" },
    { day_of_week: 2, open_time: "10:00", close_time: "20:00" },
    { day_of_week: 3, open_time: "10:00", close_time: "20:00" },
    { day_of_week: 4, open_time: "10:00", close_time: "20:00" },
    { day_of_week: 5, open_time: "10:00", close_time: "20:00" },
    { day_of_week: 6, open_time: "10:00", close_time: "20:00" },
  ],
  message_templates: [
    {
      name: "เตือนนัด 1 ชั่วโมง",
      category: "reminder",
      subject: "⏰ แจ้งเตือนนัด",
      body: "สวัสดีค่ะ {{customer_name}}\nเตือนว่าในอีก 1 ชั่วโมง ({{time}}) มีนัด{{service_name}} กับ{{staff_name}} ที่ {{shop_name}} นะคะ\nหากต้องการเลื่อนนัด พิมพ์มาได้เลยค่ะ 🙏",
      sort_order: 1,
    },
    {
      name: "โปรโมชั่นสีผมประจำเดือน",
      category: "promo",
      subject: "🎉 โปรสีผมเดือนนี้",
      body: "สวัสดีค่ะ {{customer_name}}\nเดือนนี้ทำสีผมที่ {{shop_name}} ลด 15% ทุกเฉด\nจองเลยที่นี่นะคะ →",
      sort_order: 2,
    },
    {
      name: "ขอบคุณหลังตัด",
      category: "follow_up",
      subject: "ขอบคุณที่ใช้บริการ 💛",
      body: "ขอบคุณค่ะ {{customer_name}} ที่มาใช้บริการ{{service_name}} ที่ {{shop_name}}\nหวังว่าจะถูกใจทรงใหม่นะคะ ✨",
      sort_order: 3,
    },
  ],
};
