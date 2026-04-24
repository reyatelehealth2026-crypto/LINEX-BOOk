import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const BUCKET = "uploads";

/**
 * POST /api/admin/upload
 *
 * Accepts multipart/form-data with:
 *   - file: the image file
 *   - folder: "services" | "staff" (controls storage path)
 *
 * Returns { url } — the public URL of the uploaded file.
 *
 * Storage path: {shopId}/{folder}/{timestamp}-{random}.{ext}
 */
export async function POST(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "misc";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `${identity.shopId}/${folder}/${safeName}`;

  const db = supabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await db.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
}
