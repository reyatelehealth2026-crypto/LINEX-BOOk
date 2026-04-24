import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Retention period in days. Clamped to [7, 365]. Default 90.
function retentionDays(): number {
  const raw = parseInt(process.env.CHAT_HISTORY_RETENTION_DAYS ?? "90", 10);
  if (isNaN(raw)) return 90;
  return Math.min(365, Math.max(7, raw));
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const days = retentionDays();
  const db = supabaseAdmin();
  let totalDeleted = 0;

  // Delete in batches of 10 000 rows to avoid statement timeouts on large tables.
  // Stop after 5 iterations even if rows remain — next invocation will continue.
  const MAX_ITERATIONS = 5;
  const BATCH_SIZE = 10_000;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Supabase JS does not expose a LIMIT on DELETE directly, so we select the
    // IDs of the oldest batch first, then delete by those IDs.
    const { data: batch, error: selectErr } = await db
      .from("chat_history")
      .select("id")
      .lt("created_at", new Date(Date.now() - days * 86_400_000).toISOString())
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    if (selectErr) {
      console.error("[cron/ai-history-cleanup] select error", selectErr.message);
      return NextResponse.json({ error: selectErr.message }, { status: 500 });
    }

    if (!batch || batch.length === 0) break;

    const ids = batch.map((r) => r.id as number);

    const { error: deleteErr, count } = await db
      .from("chat_history")
      .delete({ count: "exact" })
      .in("id", ids);

    if (deleteErr) {
      console.error("[cron/ai-history-cleanup] delete error", deleteErr.message);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    totalDeleted += count ?? 0;

    // Fewer rows returned than the batch ceiling means the table is now clear.
    if (batch.length < BATCH_SIZE) break;
  }

  console.log("[cron/ai-history-cleanup] done", { deleted: totalDeleted, retentionDays: days });
  return NextResponse.json({ ok: true, deleted: totalDeleted });
}
