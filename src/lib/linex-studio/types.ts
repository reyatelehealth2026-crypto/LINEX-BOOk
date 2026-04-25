export type StudioTone =
  | "professional"
  | "friendly"
  | "funny"
  | "luxury"
  | "local_thai"
  | "aggressive_sales"
  | "soft_sales"
  | "expert";

export type StudioPlatform = "tiktok" | "reels" | "shorts" | "voom" | "facebook";

export type StudioBrief = {
  title: string;
  businessName: string;
  businessType: string;
  offer: string;
  targetAudience: string;
  goal: string;
  platform: StudioPlatform;
  durationSeconds: number;
  tone: StudioTone;
  brief: string;
};

export type StructuredBrief = StudioBrief & {
  language: "th";
  contentFormat: "short_video";
};

export type StrategyOutput = {
  angle: string;
  mainMessage: string;
  emotionalTrigger: string;
  cta: string;
  conversionPath: string;
};

export type StoryboardShot = {
  time: string;
  scene: string;
  visual: string;
  textOverlay: string;
  audio: string;
};

export type VisualDirection = {
  mood: string;
  palette: string[];
  cameraStyle: string;
  lighting: string;
  dos: string[];
  donts: string[];
};

export type CaptionOutput = {
  caption: string;
  hashtags: string[];
  platformNote: string;
};

export type ContentPackage = {
  structuredBrief: StructuredBrief;
  strategy: StrategyOutput;
  script: string;
  storyboard: StoryboardShot[];
  visualDirection: VisualDirection;
  assetPrompts: string[];
  caption: CaptionOutput;
  editorNotes: string;
  markdown: string;
};
