/* ================================================================== */
/*  LINEX Theme System — 15 industry-specific presets                  */
/*  Ported from LINEX Design System Builder                            */
/*                                                                      */
/*  Usage:                                                              */
/*    import { THEME_PRESETS, DEFAULT_THEME_ID } from "@/lib/themes";   */
/*    import { useTheme } from "@/lib/theme-context";                   */
/* ================================================================== */

export interface ThemePreset {
  id: ThemeId;
  name: { th: string; en: string };
  description: { th: string; en: string };
  category: ThemeCategory;
  colorFamily: "warm" | "cool" | "neutral";
  primary: string;
  primaryLight: string;
  primaryDark: string;
  /** Text color that passes WCAG AA on top of `primary` (button labels).
   *  Defaults to white; use dark for light primaries (e.g. yellow Fitness theme). */
  onPrimary: string;
  secondary: string;
  accent: string;
  surface: string;
  surfaceDark: string;
  glow: string;
  mesh: string;
}

export type ThemeId =
  | "linex"
  | "fnb"
  | "healthcare"
  | "fitness"
  | "beauty"
  | "hospitality"
  | "retail"
  | "education"
  | "realestate"
  | "automotive"
  | "corporate"
  | "pet"
  | "tattoo"
  | "wellness"
  | "tech";

export type ThemeCategory =
  | "technology"
  | "food"
  | "health"
  | "fitness"
  | "beauty"
  | "hospitality"
  | "retail"
  | "education"
  | "realestate"
  | "automotive"
  | "corporate"
  | "pet"
  | "lifestyle"
  | "wellness";

export const DEFAULT_THEME_ID: ThemeId = "linex";

/* ------------------------------------------------------------------ */
/*  15 Theme Presets (11 original + 4 expansion)                       */
/* ------------------------------------------------------------------ */

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "linex",
    name: { th: "LINEX", en: "LINEX" },
    description: {
      th: "ธีมต้นฉบับสีม่วง-พีช สำหรับแพลตฟอร์มจองคิว",
      en: "Original purple-peach theme for booking platforms",
    },
    category: "technology",
    colorFamily: "neutral",
    primary: "#6d3bff",
    primaryLight: "#b89cff",
    primaryDark: "#4d2b73",
    onPrimary: "#ffffff",
    secondary: "#ff9b7a",
    accent: "#d4c2ff",
    surface: "#fcfaff",
    surfaceDark: "#171220",
    glow: "0 18px 50px -18px rgb(109 59 255 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(109,59,255,0.22) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(255,155,122,0.18) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(184,156,255,0.18) 0, transparent 42%), linear-gradient(180deg, #fcfaff 0%, #f7f2ff 100%)",
  },
  {
    id: "fnb",
    name: { th: "อาหารและเครื่องดื่ม", en: "Food & Beverage" },
    description: {
      th: "โทนสีอุ่น ส้ม น้ำตาล เหมาะกับร้านอาหารและคาเฟ่",
      en: "Warm orange-brown tones for restaurants and cafes",
    },
    category: "food",
    colorFamily: "warm",
    primary: "#e8734a",
    primaryLight: "#f4a882",
    primaryDark: "#b54d28",
    onPrimary: "#ffffff",
    secondary: "#c49a6c",
    accent: "#fde8d7",
    surface: "#fef9f5",
    surfaceDark: "#2b1a0e",
    glow: "0 18px 50px -18px rgb(232 115 74 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(232,115,74,0.22) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(196,154,108,0.18) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(253,232,215,0.25) 0, transparent 42%), linear-gradient(180deg, #fef9f5 0%, #fdf2ea 100%)",
  },
  {
    id: "healthcare",
    name: { th: "สุขภาพ", en: "Healthcare" },
    description: {
      th: "โทนสะอาด ขาว ฟ้า เขียวอ่อน สำหรับคลินิกและสุขภาพ",
      en: "Clean white-blue-soft green for clinics and wellness",
    },
    category: "health",
    colorFamily: "cool",
    // Deepened primary from #38b2ac to #2c7a7b (contrast 2.49 → ~7.0) to meet WCAG AA.
    primary: "#2c7a7b",
    primaryLight: "#81e6d9",
    primaryDark: "#134e4a",
    onPrimary: "#ffffff",
    secondary: "#4299e1",
    accent: "#e6fffa",
    surface: "#f7fffe",
    surfaceDark: "#0d1f1e",
    glow: "0 18px 50px -18px rgb(44 122 123 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(44,122,123,0.22) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(66,153,225,0.15) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(129,230,217,0.18) 0, transparent 42%), linear-gradient(180deg, #f7fffe 0%, #f0fdfa 100%)",
  },
  {
    id: "fitness",
    name: { th: "ฟิตเนส", en: "Fitness" },
    description: {
      th: "โทนเข้ม ดำ เหลือง เนออน สำหรับฟิตเนสและยิม",
      en: "Bold black-yellow-neon for gyms and fitness centers",
    },
    category: "fitness",
    colorFamily: "neutral",
    primary: "#facc15",
    primaryLight: "#fef08a",
    primaryDark: "#ca8a04",
    // Yellow on white fails WCAG — button text must be black.
    onPrimary: "#171717",
    secondary: "#171717",
    accent: "#fef9c3",
    surface: "#fafaf9",
    surfaceDark: "#0a0a0a",
    glow: "0 18px 50px -18px rgb(250 204 21 / 0.50)",
    mesh: "radial-gradient(at 18% 12%, rgba(250,204,21,0.25) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(255,255,255,0.08) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(254,249,195,0.15) 0, transparent 42%), linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%)",
  },
  {
    id: "beauty",
    name: { th: "ความงาม", en: "Beauty" },
    description: {
      th: "โทนอ่อนหวาน ชมพู ทอง ครีม สำหรับความงามและสปา",
      en: "Elegant pink-gold-cream for beauty and spa",
    },
    category: "beauty",
    colorFamily: "warm",
    primary: "#ec4899",
    primaryLight: "#f9a8d4",
    primaryDark: "#be185d",
    onPrimary: "#ffffff",
    secondary: "#d4af37",
    accent: "#fce7f3",
    surface: "#fffafd",
    surfaceDark: "#1f0a14",
    glow: "0 18px 50px -18px rgb(236 72 153 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(236,72,153,0.20) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(212,175,55,0.15) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(249,168,212,0.18) 0, transparent 42%), linear-gradient(180deg, #fffafd 0%, #fdf2f8 100%)",
  },
  {
    id: "hospitality",
    name: { th: "โรงแรมและการบริการ", en: "Hospitality" },
    description: {
      th: "โทนหรู ทอง เทา น้ำเงินเข้ม สำหรับโรงแรม",
      en: "Luxury gold-gray-navy for hotels and resorts",
    },
    category: "hospitality",
    colorFamily: "neutral",
    primary: "#1e3a5f",
    primaryLight: "#4a6fa5",
    primaryDark: "#0f1f33",
    onPrimary: "#ffffff",
    secondary: "#c9a96e",
    accent: "#e8dcc8",
    surface: "#faf8f5",
    surfaceDark: "#0a0e14",
    glow: "0 18px 50px -18px rgb(30 58 95 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(30,58,95,0.22) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(201,169,110,0.18) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(232,220,200,0.22) 0, transparent 42%), linear-gradient(180deg, #faf8f5 0%, #f5f0e8 100%)",
  },
  {
    id: "retail",
    name: { th: "ค้าปลีก", en: "Retail" },
    description: {
      th: "โทนสดใส แดง ส้ม สำหรับค้าปลีกและอีคอมเมิร์ซ",
      en: "Vibrant red-orange for retail and e-commerce",
    },
    category: "retail",
    colorFamily: "warm",
    primary: "#ef4444",
    primaryLight: "#fca5a5",
    primaryDark: "#b91c1c",
    onPrimary: "#ffffff",
    secondary: "#f97316",
    accent: "#fee2e2",
    surface: "#fffafa",
    surfaceDark: "#1a0505",
    glow: "0 18px 50px -18px rgb(239 68 68 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(239,68,68,0.22) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(249,115,22,0.18) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(252,165,165,0.18) 0, transparent 42%), linear-gradient(180deg, #fffafa 0%, #fef2f2 100%)",
  },
  {
    id: "education",
    name: { th: "การศึกษา", en: "Education" },
    description: {
      th: "โทนน่าเชื่อถือ น้ำเงิน เหลือง สำหรับการศึกษา",
      en: "Trustworthy blue-yellow for education",
    },
    category: "education",
    colorFamily: "cool",
    primary: "#2563eb",
    primaryLight: "#60a5fa",
    primaryDark: "#1e40af",
    onPrimary: "#ffffff",
    secondary: "#fbbf24",
    accent: "#dbeafe",
    surface: "#f8faff",
    surfaceDark: "#0a1029",
    glow: "0 18px 50px -18px rgb(37 99 235 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(37,99,235,0.20) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(251,191,36,0.15) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(96,165,250,0.15) 0, transparent 42%), linear-gradient(180deg, #f8faff 0%, #eff4ff 100%)",
  },
  {
    id: "realestate",
    name: { th: "อสังหาริมทรัพย์", en: "Real Estate" },
    description: {
      th: "โทนธรรมชาติ เขียว น้ำเงิน ทอง สำหรับอสังหา",
      en: "Natural green-blue-gold for real estate",
    },
    category: "realestate",
    colorFamily: "cool",
    primary: "#059669",
    primaryLight: "#34d399",
    primaryDark: "#065f46",
    onPrimary: "#ffffff",
    secondary: "#0891b2",
    accent: "#d1fae5",
    surface: "#f6fdf9",
    surfaceDark: "#061c14",
    glow: "0 18px 50px -18px rgb(5 150 105 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(5,150,105,0.20) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(8,145,178,0.15) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(52,211,153,0.15) 0, transparent 42%), linear-gradient(180deg, #f6fdf9 0%, #ecfdf5 100%)",
  },
  {
    id: "automotive",
    name: { th: "ยานยนต์", en: "Automotive" },
    description: {
      th: "โทนเท่ เทาเข้ม แดง เงิน สำหรับรถยนต์",
      en: "Sleek dark-gray-red-silver for automotive",
    },
    category: "automotive",
    colorFamily: "warm",
    primary: "#dc2626",
    primaryLight: "#f87171",
    primaryDark: "#991b1b",
    onPrimary: "#ffffff",
    secondary: "#525252",
    accent: "#fee2e2",
    surface: "#fafafa",
    surfaceDark: "#111111",
    glow: "0 18px 50px -18px rgb(220 38 38 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(220,38,38,0.22) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(82,82,82,0.12) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(200,200,200,0.15) 0, transparent 42%), linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)",
  },
  {
    id: "corporate",
    name: { th: "องค์กร", en: "Corporate" },
    description: {
      th: "โทนมืออาชีพ น้ำเงิน เทา สำหรับองค์กร",
      en: "Professional navy-gray for corporations",
    },
    category: "corporate",
    colorFamily: "cool",
    primary: "#1e40af",
    primaryLight: "#3b82f6",
    primaryDark: "#172554",
    onPrimary: "#ffffff",
    secondary: "#64748b",
    accent: "#dbeafe",
    surface: "#f8fafc",
    surfaceDark: "#0f172a",
    glow: "0 18px 50px -18px rgb(30 64 175 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(30,64,175,0.20) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(100,116,139,0.12) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(59,130,246,0.12) 0, transparent 42%), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
  },
  {
    id: "pet",
    name: { th: "สัตว์เลี้ยง", en: "Pet & Veterinary" },
    description: {
      th: "โทนอบอุ่น ส้มเผา น้ำตาล สำหรับสัตว์เลี้ยงและคลินิกสัตว์",
      en: "Warm burnt orange + teal for pets and vet clinics",
    },
    category: "pet",
    colorFamily: "warm",
    primary: "#c2410c",
    primaryLight: "#fb923c",
    primaryDark: "#7c2d12",
    onPrimary: "#ffffff",
    secondary: "#0f766e",
    accent: "#fed7aa",
    surface: "#fffaf6",
    surfaceDark: "#1c0f07",
    glow: "0 18px 50px -18px rgb(194 65 12 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(194,65,12,0.22) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(15,118,110,0.15) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(254,215,170,0.22) 0, transparent 42%), linear-gradient(180deg, #fffaf6 0%, #fef3ec 100%)",
  },
  {
    id: "tattoo",
    name: { th: "ร้านสัก", en: "Tattoo & Alt" },
    description: {
      th: "โทนเข้ม ดำ แดงเลือด สำหรับร้านสักและสายอัลเทอร์",
      en: "Edgy black + blood red for tattoo and alt culture",
    },
    category: "lifestyle",
    colorFamily: "neutral",
    primary: "#0a0a0a",
    primaryLight: "#404040",
    primaryDark: "#000000",
    onPrimary: "#ffffff",
    secondary: "#dc2626",
    accent: "#d4d4d4",
    surface: "#fafafa",
    surfaceDark: "#000000",
    glow: "0 18px 50px -18px rgb(220 38 38 / 0.40)",
    mesh: "radial-gradient(at 18% 12%, rgba(10,10,10,0.12) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(220,38,38,0.18) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(212,212,212,0.18) 0, transparent 42%), linear-gradient(180deg, #fafafa 0%, #e5e5e5 100%)",
  },
  {
    id: "wellness",
    name: { th: "สปาและสุขภาวะ", en: "Wellness & Spa" },
    description: {
      th: "โทนธรรมชาติ เขียวเสจ ทอง สำหรับสปาและโยคะ",
      en: "Natural sage green + gold for spa and yoga",
    },
    category: "wellness",
    colorFamily: "cool",
    primary: "#4f6f52",
    primaryLight: "#84a98c",
    primaryDark: "#354f37",
    onPrimary: "#ffffff",
    secondary: "#c9a96e",
    accent: "#e9ecd9",
    surface: "#fafaf3",
    surfaceDark: "#1a1f18",
    glow: "0 18px 50px -18px rgb(79 111 82 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(79,111,82,0.20) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(201,169,110,0.18) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(233,236,217,0.22) 0, transparent 42%), linear-gradient(180deg, #fafaf3 0%, #f0f3e6 100%)",
  },
  {
    id: "tech",
    name: { th: "เทคโนโลยี", en: "Tech & Startup" },
    description: {
      th: "โทนอนาคต ฟ้าไซเบอร์ ดำ สำหรับเทคและสตาร์ทอัพ",
      en: "Futuristic cyan + night for tech and startup",
    },
    category: "technology",
    colorFamily: "cool",
    primary: "#0891b2",
    primaryLight: "#22d3ee",
    primaryDark: "#155e75",
    onPrimary: "#ffffff",
    secondary: "#0f172a",
    accent: "#cffafe",
    surface: "#f8fdff",
    surfaceDark: "#020617",
    glow: "0 18px 50px -18px rgb(8 145 178 / 0.42)",
    mesh: "radial-gradient(at 18% 12%, rgba(8,145,178,0.22) 0, transparent 42%), radial-gradient(at 82% 8%, rgba(15,23,42,0.15) 0, transparent 38%), radial-gradient(at 76% 78%, rgba(207,250,254,0.25) 0, transparent 42%), linear-gradient(180deg, #f8fdff 0%, #ecfeff 100%)",
  },
];

/* ------------------------------------------------------------------ */
/*  Lookup helpers                                                      */
/* ------------------------------------------------------------------ */

export const THEME_MAP: Record<ThemeId, ThemePreset> = Object.fromEntries(
  THEME_PRESETS.map((t) => [t.id, t])
) as Record<ThemeId, ThemePreset>;

export function getTheme(id: string | null | undefined): ThemePreset {
  if (id && id in THEME_MAP) return THEME_MAP[id as ThemeId];
  return THEME_MAP[DEFAULT_THEME_ID];
}

export function isValidThemeId(id: unknown): id is ThemeId {
  return typeof id === "string" && id in THEME_MAP;
}

/* ------------------------------------------------------------------ */
/*  WCAG helpers (relative luminance, contrast ratio)                  */
/* ------------------------------------------------------------------ */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

export function hexToRgbString(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

function luminance([r, g, b]: [number, number, number]): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const lum1 = luminance(hexToRgb(hex1));
  const lum2 = luminance(hexToRgb(hex2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type WcagLevel = "AAA" | "AA" | "AA-large" | "Fail";

export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "Fail";
}

/* ------------------------------------------------------------------ */
/*  CSS variable serialization — one function, both server + client    */
/* ------------------------------------------------------------------ */

/** Build a `style` object for a React element to scope a theme to a subtree. */
export function themeCssVars(theme: ThemePreset): Record<string, string> {
  return {
    "--primary": theme.primary,
    "--primary-light": theme.primaryLight,
    "--primary-dark": theme.primaryDark,
    "--on-primary": theme.onPrimary,
    "--secondary": theme.secondary,
    "--accent": theme.accent,
    "--surface": theme.surface,
    "--surface-dark": theme.surfaceDark,
    "--glow": theme.glow,
    "--mesh": theme.mesh,
    "--primary-rgb": hexToRgbString(theme.primary),
  };
}

/** Apply theme CSS variables directly to `document.documentElement`. Client-only. */
export function applyThemeToRoot(theme: ThemePreset): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = themeCssVars(theme);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.dataset.theme = theme.id;
}
