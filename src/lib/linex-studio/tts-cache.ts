// LINEX Studio Sprint 3 — TTS cache key helper
// Deterministic hash from text + voice params so identical inputs map to one cache key.
// Uses Web Crypto API (available in Node 18+ and Edge runtimes) — no extra deps.

import type { TTSVoiceConfig, TTSAudioConfig } from "./tts-config";

export interface TTSCacheKeyInput {
  text: string;
  voice: TTSVoiceConfig;
  audio: TTSAudioConfig;
}

/**
 * Build a canonical string representation of the TTS input params.
 * Order is deterministic so the hash is stable.
 */
function canonicalize(input: TTSCacheKeyInput): string {
  const { text, voice, audio } = input;
  return JSON.stringify({
    t: text.trim(),
    v: {
      lc: voice.languageCode,
      n: voice.name,
      g: voice.ssmlGender,
      vt: voice.voiceType,
    },
    a: {
      e: audio.audioEncoding,
      sr: audio.speakingRate,
      p: audio.pitch,
      vg: audio.volumeGainDb,
    },
  });
}

/**
 * SHA-256 hash of the canonical input string, returned as hex.
 * Falls back to a simple djb2 hash if crypto is unavailable (shouldn't happen in Node 18+).
 */
export async function computeCacheKey(input: TTSCacheKeyInput): Promise<string> {
  const data = canonicalize(input);

  try {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // Fallback djb2 hash (deterministic, fast, not cryptographic — fine for cache keys)
    let hash = 5381;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) + hash) + data.charCodeAt(i);
    }
    return "djb2_" + (hash >>> 0).toString(16);
  }
}

/**
 * Synchronous version using djb2 (for contexts where async/await is inconvenient).
 * Safe because the input is fully local and deterministic.
 */
export function computeCacheKeySync(input: TTSCacheKeyInput): string {
  const data = canonicalize(input);
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i);
  }
  return "djb2_" + (hash >>> 0).toString(16);
}
