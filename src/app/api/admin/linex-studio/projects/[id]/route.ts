import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

function thaiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req);
  if (!admin) return thaiError("ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบใหม่", 401);

  const { id: idParam } = await params;
  const projectId = Number(idParam);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return thaiError("ไม่พบโปรเจกต์", 404);
  }

  const db = supabaseAdmin();
  const { data: project, error } = await db
    .from("linex_studio_video_projects")
    .select("*, linex_studio_video_project_outputs(*), linex_studio_output_variations(*), linex_studio_agent_runs(*), linex_studio_tts_outputs(*)")
    .eq("id", projectId)
    .eq("shop_id", admin.shopId)
    .maybeSingle();

  if (error) return thaiError("โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง", 500);
  if (!project) return thaiError("ไม่พบโปรเจกต์", 404);

  return NextResponse.json({ project });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req);
  if (!admin) return thaiError("ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบใหม่", 401);

  const { id: idParam } = await params;
  const projectId = Number(idParam);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return thaiError("ไม่พบโปรเจกต์", 404);
  }

  const db = supabaseAdmin();

  // Verify ownership before deleting
  const { data: existing, error: checkError } = await db
    .from("linex_studio_video_projects")
    .select("id")
    .eq("id", projectId)
    .eq("shop_id", admin.shopId)
    .maybeSingle();

  if (checkError) return thaiError("ตรวจสอบสิทธิ์ไม่สำเร็จ ลองใหม่อีกครั้ง", 500);
  if (!existing) return thaiError("ไม่พบโปรเจกต์", 404);

  // Cascading deletes handle related rows in outputs, variations, agent_runs, tts_outputs, trend_snapshots
  const { error } = await db
    .from("linex_studio_video_projects")
    .delete()
    .eq("id", projectId)
    .eq("shop_id", admin.shopId);

  if (error) return thaiError("ลบโปรเจกต์ไม่สำเร็จ ลองใหม่อีกครั้ง", 500);

  return NextResponse.json({ success: true, message: "ลบโปรเจกต์เรียบร้อยแล้ว" });
}
