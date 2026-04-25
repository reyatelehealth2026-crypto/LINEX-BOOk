#!/usr/bin/env bash
# LINEX Studio — smoke test wrapper
# Usage: bash scripts/test-linex-studio.sh
set -euo pipefail
cd "$(dirname "$0")/.."
exec npx tsx -e '
import { generateContentPackage } from "./src/lib/linex-studio/generator";
const p = generateContentPackage({
  title:"คลิปโปรโมท",businessName:"หัวกรวยบาร์เบอร์",businessType:"ร้านตัดผม",
  offer:"ตัด199",targetAudience:"ผู้ชาย",goal:"ขาย",platform:"tiktok",
  durationSeconds:30,tone:"friendly",brief:"ทดสอบ"
});
const checks = [
  [p.structuredBrief?.title, "title"],
  [p.strategy?.angle, "strategy"],
  [p.script, "script"],
  [p.storyboard?.length > 0, "storyboard"],
  [p.visualDirection?.mood, "visual"],
  [p.assetPrompts?.length > 0, "prompts"],
  [p.caption?.caption, "caption"],
  [p.markdown, "markdown"],
  [p.scriptVariations?.length >= 2, "vars>=2"],
  [p.winningVariationName, "winner"],
];
let fail = false;
for (const [v, n] of checks) { if (!v) { console.error("❌", n); fail = true; } }
if (fail) process.exit(1);
console.log("✅ All fields valid");
console.log("🏆 Winner:", p.winningVariationName, "| Variations:", p.scriptVariations.length);
console.log("🎉 Passed!");
'
