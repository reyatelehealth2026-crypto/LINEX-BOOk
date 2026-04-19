import { NextRequest, NextResponse } from "next/server";
import { availableSlots, hourlyAvailability } from "@/lib/booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const date = sp.get("date");
  const serviceId = Number(sp.get("service_id"));
  const staffId = sp.get("staff_id") ? Number(sp.get("staff_id")) : null;
  const mode = sp.get("mode"); // "hourly" returns coarse per-hour buckets
  if (!date || !serviceId) {
    return NextResponse.json({ error: "date and service_id required" }, { status: 400 });
  }
  if (mode === "hourly") {
    const buckets = await hourlyAvailability({ dateYmd: date, serviceId, staffId });
    return NextResponse.json({ buckets });
  }
  const slots = await availableSlots({ dateYmd: date, serviceId, staffId });
  return NextResponse.json({ slots });
}
