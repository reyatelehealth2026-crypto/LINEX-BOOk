import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { shopKPIs, customerSegments, demandForecast, suggestLeastBusyStaff } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics?mode=kpi|segments|forecast|assign
 */
export async function GET(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const mode = sp.get("mode") ?? "kpi";

  if (mode === "kpi") {
    const days = Number(sp.get("days") ?? 30);
    const data = await shopKPIs({ days });
    return NextResponse.json(data);
  }
  if (mode === "segments") {
    const segments = await customerSegments(Number(sp.get("limit") ?? 500));
    return NextResponse.json({ segments });
  }
  if (mode === "forecast") {
    const lookback = Number(sp.get("lookback") ?? 60);
    const forecast = await demandForecast(lookback);
    return NextResponse.json(forecast);
  }
  if (mode === "assign") {
    const serviceId = Number(sp.get("service_id"));
    const date = sp.get("date");
    if (!serviceId || !date) {
      return NextResponse.json({ error: "service_id and date required" }, { status: 400 });
    }
    const result = await suggestLeastBusyStaff({ serviceId, dateYmd: date });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "unknown_mode" }, { status: 400 });
}
