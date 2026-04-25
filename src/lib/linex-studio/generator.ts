import type {
  CaptionOutput,
  ContentPackage,
  ScoreBreakdown,
  ScoredVariation,
  StoryboardShot,
  StrategyOutput,
  StructuredBrief,
  StudioBrief,
  TTSVoiceoverMeta,
  VisualDirection,
} from "./types";
import { planVoiceoverFromScript } from "./tts-director";

const toneLabels: Record<string, string> = {
  professional: "มืออาชีพ ชัด ไม่เวิ่น",
  friendly: "เป็นกันเอง คุยง่าย",
  funny: "กวน น่าจำ แต่ไม่หยาบจนเสียแบรนด์",
  luxury: "พรีเมียม นิ่ง สุภาพ",
  local_thai: "ไทยบ้านจริงใจ ขายตรงแบบไม่ปลอม",
  aggressive_sales: "เร่งตัดสินใจ ขายชัด",
  soft_sales: "ขายนุ่ม ให้ความรู้สึกไม่ถูกยัดเยียด",
  expert: "ผู้เชี่ยวชาญ อธิบายเข้าใจง่าย",
};

const platformNotes: Record<string, string> = {
  tiktok: "เปิดแรงใน 3 วิแรก ซับใหญ่ จังหวะตัดไว",
  reels: "ภาพต้องสะอาดและ mood ดี เน้นความน่าเชื่อถือ",
  shorts: "ตั้งชื่อให้ชัด retention ต้องไม่หลุดกลางคลิป",
  voom: "ขายตรงได้มากขึ้น ใส่ CTA ไป LINE ชัดๆ",
  facebook: "เล่าเข้าใจง่าย เหมาะกับคนแชร์ต่อ",
};

// ---- lightweight scoring helpers ----

const platformHookPatterns: Record<string, string[]> = {
  tiktok: ["POV:", "เพื่อนคนนั้นที่", "บอกหน่อย", "ไม่พูดเยอะ", "รู้สึกป่ะ"],
  reels: ["before/after", "Transformation", "day in the life", "Get ready with me"],
  shorts: ["อย่า", "เคยไหม", "เฉลย", "สั้นๆ"],
  voom: ["ทัก LINE", "เพิ่มเพื่อน", "สแกน", "คลิกลิงก์"],
  facebook: ["แชร์", "บอกต่อ", "Tag เพื่อน", "ใครรู้สึกว่า"],
};

const toneKeywordHints: Record<string, string[]> = {
  professional: ["ระบบ", "มาตรฐาน", "บริการ", "จัดการ", "ตาราง"],
  friendly: ["เรา", "คุย", "สบาย", "ง่าย", "ช่วย"],
  funny: ["555", "ฮา", "กวน", "ปวดหัว", "จริงดิ"],
  luxury: ["พรีเมียม", "เอกซ์คลูซีฟ", "พิเศษ", "VIP", "สุภาพ"],
  local_thai: ["จริงใจ", "ไม่จกตา", "บ้านๆ", "ตรงๆ", "ไม่ต้องกลัว"],
  aggressive_sales: ["ด่วน", "จำกัด", "พลาด", "ฟรี", "รีบ"],
  soft_sales: ["ลอง", "ดู", "รู้สึก", "ช้าๆ", "ให้เวลา"],
  expert: ["ทำไม", "เพราะ", "วิธี", "ผิด", "ถูกต้อง"],
};

function countMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((sum, kw) => sum + (lower.includes(kw.toLowerCase()) ? 1 : 0), 0);
}

function scoreScript(script: string, brief: StructuredBrief): ScoreBreakdown {
  const lines = script.split("\n").filter((l) => l.trim().length > 0);
  const firstLine = lines[0] ?? "";
  const lastLine = lines[lines.length - 1] ?? "";
  const fullText = script;

  // hookStrength: first line has question, strong opener, or platform pattern
  const platformPatterns = platformHookPatterns[brief.platform] ?? [];
  const hasQuestion = /\?|เหรอ|ไหม|ยังไง|ทำไม/.test(firstLine);
  const hasPlatformHook = platformPatterns.some((p) => fullText.includes(p));
  const hookStrength = Math.min(100, 40 + (hasQuestion ? 30 : 0) + (hasPlatformHook ? 30 : 0));

  // clarity: problem + solution + CTA structure present
  const hasProblem = /ปัญหา|เสียเวลา|ยาก|ลำบาก|เคย|ต้อง/.test(fullText);
  const hasSolution = /มี|ช่วย|ให้|ง่าย|เร็ว|LINE|จอง|ทัก/.test(fullText);
  const hasCTA = /จอง|ทัก|กด|ตอนนี้|เลย|ด่วน|ลอง|LINE/.test(lastLine);
  const clarity = Math.min(100, (hasProblem ? 35 : 0) + (hasSolution ? 35 : 0) + (hasCTA ? 30 : 0));

  // ctaProminence: CTA in last segment with action words
  const ctaWords = ["จอง", "ทัก", "กด", "เลย", "ตอนนี้", "ด่วน", "ลอง", "LINE", "สแกน"];
  const ctaCount = countMatches(lastLine, ctaWords);
  const ctaProminence = Math.min(100, 40 + ctaCount * 20);

  // platformFit: use known platform hooks or optimal duration feel
  const durationFit = brief.durationSeconds >= 15 && brief.durationSeconds <= 60 ? 20 : 10;
  const platformFit = Math.min(100, (hasPlatformHook ? 60 : 30) + durationFit + (brief.platform === "tiktok" && fullText.includes("วิ") ? 10 : 0));

  // brandToneMatch: keywords matching chosen tone
  const toneKws = toneKeywordHints[brief.tone] ?? [];
  const toneHits = countMatches(fullText, toneKws);
  const brandToneMatch = Math.min(100, 40 + toneHits * 15);

  return {
    hookStrength,
    clarity,
    ctaProminence,
    platformFit,
    brandToneMatch,
  };
}

function totalScore(b: ScoreBreakdown): number {
  return Math.round((b.hookStrength + b.clarity + b.ctaProminence + b.platformFit + b.brandToneMatch) / 5);
}

export function scoreVariations(
  variations: { name: string; script: string }[],
  brief: StructuredBrief
): ScoredVariation[] {
  const scored = variations.map((v) => {
    const breakdown = scoreScript(v.script, brief);
    return { ...v, score: totalScore(breakdown), scoreBreakdown: breakdown };
  });
  return scored.sort((a, b) => b.score - a.score);
}

// ---- script builders ----

export function buildScriptDirect(brief: StructuredBrief, strategy: StrategyOutput): string {
  const seconds = Math.max(15, Math.min(60, brief.durationSeconds));
  const hookEnd = Math.min(3, seconds);
  const problemEnd = Math.min(8, seconds);
  const solutionEnd = Math.min(seconds - 6, Math.max(14, Math.round(seconds * 0.65)));
  const proofEnd = Math.min(seconds - 3, solutionEnd + 5);

  return [
    `${0}-${hookEnd}s: “${brief.targetAudience} ยังเสียเวลาทำเรื่องนี้เองอยู่เหรอ?”`,
    `${hookEnd}-${problemEnd}s: ปัญหาคือ ${brief.brief} แล้วลูกค้าส่วนใหญ่ไม่อยากถามเยอะ`,
    `${problemEnd}-${solutionEnd}s: ${brief.businessName} มี ${brief.offer} ให้ลูกค้าเลือกผ่าน LINE ได้ง่าย เห็นข้อมูลชัด แล้วตัดสินใจไวขึ้น`,
    `${solutionEnd}-${proofEnd}s: ${strategy.mainMessage}`,
    `${proofEnd}-${seconds}s: ${strategy.cta}`,
  ].join("\n");
}

export function buildScriptStory(brief: StructuredBrief, strategy: StrategyOutput): string {
  const seconds = Math.max(15, Math.min(60, brief.durationSeconds));
  const mid = Math.round(seconds / 2);
  const ctaStart = Math.min(seconds - 4, Math.max(mid + 4, seconds - 6));

  return [
    `0-3s: “เมื่อวานมีลูกค้าคนหนึ่งทักมาบอกว่า…” — เปิดด้วยเหตุการณ์จริงที่เกี่ยวข้องกับ ${brief.brief}`,
    `3-${Math.min(10, mid)}s: เล่าต่อว่าเขาเคยเจอปัญหาเดิมซ้ำๆ จนรู้สึกว่าน่าจะมีวิธีที่ดีกว่า`,
    `${Math.min(10, mid)}-${ctaStart}s: เขาเจอ ${brief.businessName} และลอง ${brief.offer} — ผลลัพธ์คือไม่ต้องถามวน ไม่ต้องรอ เห็นข้อมูลชัดบน LINE`,
    `${ctaStart}-${seconds}s: ถ้าคุณก็เจอแบบเดียวกัน ทัก LINE ${brief.businessName} เลย — ${strategy.cta}`,
  ].join("\n");
}

export function buildScriptTrendy(brief: StructuredBrief, strategy: StrategyOutput): string {
  const seconds = Math.max(15, Math.min(60, brief.durationSeconds));
  const platformHooks: Record<string, string> = {
    tiktok: `POV: คุณเพิ่งรู้ว่า ${brief.businessName} มี ${brief.offer} ผ่าน LINE`,
    reels: `Get ready with ${brief.businessName} — ${brief.offer} ที่ไม่ต้องถามวน`,
    shorts: `อย่าทำแบบนี้อีกต่อไปถ้าคุณ ${brief.targetAudience}`,
    voom: `บอกหน่อยว่าคุณใช้ ${brief.offer} โดยไม่ต้องพิมพ์ข้อความยาว`,
    facebook: `ใครรู้สึกว่า ${brief.brief} บ้าง? แชร์ให้เพื่อนดู`,
  };

  const hook = platformHooks[brief.platform] ?? platformHooks.tiktok;
  const mid = Math.round(seconds / 2);
  const ctaStart = Math.min(seconds - 4, Math.max(mid + 3, seconds - 6));

  return [
    `0-3s: “${hook}” — ซับติดหน้าจอ ไม่มี intro โลโก้`,
    `3-${Math.min(8, mid)}s: แคปชั่นจิก: “${brief.targetAudience} ยังเสียเวลาอยู่เหรอ?” + ภาพ quick cut 3 วิ`,
    `${Math.min(8, mid)}-${ctaStart}s: ตัดเข้า solution: ${brief.offer} ผ่าน LINE — ไม่ต้องถาม ไม่ต้องรอ กดเลือกเองได้`,
    `${ctaStart}-${seconds}s: จบด้วยแคปชั่น “ทัก LINE เลย” + ปุ่ม/QR + เสียง CTA sound`,
  ].join("\n");
}

// legacy alias for backward compatibility
export function buildScript(brief: StructuredBrief, strategy: StrategyOutput): string {
  return buildScriptDirect(brief, strategy);
}

// ---- brief helpers ----

function clean(input: string | undefined, fallback: string) {
  const value = input?.trim();
  return value && value.length > 0 ? value : fallback;
}

export function normalizeBrief(input: Partial<StudioBrief>): StructuredBrief {
  return {
    title: clean(input.title, "คลิปโปรโมทธุรกิจ"),
    businessName: clean(input.businessName, "ธุรกิจของคุณ"),
    businessType: clean(input.businessType, "ธุรกิจบริการ"),
    offer: clean(input.offer, "บริการหลักของร้าน"),
    targetAudience: clean(input.targetAudience, "ลูกค้าในพื้นที่"),
    goal: clean(input.goal, "เพิ่มยอดจองและยอดทัก LINE"),
    platform: input.platform ?? "tiktok",
    durationSeconds: Number(input.durationSeconds || 30),
    tone: input.tone ?? "friendly",
    brief: clean(input.brief, "อยากได้คลิปสั้นที่ทำให้ลูกค้าเข้าใจและกดจอง/ทัก LINE"),
    language: "th",
    contentFormat: "short_video",
  };
}

export function buildStrategy(brief: StructuredBrief): StrategyOutput {
  const tone = toneLabels[brief.tone] ?? toneLabels.friendly;
  return {
    angle: `${brief.targetAudience} เจอปัญหาเดิม แล้วเห็นว่า ${brief.businessName} แก้ให้ได้เร็วผ่าน LINE`,
    mainMessage: `${brief.offer} ของ ${brief.businessName} ช่วยให้ลูกค้าตัดสินใจง่ายขึ้น ไม่ต้องเสียเวลาถามวน`,
    emotionalTrigger: `ความรู้สึกว่า “ถ้าไม่จัดการตอนนี้จะพลาด/เสียเวลา/ดูไม่พร้อม” แต่เล่าในโทน ${tone}`,
    cta: "กดจองหรือทัก LINE ตอนนี้",
    conversionPath: "ดูคลิป → เข้าใจข้อเสนอ → กด LINE → เลือกบริการ/เวลา → ยืนยันจอง",
  };
}

// ---- remaining generators ----

export function buildStoryboard(brief: StructuredBrief): StoryboardShot[] {
  return [
    {
      time: "0-3s",
      scene: "Hook / pain point",
      visual: `${brief.targetAudience} เจอสถานการณ์น่าหงุดหงิดก่อนใช้บริการ`,
      textOverlay: "ยังเสียเวลาถามวนอยู่เหรอ?",
      audio: "เสียงเปิดจังหวะเร็ว + voice-over hook",
    },
    {
      time: "3-8s",
      scene: "Problem",
      visual: "โชว์แชตหรือหน้าจอที่ลูกค้าต้องถามรายละเอียดซ้ำ",
      textOverlay: "ลูกค้าอยากรู้เร็ว ไม่อยากรอ",
      audio: "VO อธิบาย pain แบบสั้น",
    },
    {
      time: "8-20s",
      scene: "Solution",
      visual: `โชว์ ${brief.offer} และ flow การทัก/จองผ่าน LINE`,
      textOverlay: "เลือกบริการ → ทัก LINE → จบ",
      audio: "Beat ชัดขึ้น + VO solution",
    },
    {
      time: "20-27s",
      scene: "Proof / benefit",
      visual: "เจ้าของร้านหรือลูกค้าดูสบายขึ้น งานดูเป็นระบบ",
      textOverlay: "ง่ายกว่า เร็วกว่า ดูโปรกว่า",
      audio: "VO benefit",
    },
    {
      time: "27-30s",
      scene: "CTA",
      visual: "โลโก้ร้าน + QR/ปุ่ม LINE + ข้อความจอง/ทัก",
      textOverlay: "กดทัก LINE ตอนนี้",
      audio: "CTA sound สั้นๆ",
    },
  ];
}

export function buildVisualDirection(): VisualDirection {
  return {
    mood: "Thai SME commercial realism — ดูจริง ใช้งานได้ ไม่แฟนซีปลอม",
    palette: ["#074226", "#186845", "#0b412a", "#f7f4ea", "#c6a15b"],
    cameraStyle: "vertical 9:16, handheld commercial, medium close-up, screen insert shots",
    lighting: "natural daylight, soft contrast, clean product/service visibility",
    dos: ["ใช้คนจริง", "ภาษาไทยต้องถูก", "CTA เห็นชัด", "ภาพต้องดูเป็นธุรกิจไทยจริง"],
    donts: ["ไม่ใช้ตัวการ์ตูน", "ไม่ใช้ gradient AI ฟ้า-ม่วง", "ไม่ใส่ text เยอะ", "ไม่ทำภาพลอยๆ ไม่มีบริบท"],
  };
}

export function buildAssetPrompts(brief: StructuredBrief) {
  return [
    `Photorealistic Thai ${brief.businessType} short video scene for ${brief.businessName}, real Thai people, dark green brand accents, natural daylight, practical SME commercial style, vertical 9:16, no cartoon, no AI glow, readable Thai text only.`,
    `Close-up smartphone LINE chat / booking flow for ${brief.offer}, clean UI, Thai language, deep forest green palette, realistic hand holding phone, commercial product demo composition.`,
    `Final CTA frame for Thai business video: ${brief.businessName}, LINE booking call-to-action, off-white background, dark green typography, premium local SME brand feel.`
  ];
}

export function buildCaption(brief: StructuredBrief): CaptionOutput {
  const note = platformNotes[brief.platform] ?? platformNotes.tiktok;
  return {
    caption: `${brief.offer} สำหรับ${brief.targetAudience} — ไม่ต้องถามวนให้เสียเวลา กดทัก LINE แล้วจัดการต่อได้เลย`,
    hashtags: ["#LINEXStudio", "#ธุรกิจไทย", "#LINEOA", "#คอนเทนต์วิดีโอ", `#${brief.businessType.replace(/\s+/g, "")}`],
    platformNote: note,
  };
}

export function buildEditorNotes(brief: StructuredBrief) {
  return [
    `Format: 9:16 vertical สำหรับ ${brief.platform}`,
    `Duration target: ${brief.durationSeconds}s`,
    "Subtitle: ภาษาไทยตัวใหญ่ อ่านจบใน 1 วิ",
    "Cut rhythm: เปลี่ยนภาพทุก 1.5-2.5 วิ",
    "Hook ต้องขึ้นตั้งแต่ frame แรก ห้าม intro โลโก้ยาว",
    "Final 3s ต้องมี LINE CTA ชัด",
  ].join("\n");
}

export function buildMarkdown(pkg: Omit<ContentPackage, "markdown">) {
  const b = pkg.structuredBrief;
  const storyboard = pkg.storyboard
    .map((s) => `| ${s.time} | ${s.scene} | ${s.visual} | ${s.textOverlay} | ${s.audio} |`)
    .join("\n");
  let variationBlock = "";
  if (pkg.scriptVariations && pkg.scriptVariations.length > 0) {
    const winner = pkg.scriptVariations[0];
    variationBlock = `\n## Script Variations\n` + pkg.scriptVariations
      .map((v, i) => `### ${i + 1}. ${v.name} (Score: ${v.score})\n\n- hookStrength: ${v.scoreBreakdown.hookStrength}\n- clarity: ${v.scoreBreakdown.clarity}\n- ctaProminence: ${v.scoreBreakdown.ctaProminence}\n- platformFit: ${v.scoreBreakdown.platformFit}\n- brandToneMatch: ${v.scoreBreakdown.brandToneMatch}\n\n${v.script}${v.name === winner.name ? "\n\n✅ Selected winner" : ""}`)
      .join("\n\n---\n\n") + "\n";
  }
  return `# ${b.title}\n\n## Brief\n- Business: ${b.businessName}\n- Type: ${b.businessType}\n- Offer: ${b.offer}\n- Audience: ${b.targetAudience}\n- Goal: ${b.goal}\n- Platform: ${b.platform}\n- Tone: ${toneLabels[b.tone] ?? b.tone}\n\n## Strategy\n- Angle: ${pkg.strategy.angle}\n- Main message: ${pkg.strategy.mainMessage}\n- Emotional trigger: ${pkg.strategy.emotionalTrigger}\n- CTA: ${pkg.strategy.cta}\n- Conversion path: ${pkg.strategy.conversionPath}\n\n## Script (Selected)\n${pkg.script}${variationBlock}\n\n## Storyboard\n| Time | Scene | Visual | Text Overlay | Audio |\n|---|---|---|---|---|\n${storyboard}\n\n## Visual Direction\n- Mood: ${pkg.visualDirection.mood}\n- Palette: ${pkg.visualDirection.palette.join(", ")}\n- Camera: ${pkg.visualDirection.cameraStyle}\n- Lighting: ${pkg.visualDirection.lighting}\n\n## Asset Prompts\n${pkg.assetPrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n## Caption\n${pkg.caption.caption}\n\nHashtags: ${pkg.caption.hashtags.join(" ")}\n\nPlatform note: ${pkg.caption.platformNote}\n\n## Editor Checklist\n${pkg.editorNotes}\n`;
}

export function generateContentPackage(input: Partial<StudioBrief>): ContentPackage {
  const structuredBrief = normalizeBrief(input);
  const strategy = buildStrategy(structuredBrief);

  // Generate 3 script variations
  const direct = buildScriptDirect(structuredBrief, strategy);
  const story = buildScriptStory(structuredBrief, strategy);
  const trendy = buildScriptTrendy(structuredBrief, strategy);

  const scoredVariations = scoreVariations(
    [
      { name: "Direct", script: direct },
      { name: "Story", script: story },
      { name: "Trendy", script: trendy },
    ],
    structuredBrief
  );

  const winningScript = scoredVariations[0]?.script ?? direct;
  const winningName = scoredVariations[0]?.name ?? "Direct";

  const storyboard = buildStoryboard(structuredBrief);
  const visualDirection = buildVisualDirection();
  const assetPrompts = buildAssetPrompts(structuredBrief);
  const caption = buildCaption(structuredBrief);
  const editorNotes = buildEditorNotes(structuredBrief);

  const ttsPlan = planVoiceoverFromScript(
    winningScript,
    storyboard[0]?.audio,
    structuredBrief.tone
  );

  const base = {
    structuredBrief,
    strategy,
    script: winningScript,
    storyboard,
    visualDirection,
    assetPrompts,
    caption,
    editorNotes,
    scriptVariations: scoredVariations,
    winningVariationName: winningName,
    voiceover: ttsPlan.voiceover,
  };
  return { ...base, markdown: buildMarkdown(base) };
}
