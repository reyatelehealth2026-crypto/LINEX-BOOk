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

export type ScriptVariation = {
  name: string;
  script: string;
};

export type ScoreBreakdown = {
  hookStrength: number;
  clarity: number;
  ctaProminence: number;
  platformFit: number;
  brandToneMatch: number;
};

export type ScoredVariation = ScriptVariation & {
  score: number;
  scoreBreakdown: ScoreBreakdown;
};

export type TTSVoiceoverMeta = {
  provider: "google_cloud_tts";
  voice_config: {
    languageCode: string;
    name: string;
    ssmlGender: "MALE" | "FEMALE" | "NEUTRAL";
  };
  audio_config: {
    audioEncoding: "MP3" | "OGG_OPUS" | "LINEAR16";
    speakingRate: number;
    pitch: number;
    volumeGainDb: number;
  };
  ssml_input: string;
  estimated_cost_usd: number;
  estimated_duration_sec: number;
  cache_key: string;
  cache_hit: boolean;
  billable_chars: number;
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
  scriptVariations?: ScoredVariation[];
  winningVariationName?: string;
  voiceover: TTSVoiceoverMeta | null;
};
