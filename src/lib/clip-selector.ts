/**
 * Local clip selection — a transparent heuristic, NOT cloud AI virality detection.
 *
 * Builds candidate windows aligned to transcript segment boundaries and scores
 * them with simple, explainable signals:
 *   - word density (words per second)
 *   - sentence completeness (ends on . ! ? or danda)
 *   - presence of strong/hook words (how, why, secret, never, etc.)
 *   - how close the window length is to an ideal short length
 *   - topic boundary detection (pause gaps, vocabulary overlap)
 *
 * The top non-overlapping windows are returned.
 *
 * Inspired by the reference tool's selector.py.
 */

import type { CaptionSegment } from "./types";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface ClipCandidate {
  start: number;
  end: number;
  title: string;
  score: number;
}

const MIN_CLIP_LEN = 15.0;
const MAX_CLIP_LEN = 90.0;
const IDEAL_CLIP_LEN = 30.0;

const SENT_END = [".", "!", "?", "।", "…"];

const STRONG_WORDS = new Set([
  "how", "why", "what", "when", "who", "where", "best", "worst", "never",
  "always", "secret", "mistake", "biggest", "important", "actually", "truth",
  "realize", "realise", "amazing", "incredible", "stop", "avoid", "must",
  "everyone", "nobody", "money", "free", "new", "first", "tip", "tips",
]);

const TOPIC_PAUSE_GAP = 0.6;
const TOPIC_OVERLAP_MAX = 0.25;

/**
 * Select the top N clips from a transcript using a local heuristic.
 *
 * @param segments - transcript segments with word-level timestamps
 * @param numClips - how many clips to return
 * @param clipLength - optional exact length (seconds); if null, adapts to count
 * @returns array of {start, end, title} clip candidates
 */
export function selectClips(
  segments: TranscriptSegment[],
  numClips: number,
  clipLength?: number | null
): ClipCandidate[] {
  if (!segments || segments.length === 0) {
    return [];
  }

  const duration = segments[segments.length - 1]?.end || 0;
  if (duration === 0) return [];

  // Determine target clip length
  const targetLen = clipLength && clipLength > 0
    ? clipLength
    : Math.max(MIN_CLIP_LEN, Math.min(IDEAL_CLIP_LEN, duration / (numClips + 1)));

  // Build candidate windows
  const candidates: ClipCandidate[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.end - seg.start < 1) continue;

    // Start the window at this segment
    const windowStart = seg.start;

    // Extend the window until we hit the target length, preferring sentence ends
    let windowEnd = windowStart + targetLen;
    let endIdx = i;

    for (let j = i; j < segments.length; j++) {
      const s = segments[j];
      if (s.start >= windowStart + targetLen * 1.5) break; // too far
      if (s.start >= windowStart + MIN_CLIP_LEN) {
        // Check if this is a good ending point
        const text = s.text.trim();
        const endsSentence = SENT_END.some((c) => text.endsWith(c));
        const isStrongEnd = endsSentence || j === segments.length - 1;

        if (isStrongEnd || s.start >= windowStart + targetLen) {
          windowEnd = Math.min(s.end, windowStart + MAX_CLIP_LEN);
          endIdx = j;
          break;
        }
      }
      endIdx = j;
      windowEnd = s.end;
    }

    const clipLen = windowEnd - windowStart;
    if (clipLen < MIN_CLIP_LEN) continue;

    // Score this candidate
    const windowSegments = segments.slice(i, endIdx + 1);
    const score = scoreCandidate(windowSegments, windowStart, windowEnd, targetLen);

    // Generate a title from the first few words
    const firstText = windowSegments[0]?.text || "";
    const title = generateTitle(firstText);

    candidates.push({
      start: windowStart,
      end: windowEnd,
      title,
      score,
    });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Select non-overlapping clips
  const selected: ClipCandidate[] = [];
  for (const c of candidates) {
    if (selected.length >= numClips) break;
    // Check for overlap with already-selected clips
    const overlaps = selected.some(
      (s) => c.start < s.end && c.end > s.start
    );
    if (!overlaps) {
      selected.push(c);
    }
  }

  // Sort selected by start time
  selected.sort((a, b) => a.start - b.start);

  return selected;
}

function scoreCandidate(
  segments: TranscriptSegment[],
  start: number,
  end: number,
  targetLen: number
): number {
  const duration = end - start;
  const allText = segments.map((s) => s.text).join(" ");
  const words = allText.split(/\s+/).filter(Boolean);

  // 1. Word density (words per second) — prefer dense, content-rich windows
  const density = words.length / Math.max(1, duration);
  const densityScore = Math.min(1, density / 3); // 3 words/sec = max

  // 2. Sentence completeness — bonus if ends on a sentence terminator
  const lastText = segments[segments.length - 1]?.text.trim() || "";
  const endsSentence = SENT_END.some((c) => lastText.endsWith(c));
  const completenessScore = endsSentence ? 1 : 0.3;

  // 3. Strong/hook words — bonus for curiosity-driving language
  const lowerWords = words.map((w) => w.toLowerCase());
  const strongCount = lowerWords.filter((w) => STRONG_WORDS.has(w)).length;
  const strongScore = Math.min(1, strongCount / 3);

  // 4. Length proximity to ideal — prefer clips close to target length
  const lengthDiff = Math.abs(duration - targetLen);
  const lengthScore = Math.max(0, 1 - lengthDiff / targetLen);

  // 5. Topic boundary — check if the next segment after this clip is a topic shift
  let topicScore = 0.5;
  if (segments.length >= 2) {
    const lastSeg = segments[segments.length - 1];
    const gap = start + duration - lastSeg.end;
    if (gap > TOPIC_PAUSE_GAP) {
      topicScore = 1.0; // natural pause = good boundary
    }
  }

  // Weighted sum
  return (
    densityScore * 0.25 +
    completenessScore * 0.20 +
    strongScore * 0.30 +
    lengthScore * 0.15 +
    topicScore * 0.10
  );
}

function generateTitle(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).slice(0, 6);
  let title = words.join(" ");
  // Remove trailing punctuation
  title = title.replace(/[.,!?;:।…]+$/, "");
  // Capitalize first letter
  if (title.length > 0) {
    title = title[0].toUpperCase() + title.slice(1);
  }
  return title || "Untitled clip";
}

/**
 * Convert ClipCandidate[] to the Clip[] format used by the store.
 */
export function candidatesToClips(candidates: ClipCandidate[]): Array<{
  start: number;
  end: number;
  name: string;
  color: string;
  enabled: boolean;
}> {
  const colors = [
    "oklch(0.82 0.19 132)",
    "oklch(0.78 0.17 65)",
    "oklch(0.7 0.21 18)",
    "oklch(0.8 0.16 320)",
    "oklch(0.85 0.13 90)",
    "oklch(0.74 0.18 175)",
  ];

  return candidates.map((c, i) => ({
    start: c.start,
    end: c.end,
    name: c.title,
    color: colors[i % colors.length],
    enabled: true,
  }));
}
