import type { ThemeId } from "@/lib/themes";

export type PresetKey = "salon" | "nail" | "spa";

export type PresetService = {
  name: string;        // TH display name
  name_en: string;
  description?: string;
  duration_min: number;
  price: number;
  sort_order: number;
};

export type PresetHours = {
  day_of_week: number; // 0=Sun..6=Sat
  open_time: string;   // "HH:MM"
  close_time: string;
};

export type PresetTemplate = {
  name: string;
  category: "reminder" | "promo" | "follow_up" | "custom";
  subject?: string;
  body: string;
  sort_order: number;
};

export type BusinessPreset = {
  key: PresetKey;
  label_th: string;
  label_en: string;
  tagline_th: string;
  emoji: string;
  theme_id: ThemeId;
  services: PresetService[];
  staff_roles: string[];       // suggested role labels (seeded into "bio" of placeholder staff)
  default_hours: PresetHours[];
  message_templates: PresetTemplate[];
};
