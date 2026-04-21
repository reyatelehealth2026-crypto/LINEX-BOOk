import type { BusinessPreset } from "./types";

export const nailPreset: BusinessPreset = {
  key: "nail",
  label_th: "ร้านทำเล็บ",
  label_en: "Nail Salon",
  tagline_th: "บริการทำเล็บมือ เล็บเท้า ต่อเล็บ เพ้นท์ลาย",
  emoji: "💅",
  theme_id: "beauty",
  services: [
    { name: "ทำเล็บมือ",        name_en: "Manicure",           duration_min: 45,  price: 250,  sort_order: 1 },
    { name: "ทำเล็บเท้า",       name_en: "Pedicure",           duration_min: 60,  price: 350,  sort_order: 2 },
    { name: "สปามือ",           name_en: "Hand Spa",           duration_min: 45,  price: 300,  sort_order: 3 },
    { name: "เจลสีเล็บมือ",      name_en: "Gel Manicure",       duration_min: 75,  price: 500,  sort_order: 4 },
    { name: "เจลสีเล็บเท้า",     name_en: "Gel Pedicure",       duration_min: 90,  price: 650,  sort_order: 5 },
    { name: "ต่อเล็บอะคริลิค",   name_en: "Acrylic Extensions", duration_min: 120, price: 900,  sort_order: 6 },
    { name: "เพ้นท์ลาย 1 ลาย",   name_en: "Nail Art (1 design)", duration_min: 20, price: 150,  sort_order: 7 },
  ],
  staff_roles: ["ช่างเล็บ", "Nail Artist"],
  default_hours: [
    { day_of_week: 0, open_time: "11:00", close_time: "21:00" },
    { day_of_week: 1, open_time: "11:00", close_time: "21:00" },
    { day_of_week: 2, open_time: "11:00", close_time: "21:00" },
    { day_of_week: 3, open_time: "11:00", close_time: "21:00" },
    { day_of_week: 4, open_time: "11:00", close_time: "21:00" },
    { day_of_week: 5, open_time: "11:00", close_time: "21:00" },
    { day_of_week: 6, open_time: "11:00", close_time: "21:00" },
  ],
  message_templates: [
    {
      name: "เตือนนัดทำเล็บ",
      category: "reminder",
      subject: "⏰ แจ้งเตือนนัดทำเล็บ",
      body: "สวัสดีค่ะ {{customer_name}} 💅\nเตือนว่าในอีก 1 ชั่วโมง ({{time}}) มีนัด{{service_name}} กับ{{staff_name}} ที่ {{shop_name}} นะคะ\nหากติดธุระพิมพ์มาบอกได้เลยค่ะ 🙏",
      sort_order: 1,
    },
    {
      name: "โปรเจลคู่มือ-เท้า",
      category: "promo",
      subject: "🎉 โปรเจลคู่",
      body: "สวัสดีค่ะ {{customer_name}}\nเดือนนี้ทำเจลสีคู่มือ+เท้าที่ {{shop_name}} ลด 100 บาท\nจองล่วงหน้ารับแต้มเพิ่ม 2 เท่า 💕",
      sort_order: 2,
    },
    {
      name: "ขอบคุณหลังใช้บริการ",
      category: "follow_up",
      subject: "ขอบคุณที่ใช้บริการ 💖",
      body: "ขอบคุณค่ะ {{customer_name}} ที่มาทำเล็บที่ {{shop_name}} นะคะ\nหวังว่าจะถูกใจลาย ถ่ายรูปลายสวยๆ ส่งกลับมาอวดเราได้เลยค่ะ ✨",
      sort_order: 3,
    },
  ],
};
