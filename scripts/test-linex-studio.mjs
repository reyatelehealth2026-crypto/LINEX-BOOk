#!/usr/bin/env node
// LINEX Studio — smoke test
// Usage: npx tsx scripts/test-linex-studio.mjs
// Exits 0 on success, 1 on failure

import { generateContentPackage } from "../src/lib/linex-studio/generator.ts";

const BRIEF = {
  title: "คลิปโปรโมทร้านตัดผมหัวกรวย",
  businessName: "หัวกรวยบาร์เบอร์",
  businessType: "ร้านตัดผมชาย",
  offer: "ตัดผมชาย 199 บาท + จองคิวผ่าน LINE",
  targetAudience: "ผู้ชายวัยทำงานในเมือง",
  goal: "เพิ่มยอดจองผ่าน LINE OA",
  platform: "tiktok",
  durationSeconds: 30,
  tone: "friendly",
  brief: "ลูกค้าไม่ชอบรอคิวนาน",
};

function ok(v, n) {
  if (v == null) throw new Error(`${n} is null`);
  if (typeof v === "string" && !v.trim()) throw new Error(`${n} is empty`);
}
function arr(v, n, m = 1) {
  if (!Array.isArray(v) || v.length < m) throw new Error(`${n} bad`);
}

try {
  console.log("🧪 LINEX Studio Smoke Test\n");
  const p = generateContentPackage(BRIEF);
  ok(p.structuredBrief?.title, "title");
  ok(p.strategy?.angle, "angle");
  ok(p.script, "script");
  arr(p.storyboard, "storyboard", 3);
  ok(p.visualDirection?.mood, "mood");
  arr(p.assetPrompts, "prompts");
  ok(p.caption?.caption, "caption");
  ok(p.markdown, "markdown");
  arr(p.scriptVariations, "vars", 2);
  ok(p.winningVariationName, "winner");
  console.log("✅ All fields valid");
  console.log(`🏆 Winner: ${p.winningVariationName} | 🎬 ${p.scriptVariations.length} variations`);
  console.log("\n🎉 Passed!");
} catch (e) {
  console.error("❌", e.message);
  process.exit(1);
}
