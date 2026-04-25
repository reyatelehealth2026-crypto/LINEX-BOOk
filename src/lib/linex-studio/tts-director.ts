// LINEX Studio Sprint 3 — Dry-run TTS Director
// Returns full voiceover metadata without calling any external (paid) API.
// Designed to be swapped later for a real Google Cloud TTS synthesize call.

import type { TonePreset } from "./tts-config";
import { getVoiceConfig, getAudioConfig, getCostRate } from "./tts-config";
import { buildSsml, estimateDurationSec, estimateBillableChars } from "./ssml-thai";
import { computeCacheKeySync, type TTSCacheKeyInput } from "./tts-cache";

export interface TTSVoiceoverMeta {
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
  cache_hit: false;
  billable_chars: number;
}

export interface TTSPlanResult {
  voiceover: TTSVoiceoverMeta | null;
  error: string | null;
}

/**
 * Plan a voiceover for the given text and tone.
 * This is a DRY-RUN: no network calls, no GCP credentials, no cost incurred.
 *
 * @param text   The script / text to voice (Thai recommended).
 * @param tone   Brand tone preset.
 * @returns      Full metadata ready for synthesis, including cost estimate.
 */
export function planVoiceover(text: string, tone: TonePreset): TTSPlanResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { voiceover: null, error: "Empty text; nothing to voice." };
  }

  const voiceConfig = getVoiceConfig(tone);
  const audioConfig = getAudioConfig(tone);
  const ssml = buildSsml(trimmed, tone);
  const billableChars = estimateBillableChars(ssml);
  const costRate = getCostRate(voiceConfig.voiceType);
  const estimatedCostUsd = (billableChars / 1_000_000) * costRate.usdPerMillionChars;
  const estimatedDurationSec = estimateDurationSec(trimmed, audioConfig.speakingRate);

  const cacheInput: TTSCacheKeyInput = {
    text: trimmed,
    voice: voiceConfig,
    audio: audioConfig,
  };
  const cacheKey = computeCacheKeySync(cacheInput);

  const meta: TTSVoiceoverMeta = {
    provider: "google_cloud_tts",
    voice_config: {
      languageCode: voiceConfig.languageCode,
      name: voiceConfig.name,
      ssmlGender: voiceConfig.ssmlGender,
    },
    audio_config: {
      audioEncoding: audioConfig.audioEncoding,
      speakingRate: audioConfig.speakingRate,
      pitch: audioConfig.pitch,
      volumeGainDb: audioConfig.volumeGainDb,
    },
    ssml_input: ssml,
    estimated_cost_usd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
    estimated_duration_sec: estimatedDurationSec,
    cache_key: cacheKey,
    cache_hit: false,
    billable_chars: billableChars,
  };

  return { voiceover: meta, error: null };
}

/**
 * Convenience: plan voiceover from the first voice-over line in a script.
 * Extracts the "audio" field from storyboard shot 0 if available,
 * otherwise falls back to the full script text.
 */
export function planVoiceoverFromScript(
  script: string,
  storyboardAudioHint: string | undefined,
  tone: TonePreset
): TTSPlanResult {
  const text = storyboardAudioHint && storyboardAudioHint.trim().length > 0
    ? storyboardAudioHint
    : script;
  return planVoiceover(text, tone);
}
