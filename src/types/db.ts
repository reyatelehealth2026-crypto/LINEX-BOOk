// Database row types — kept in sync with supabase/schema.sql
export type Shop = {
  id: number;
  name: string;
  timezone: string;
  phone: string | null;
  address: string | null;
  line_oa_id: string | null;
  points_per_baht: number;
  created_at: string;
};

export type Service = {
  id: number;
  shop_id: number;
  name: string;
  name_en: string | null;
  description: string | null;
  duration_min: number;
  price: number;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type Staff = {
  id: number;
  shop_id: number;
  name: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type WorkingHours = {
  id: number;
  shop_id: number;
  staff_id: number | null;
  day_of_week: number; // 0=Sun..6=Sat
  open_time: string;   // 'HH:MM:SS'
  close_time: string;
};

export type TimeOff = {
  id: number;
  shop_id: number;
  staff_id: number | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type Customer = {
  id: number;
  shop_id: number;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  full_name: string | null;
  phone: string | null;
  birthday: string | null;
  points: number;
  visit_count: number;
  registered_at: string | null;
  created_at: string;
};

export type LineAdminSession = {
  id: number;
  shop_id: number;
  line_user_id: string;
  authed_at: string;
  expires_at: string;
  created_at: string;
  wizard_step: string | null;
  wizard_payload: Record<string, any>;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type Booking = {
  id: number;
  shop_id: number;
  customer_id: number;
  service_id: number;
  staff_id: number | null;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  note: string | null;
  price: number;
  points_earned: number;
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingWithJoins = Booking & {
  service: Pick<Service, "id" | "name" | "name_en" | "duration_min" | "price"> | null;
  staff: Pick<Staff, "id" | "name" | "nickname"> | null;
  customer: Pick<Customer, "id" | "display_name" | "full_name" | "phone" | "picture_url" | "line_user_id"> | null;
};

export type WaitlistStatus = "waiting" | "notified" | "fulfilled" | "expired" | "cancelled";

export type WaitlistEntry = {
  id: number;
  shop_id: number;
  customer_id: number;
  service_id: number;
  staff_id: number | null;
  desired_date: string; // 'YYYY-MM-DD'
  desired_time: string | null; // 'HH:MM:SS' or null
  status: WaitlistStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type WaitlistEntryWithJoins = WaitlistEntry & {
  service: Pick<Service, "id" | "name" | "name_en" | "duration_min"> | null;
  staff: Pick<Staff, "id" | "name" | "nickname"> | null;
  customer: Pick<Customer, "id" | "display_name" | "full_name" | "phone" | "line_user_id"> | null;
};

export type Review = {
  id: number;
  shop_id: number;
  booking_id: number;
  customer_id: number;
  service_id: number;
  staff_id: number | null;
  rating: number; // 1-5
  comment: string | null;
  created_at: string;
};

export type ReviewWithJoins = Review & {
  service: Pick<Service, "id" | "name" | "name_en"> | null;
  staff: Pick<Staff, "id" | "name" | "nickname"> | null;
  customer: Pick<Customer, "id" | "display_name" | "full_name" | "picture_url"> | null;
};

/** Minimal info for rebook pre-fill from a past completed booking. */
export type RebookInfo = {
  booking_id: number;
  service: Pick<Service, "id" | "name" | "name_en" | "duration_min" | "price">;
  staff: Pick<Staff, "id" | "name" | "nickname" | "avatar_url"> | null;
  completed_at: string;
};

export type TemplateCategory = "reminder" | "promo" | "follow_up" | "custom";

export type MessageTemplate = {
  id: number;
  shop_id: number;
  name: string;
  category: TemplateCategory;
  subject: string | null;
  body: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
