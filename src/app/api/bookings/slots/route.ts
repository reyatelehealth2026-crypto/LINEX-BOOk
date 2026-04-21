import { NextRequest, NextResponse } from "next/server";
import { availableSlots, hourlyAvailability, nearbySlotSuggestions, popularTimesByHour } from "@/lib/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const date = sp.get("date");
  const serviceId = Number(sp.get("service_id"));
  const staffId = sp.get("staff_id") ? Number(sp.get("staff_id")) : null;
  const mode = sp.get("mode"); // "hourly" | "nearby" | "popular"
  if (!serviceId) {
    return NextResponse.json({ error: "service_id required" }, { status: 400 });
  }
  if (mode === "popular") {
    const popular = await popularTimesByHour({ serviceId });
    return NextResponse.json({ popular });
  }
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }
  if (mode === "hourly") {
    const buckets = await hourlyAvailability({ dateYmd: date, serviceId, staffId });
    return NextResponse.json({ buckets });
  }
  if (mode === "nearby") {
    const suggestions = await nearbySlotSuggestions({ fromDateYmd: date, serviceId, staffId });
    return NextResponse.json({ suggestions });
  }
  const slots = await availableSlots({ dateYmd: date, serviceId, staffId });
  // When exact date has no slots, return nearby suggestions alongside to help UI fallback.
  if (slots.length === 0) {
    const suggestions = await nearbySlotSuggestions({ fromDateYmd: date, serviceId, staffId });
    return NextResponse.json({ slots, suggestions });
  }
  return NextResponse.json({ slots });
}
