import type {
  CaptionOutput,
  ContentPackage,
  StoryboardShot,
  StrategyOutput,
  StructuredBrief,
  StudioBrief,
  VisualDirection,
} from "./types";

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

export function buildScript(brief: StructuredBrief, strategy: StrategyOutput) {
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
  return `# ${b.title}\n\n## Brief\n- Business: ${b.businessName}\n- Type: ${b.businessType}\n- Offer: ${b.offer}\n- Audience: ${b.targetAudience}\n- Goal: ${b.goal}\n- Platform: ${b.platform}\n- Tone: ${toneLabels[b.tone] ?? b.tone}\n\n## Strategy\n- Angle: ${pkg.strategy.angle}\n- Main message: ${pkg.strategy.mainMessage}\n- Emotional trigger: ${pkg.strategy.emotionalTrigger}\n- CTA: ${pkg.strategy.cta}\n- Conversion path: ${pkg.strategy.conversionPath}\n\n## Script\n${pkg.script}\n\n## Storyboard\n| Time | Scene | Visual | Text Overlay | Audio |\n|---|---|---|---|---|\n${storyboard}\n\n## Visual Direction\n- Mood: ${pkg.visualDirection.mood}\n- Palette: ${pkg.visualDirection.palette.join(", ")}\n- Camera: ${pkg.visualDirection.cameraStyle}\n- Lighting: ${pkg.visualDirection.lighting}\n\n## Asset Prompts\n${pkg.assetPrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n## Caption\n${pkg.caption.caption}\n\nHashtags: ${pkg.caption.hashtags.join(" ")}\n\nPlatform note: ${pkg.caption.platformNote}\n\n## Editor Checklist\n${pkg.editorNotes}\n`;
}

export function generateContentPackage(input: Partial<StudioBrief>): ContentPackage {
  const structuredBrief = normalizeBrief(input);
  const strategy = buildStrategy(structuredBrief);
  const script = buildScript(structuredBrief, strategy);
  const storyboard = buildStoryboard(structuredBrief);
  const visualDirection = buildVisualDirection();
  const assetPrompts = buildAssetPrompts(structuredBrief);
  const caption = buildCaption(structuredBrief);
  const editorNotes = buildEditorNotes(structuredBrief);
  const base = { structuredBrief, strategy, script, storyboard, visualDirection, assetPrompts, caption, editorNotes };
  return { ...base, markdown: buildMarkdown(base) };
}
