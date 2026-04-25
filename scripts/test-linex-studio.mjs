// LINEX Studio — smoke test (standalone, no TS import chain)
// Usage: node scripts/test-linex-studio.mjs
// Exits 0 on success, 1 on failure

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// We test via a temp .cts file that Node can run with tsx support through npx
const result = execSync("npx tsx -e \"import {generateContentPackage} from './src/lib/linex-studio/generator'; const p = generateContentPackage({title:'test',businessName:'หัวกรวย',businessType:'ร้านตัดผม',offer:'ตัด199',targetAudience:'ผู้ชาย',goal:'ขาย',platform:'tiktok',durationSeconds:30,tone:'friendly',brief:'ทดสอบ'}); console.log(JSON.stringify({ok:true,title:p.structuredBrief?.title,hasScript:!!p.script,hasStory:p.storyboard?.length>0,hasStrat:!!p.strategy?.angle,hasMd:!!p.markdown,vars:p.scriptVariations?.length,winner:p.winningVariationName}))\"", {
  cwd: join(__dirname, ".."),
  encoding: "utf-8",
  timeout: 30000,
});

console.log("🧪 LINEX Studio Smoke Test\n");

try {
  const data = JSON.parse(result.trim().split("\n").pop());
  
  if (!data.ok) { console.error("❌ No ok flag"); process.exit(1); }
  if (!data.title) { console.error("❌ No title"); process.exit(1); }
  if (!data.hasScript) { console.error("❌ No script"); process.exit(1); }
  if (!data.hasStory) { console.error("❌ No storyboard"); process.exit(1); }
  if (!data.hasStrat) { console.error("❌ No strategy"); process.exit(1); }
  if (!data.hasMd) { console.error("❌ No markdown"); process.exit(1); }
  if (!data.vars || data.vars < 2) { console.error("❌ Expected >= 2 variations, got", data.vars); process.exit(1); }
  if (!data.winner) { console.error("❌ No winner"); process.exit(1); }
  
  console.log("✅ Generator output validated");
  console.log(`   Title: ${data.title}`);
  console.log(`   Variations: ${data.vars}`);
  console.log(`   Winner: ${data.winner}`);
  console.log("\n🎉 Smoke test passed!");
  process.exit(0);
} catch (err) {
  console.error("❌ Parse error:", err.message);
  console.error("Raw output:", result);
  process.exit(1);
}
