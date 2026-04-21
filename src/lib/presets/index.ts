import { supabaseAdmin } from "@/lib/supabase";
import { salonPreset } from "./salon";
import { nailPreset } from "./nail";
import { spaPreset } from "./spa";
import type { BusinessPreset, PresetKey } from "./types";

export type { BusinessPreset, PresetKey } from "./types";

export const PRESETS: Record<PresetKey, BusinessPreset> = {
  salon: salonPreset,
  nail: nailPreset,
  spa: spaPreset,
};

export const PRESET_LIST: BusinessPreset[] = [salonPreset, nailPreset, spaPreset];

export function getPreset(key: PresetKey): BusinessPreset {
  const p = PRESETS[key];
  if (!p) throw new Error(`Unknown preset: ${key}`);
  return p;
}

/**
 * Installs a preset into a newly-created shop:
 *   - sets shop.business_type + shop.theme_id
 *   - inserts services, working_hours, message_templates
 *   - inserts one placeholder staff member (so bookings work immediately)
 *
 * Idempotent-ish: safe to re-run on a fresh shop; will no-op on conflicts.
 */
export async function installPreset(shopId: number, key: PresetKey): Promise<void> {
  const preset = getPreset(key);
  const db = supabaseAdmin();

  // Update shop metadata
  const { error: shopErr } = await db
    .from("shops")
    .update({
      business_type: preset.key,
      theme_id: preset.theme_id,
    })
    .eq("id", shopId);
  if (shopErr) throw new Error(`install preset (shop update): ${shopErr.message}`);

  // Insert services
  if (preset.services.length) {
    const { error } = await db.from("services").insert(
      preset.services.map((s) => ({
        shop_id: shopId,
        name: s.name,
        name_en: s.name_en,
        description: s.description,
        duration_min: s.duration_min,
        price: s.price,
        sort_order: s.sort_order,
        active: true,
      })),
    );
    if (error) throw new Error(`install preset (services): ${error.message}`);
  }

  // Insert working hours (shop-wide defaults, staff_id = null)
  if (preset.default_hours.length) {
    const { error } = await db.from("working_hours").insert(
      preset.default_hours.map((h) => ({
        shop_id: shopId,
        staff_id: null,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
      })),
    );
    if (error) throw new Error(`install preset (working_hours): ${error.message}`);
  }

  // Insert message templates
  if (preset.message_templates.length) {
    const { error } = await db.from("message_templates").insert(
      preset.message_templates.map((t) => ({
        shop_id: shopId,
        name: t.name,
        category: t.category,
        subject: t.subject,
        body: t.body,
        sort_order: t.sort_order,
        active: true,
      })),
    );
    if (error) throw new Error(`install preset (message_templates): ${error.message}`);
  }

  // Insert one placeholder staff so bookings have an assignable target.
  const defaultStaffName = preset.staff_roles[0] ?? "พนักงาน";
  const { data: staffRow, error: staffErr } = await db
    .from("staff")
    .insert({
      shop_id: shopId,
      name: defaultStaffName,
      nickname: defaultStaffName,
      bio: `${preset.emoji} ${preset.label_th}`,
      active: true,
      sort_order: 1,
    })
    .select("id")
    .single();
  if (staffErr) throw new Error(`install preset (staff): ${staffErr.message}`);

  // Link that staff to all services of this shop so bookings work out of the box.
  if (staffRow) {
    const { data: services } = await db.from("services").select("id").eq("shop_id", shopId);
    if (services && services.length) {
      await db.from("staff_services").insert(
        services.map((s) => ({ staff_id: staffRow.id, service_id: s.id })),
      );
    }
  }
}
