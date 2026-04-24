import { supabaseAdmin } from "@/lib/supabase";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
// gemini-2.5-flash-image is GA and optimised for high-volume image generation.
// Override with GEMINI_IMAGE_GEN_MODEL if a newer model is available.
const IMAGE_GEN_MODEL = process.env.GEMINI_IMAGE_GEN_MODEL ?? "gemini-2.5-flash-image";
const IMAGE_GEN_TIMEOUT_MS = 35_000;

export type ImageGenResult =
  | { ok: true; imageBase64: string; mimeType: string; caption?: string }
  | { ok: false; code: "not_configured" | "api_error" | "timeout" | "no_image"; message?: string };

/**
 * Generate an image with Gemini and return base64 bytes + MIME type.
 * `shopContext` is a short phrase appended to the system prompt to ground the
 * output in the shop's style (e.g. "ร้านทำเล็บสไตล์เกาหลี").
 */
export async function generateImage(prompt: string, shopContext?: string): Promise<ImageGenResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, code: "not_configured", message: "GEMINI_API_KEY not set" };
  }

  const url = `${GEMINI_API_URL}/${IMAGE_GEN_MODEL}:generateContent?key=${apiKey}`;

  const systemText = shopContext
    ? `คุณกำลังสร้างภาพสำหรับ${shopContext}ในประเทศไทย สร้างภาพสมจริง สวยงาม เหมาะสำหรับโปรโมทร้าน ไม่มีตัวอักษรหรือข้อความในภาพ`
    : "สร้างภาพสมจริง สวยงาม เหมาะสำหรับร้านเสริมสวยในประเทศไทย ไม่มีตัวอักษรหรือข้อความในภาพ";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_GEN_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemText }] },
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const message = await res.text();
      console.error("[ai:image-gen] API error", { model: IMAGE_GEN_MODEL, status: res.status, message });
      return { ok: false, code: "api_error", message };
    }

    const json = await res.json();
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> =
      json?.candidates?.[0]?.content?.parts ?? [];

    const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));
    if (!imagePart?.inlineData) {
      console.warn("[ai:image-gen] no image part in response", { model: IMAGE_GEN_MODEL, partCount: parts.length });
      return { ok: false, code: "no_image", message: "Gemini returned no image part" };
    }

    const captionPart = parts.find((p) => typeof p.text === "string");
    return {
      ok: true,
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
      caption: captionPart?.text,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, code: "timeout", message: `timed out after ${IMAGE_GEN_TIMEOUT_MS}ms` };
    }
    const msg = err instanceof Error ? err.message : "unknown error";
    return { ok: false, code: "api_error", message: msg };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Upload a base64-encoded image to the public `ai-generated` Supabase Storage
 * bucket and return its public HTTPS URL, or null on failure.
 *
 * The bucket must exist and be public — see supabase/migrations/013_ai_multimodal.sql.
 */
export async function uploadGeneratedImage(
  imageBase64: string,
  mimeType: string,
  shopId: number,
): Promise<string | null> {
  const ext = mimeType.split("/")[1] ?? "png";
  const path = `shops/${shopId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(imageBase64, "base64");

  const { data, error } = await supabaseAdmin()
    .storage
    .from("ai-generated")
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    console.error("[ai:image-gen] storage upload failed", { shopId, error: error.message });
    return null;
  }

  const { data: { publicUrl } } = supabaseAdmin()
    .storage
    .from("ai-generated")
    .getPublicUrl(data.path);

  return publicUrl ?? null;
}
