import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Known placeholder tokens for documentation/preview */
const KNOWN_VARS: Record<string, string> = {
  customer_name: "สมชาย",
  service_name: "ตัดผมชาย",
  date: "15 พ.ค. 69",
  time: "14:00",
  shop_name: "ร้านของเรา",
  staff_name: "พี่โอ๋",
};

function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// POST /api/admin/message-templates/preview
// Body: { template_id?: number, body?: string, vars?: Record<string,string> }
// Returns: { subject, body, missing_vars }
export async function POST(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const customVars = (body.vars ?? {}) as Record<string, string>;
  const vars = { ...KNOWN_VARS, ...customVars };

  let rawBody: string;
  let rawSubject: string | null = null;

  if (body.template_id) {
    // Load from DB
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("message_templates")
      .select("body, subject")
      .eq("id", Number(body.template_id))
      .eq("shop_id", identity.shopId)
      .single();
    if (error || !data) return NextResponse.json({ error: "template not found" }, { status: 404 });
    rawBody = data.body;
    rawSubject = data.subject;
  } else if (typeof body.body === "string") {
    rawBody = body.body;
  } else {
    return NextResponse.json({ error: "template_id or body is required" }, { status: 400 });
  }

  // Find missing vars (placeholders that remain unsubstituted)
  const allPlaceholders = [...rawBody.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  const missingVars = [...new Set(allPlaceholders.filter((v) => !(v in vars)))];

  return NextResponse.json({
    subject: rawSubject ? renderTemplate(rawSubject, vars) : null,
    body: renderTemplate(rawBody, vars),
    available_vars: Object.keys(KNOWN_VARS),
    missing_vars: missingVars,
  });
}
