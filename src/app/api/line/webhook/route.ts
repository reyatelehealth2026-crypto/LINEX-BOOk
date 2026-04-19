import { NextRequest, NextResponse } from "next/server";
import { verifySignature, replyMessage, getProfile } from "@/lib/line";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import { welcomeMessage, profileCard, myBookingsMessage, textMessage } from "@/lib/flex";
import type { BookingWithJoins, Customer } from "@/types/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-line-signature");
  if (!verifySignature(raw, sig)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(raw) as { events?: any[] };
  const events = body.events ?? [];

  // respond 200 immediately; process in background
  await Promise.all(events.map((e) => handleEvent(e).catch((err) => console.error("event err:", err))));

  return NextResponse.json({ ok: true });
}

async function handleEvent(ev: any) {
  const userId: string | undefined = ev.source?.userId;
  if (!userId) return;

  // Ensure customer row exists (upsert basic profile)
  const customer = await upsertCustomerFromLine(userId);

  if (ev.type === "follow") {
    const name = customer?.display_name ?? "คุณลูกค้า";
    return replyMessage(ev.replyToken, [welcomeMessage(name)]);
  }

  if (ev.type === "postback") {
    const data = new URLSearchParams(ev.postback?.data ?? "");
    const action = data.get("action");

    if (action === "my_bookings") {
      const list = await fetchMyBookings(customer!.id);
      return replyMessage(ev.replyToken, [myBookingsMessage(list)]);
    }
    if (action === "profile") {
      return replyMessage(ev.replyToken, [profileCard(customer)]);
    }
    if (action === "cancel_booking") {
      const id = Number(data.get("id"));
      if (id) await cancelBookingByCustomer(id, customer!.id);
      const list = await fetchMyBookings(customer!.id);
      return replyMessage(ev.replyToken, [
        textMessage("ยกเลิกคิวเรียบร้อย ✅"),
        myBookingsMessage(list)
      ]);
    }
    return;
  }

  if (ev.type === "message" && ev.message?.type === "text") {
    const text: string = ev.message.text.trim();
    if (/จอง|book/i.test(text)) {
      return replyMessage(ev.replyToken, [welcomeMessage(customer?.display_name ?? "คุณ")]);
    }
    if (/คิว|บุ๊ค|booking/i.test(text)) {
      const list = await fetchMyBookings(customer!.id);
      return replyMessage(ev.replyToken, [myBookingsMessage(list)]);
    }
    if (/แต้ม|point|profile|โปรไฟล์/i.test(text)) {
      return replyMessage(ev.replyToken, [profileCard(customer)]);
    }
    return replyMessage(ev.replyToken, [welcomeMessage(customer?.display_name ?? "คุณ")]);
  }
}

async function upsertCustomerFromLine(lineUserId: string): Promise<Customer | null> {
  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("customers")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (existing) return existing as Customer;

  const p = await getProfile(lineUserId);
  const { data: inserted } = await db
    .from("customers")
    .insert({
      shop_id: SHOP_ID,
      line_user_id: lineUserId,
      display_name: p?.displayName ?? null,
      picture_url: p?.pictureUrl ?? null
    })
    .select("*")
    .single();
  return (inserted ?? null) as Customer | null;
}

async function fetchMyBookings(customerId: number): Promise<BookingWithJoins[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("bookings")
    .select(
      "*, service:services(id,name,name_en,duration_min,price), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,phone,picture_url,line_user_id)"
    )
    .eq("customer_id", customerId)
    .in("status", ["pending", "confirmed", "completed"])
    .gte("starts_at", new Date(Date.now() - 86400_000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(10);
  return (data ?? []) as BookingWithJoins[];
}

async function cancelBookingByCustomer(bookingId: number, customerId: number) {
  const db = supabaseAdmin();
  await db
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("customer_id", customerId)
    .in("status", ["pending", "confirmed"]);
}
