import type { BusinessPreset } from "./types";

export const spaPreset: BusinessPreset = {
  key: "spa",
  label_th: "สปา / ร้านนวด",
  label_en: "Spa / Massage",
  tagline_th: "บริการนวดไทย นวดน้ำมัน อโรม่า สปาหน้า สปาตัว",
  emoji: "🌿",
  theme_id: "wellness",
  services: [
    { name: "นวดไทย 60 นาที",        name_en: "Thai Massage 60 min",      duration_min: 60,  price: 450,  sort_order: 1 },
    { name: "นวดไทย 90 นาที",        name_en: "Thai Massage 90 min",      duration_min: 90,  price: 650,  sort_order: 2 },
    { name: "นวดน้ำมัน 60 นาที",       name_en: "Oil Massage 60 min",       duration_min: 60,  price: 600,  sort_order: 3 },
    { name: "นวดอโรม่า 90 นาที",      name_en: "Aromatherapy 90 min",      duration_min: 90,  price: 900,  sort_order: 4 },
    { name: "นวดฝ่าเท้า 60 นาที",     name_en: "Foot Massage 60 min",      duration_min: 60,  price: 350,  sort_order: 5 },
    { name: "สปาหน้า",              name_en: "Facial Spa",                duration_min: 60,  price: 800,  sort_order: 6 },
    { name: "สปาตัว + ขัดผิว",        name_en: "Body Scrub + Spa",         duration_min: 120, price: 1200, sort_order: 7 },
  ],
  staff_roles: ["หมอนวด", "Therapist"],
  default_hours: [
    { day_of_week: 0, open_time: "10:00", close_time: "22:00" },
    { day_of_week: 1, open_time: "10:00", close_time: "22:00" },
    { day_of_week: 2, open_time: "10:00", close_time: "22:00" },
    { day_of_week: 3, open_time: "10:00", close_time: "22:00" },
    { day_of_week: 4, open_time: "10:00", close_time: "22:00" },
    { day_of_week: 5, open_time: "10:00", close_time: "22:00" },
    { day_of_week: 6, open_time: "10:00", close_time: "22:00" },
  ],
  message_templates: [
    {
      name: "เตือนนัดสปา",
      category: "reminder",
      subject: "⏰ แจ้งเตือนนัดสปา",
      body: "สวัสดีค่ะ {{customer_name}} 🌿\nเตือนว่าในอีก 1 ชั่วโมง ({{time}}) มีนัด{{service_name}} กับ{{staff_name}} ที่ {{shop_name}}\nกรุณามาก่อนเวลา 10 นาทีเพื่อเปลี่ยนเสื้อผ้าและผ่อนคลายนะคะ 🙏",
      sort_order: 1,
    },
    {
      name: "โปรแพ็กเกจสปา",
      category: "promo",
      subject: "🎉 แพ็กเกจสปาเดือนนี้",
      body: "สวัสดีค่ะ {{customer_name}}\nเดือนนี้ที่ {{shop_name}} มีแพ็กเกจสปา 3 ครั้ง ราคาพิเศษ\nจองล่วงหน้ารับส่วนลดเพิ่มอีก 10% 🌸",
      sort_order: 2,
    },
    {
      name: "ขอบคุณหลังนวด",
      category: "follow_up",
      subject: "ขอบคุณที่ใช้บริการ 🌿",
      body: "ขอบคุณค่ะ {{customer_name}} ที่มาใช้บริการ{{service_name}} ที่ {{shop_name}}\nอย่าลืมดื่มน้ำเยอะๆ หลังนวดนะคะ แล้วเจอกันใหม่ ✨",
      sort_order: 3,
    },
  ],
};
