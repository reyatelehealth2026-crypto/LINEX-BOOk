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
