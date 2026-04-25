// LINEX Studio Sprint 3 — SSML generation helper for Thai scripts
// Produces Google Cloud TTS-compatible SSML with tone-aware prosody.
// No external API calls; pure text transformation.

import type { TonePreset } from "./tts-config";
import { getAudioConfig } from "./tts-config";

/**
 * Escape XML special characters so user text doesn't break SSML.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Detect if text contains Thai characters.
 */
function containsThai(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Roughly segment Thai text into sentences/clauses for prosody breaks.
 * Uses common Thai sentence terminators:  ๆ  ฯ  and spaces after particles.
 * This is intentionally simple — we don't want a heavy NLP dependency.
 */
function segmentThaiSentences(text: string): string[] {
  // Split on Thai sentence-ending particles/whitespace combos, or regular sentence ends
  const splits = text.split(/([.!?ฯๆ]+\s*)/u);
  const sentences: string[] = [];
  let buffer = "";
  for (const part of splits) {
    buffer += part;
    if (/[.!?ฯๆ]+\s*$/u.test(part)) {
      const trimmed = buffer.trim();
      if (trimmed) sentences.push(trimmed);
      buffer = "";
    }
  }
  if (buffer.trim()) sentences.push(buffer.trim());
  return sentences.length > 0 ? sentences : [text];
}

/**
 * Add `<break>` tags after sentence/clause boundaries for more natural pacing.
 */
function addBreaks(text: string): string {
  // Replace sentence-ending punctuation with the same punctuation + a short break
  return text
    .replace(/([.!?])(\s+)/g, '$1<break time="300ms"/>$2')
    .replace(/([ฯๆ])(\s+)/gu, '$1<break time="250ms"/>$2')
    .replace(/(,)(\s+)/g, '$1<break time="150ms"/>$2')
    .replace(/(๑)(\s*)/gu, '<break time="200ms"/>$2'); // Thai digit ๑ etc spacing
}

/**
 * Build a tone-appropriate opening `<prosody>` tag.
 */
function openProsody(tone: TonePreset): string {
  const cfg = getAudioConfig(tone);
  const rate = cfg.speakingRate.toFixed(2);
  const pitch = cfg.pitch >= 0 ? `+${cfg.pitch.toFixed(1)}st` : `${cfg.pitch.toFixed(1)}st`;
  const vol = cfg.volumeGainDb >= 0 ? `+${cfg.volumeGainDb.toFixed(1)}dB` : `${cfg.volumeGainDb.toFixed(1)}dB`;
  return `<prosody rate="${rate}" pitch="${pitch}" volume="${vol}">`;
}

const CLOSE_PROSODY = "</prosody>";

/**
 * Wrap plain text in a complete SSML document suitable for Google Cloud TTS.
 *
 * @param text  Plain Thai (or mixed) text.
 * @param tone  Tone preset used to select prosody params.
 * @returns Well-formed SSML string starting with `<speak>`.
 */
export function buildSsml(text: string, tone: TonePreset): string {
  const trimmed = text.trim();
  if (!trimmed) return "<speak></speak>";

  const escaped = escapeXml(trimmed);
  const withBreaks = containsThai(trimmed) ? addBreaks(escaped) : escaped;
  const prosodyOpen = openProsody(tone);

  return `<speak>${prosodyOpen}${withBreaks}${CLOSE_PROSODY}</speak>`;
}

/**
 * Extract approximate spoken duration from SSML/text.
 * Heuristic: Thai ~5 chars/sec at normal speed, other scripts ~12 chars/sec.
 * Adjusted by speakingRate.
 */
export function estimateDurationSec(text: string, speakingRate: number): number {
  const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
  const otherChars = text.length - thaiChars;
  const thaiDuration = thaiChars / (5.0 * speakingRate);
  const otherDuration = otherChars / (12.0 * speakingRate);
  return Math.max(1, Math.round((thaiDuration + otherDuration) * 10) / 10);
}

/**
 * Estimate character count that will actually be billed by Google Cloud TTS.
 * SSML tags themselves are NOT billed — only the text content.
 * This strips all XML tags and counts remaining characters.
 */
export function estimateBillableChars(ssml: string): number {
  // Remove all XML tags
  const plain = ssml.replace(/<[^>]+>/g, "");
  return plain.length;
}
