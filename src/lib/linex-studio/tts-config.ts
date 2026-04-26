// LINEX Studio Sprint 3 — Google Cloud TTS config & voice mapping
// No live GCP credentials required; this module is pure metadata.

export type TTSProvider = "google_cloud_tts";

export type TTSVoiceGender = "MALE" | "FEMALE" | "NEUTRAL";

export type TTSVoiceType = "standard" | "neural" | "neural2" | "wavenet";

export interface TTSVoiceConfig {
  languageCode: string;
  name: string;
  ssmlGender: TTSVoiceGender;
  voiceType: TTSVoiceType;
}

export interface TTSAudioConfig {
  audioEncoding: "MP3" | "OGG_OPUS" | "LINEAR16";
  speakingRate: number; // 0.25 – 4.0
  pitch: number; // -20.0 – 20.0
  volumeGainDb: number; // -96.0 – 16.0
}

export interface TTSCostRates {
  usdPerMillionChars: number;
}

export type TonePreset =
  | "professional"
  | "friendly"
  | "funny"
  | "luxury"
  | "local_thai"
  | "aggressive_sales"
  | "soft_sales"
  | "expert";

// ---------------------------------------------------------------------------
// Google Cloud Thai voices (verified available as of 2024-2025)
// ---------------------------------------------------------------------------
const TH_VOICES: Record<string, TTSVoiceConfig> = {
  "th-TH-Neural2-C": {
    languageCode: "th-TH",
    name: "th-TH-Neural2-C",
    ssmlGender: "FEMALE",
    voiceType: "neural2",
  },
  "th-TH-Neural2-D": {
    languageCode: "th-TH",
    name: "th-TH-Neural2-D",
    ssmlGender: "MALE",
    voiceType: "neural2",
  },
  "th-TH-Standard-A": {
    languageCode: "th-TH",
    name: "th-TH-Standard-A",
    ssmlGender: "FEMALE",
    voiceType: "standard",
  },
  "th-TH-Standard-B": {
    languageCode: "th-TH",
    name: "th-TH-Standard-B",
    ssmlGender: "MALE",
    voiceType: "standard",
  },
};

// ---------------------------------------------------------------------------
// Tone → voice mapping (opinionated, can be overridden later via admin UI)
// ---------------------------------------------------------------------------
export const TONE_VOICE_MAP: Record<TonePreset, TTSVoiceConfig> = {
  professional: TH_VOICES["th-TH-Neural2-D"], // male, clear, authoritative
  friendly: TH_VOICES["th-TH-Neural2-C"],     // female, warm
  funny: TH_VOICES["th-TH-Standard-A"],       // female, slightly more playful
  luxury: TH_VOICES["th-TH-Neural2-D"],       // male, premium calm
  local_thai: TH_VOICES["th-TH-Standard-B"],  // male, down-to-earth
  aggressive_sales: TH_VOICES["th-TH-Neural2-D"], // male, assertive
  soft_sales: TH_VOICES["th-TH-Neural2-C"],   // female, gentle
  expert: TH_VOICES["th-TH-Neural2-D"],       // male, knowledgeable
};

// ---------------------------------------------------------------------------
// Tone → audio rendering params (speed, pitch, volume)
// ---------------------------------------------------------------------------
export const TONE_AUDIO_MAP: Record<TonePreset, TTSAudioConfig> = {
  professional: {
    audioEncoding: "MP3",
    speakingRate: 0.95,
    pitch: 0,
    volumeGainDb: 1.5,
  },
  friendly: {
    audioEncoding: "MP3",
    speakingRate: 1.0,
    pitch: 1.0,
    volumeGainDb: 1.0,
  },
  funny: {
    audioEncoding: "MP3",
    speakingRate: 1.05,
    pitch: 2.0,
    volumeGainDb: 2.0,
  },
  luxury: {
    audioEncoding: "MP3",
    speakingRate: 0.88,
    pitch: -1.0,
    volumeGainDb: 0.5,
  },
  local_thai: {
    audioEncoding: "MP3",
    speakingRate: 1.0,
    pitch: 0.5,
    volumeGainDb: 1.5,
  },
  aggressive_sales: {
    audioEncoding: "MP3",
    speakingRate: 1.08,
    pitch: 1.5,
    volumeGainDb: 3.0,
  },
  soft_sales: {
    audioEncoding: "MP3",
    speakingRate: 0.92,
    pitch: 0.5,
    volumeGainDb: 0.5,
  },
  expert: {
    audioEncoding: "MP3",
    speakingRate: 0.93,
    pitch: -0.5,
    volumeGainDb: 1.0,
  },
};

// ---------------------------------------------------------------------------
// Cost rates (USD per 1 million characters) — Google Cloud TTS pricing 2024
// Neural2 / Neural: $16.00  |  Standard: $4.00  |  WaveNet: $16.00
// ---------------------------------------------------------------------------
export const VOICE_COST_RATES: Record<TTSVoiceType, TTSCostRates> = {
  neural2: { usdPerMillionChars: 16.0 },
  neural: { usdPerMillionChars: 16.0 },
  standard: { usdPerMillionChars: 4.0 },
  wavenet: { usdPerMillionChars: 16.0 },
};

export function getVoiceConfig(tone: TonePreset): TTSVoiceConfig {
  return TONE_VOICE_MAP[tone] ?? TONE_VOICE_MAP.friendly;
}

export function getAudioConfig(tone: TonePreset): TTSAudioConfig {
  return TONE_AUDIO_MAP[tone] ?? TONE_AUDIO_MAP.friendly;
}

export function getCostRate(voiceType: TTSVoiceType): TTSCostRates {
  return VOICE_COST_RATES[voiceType] ?? VOICE_COST_RATES.standard;
}
