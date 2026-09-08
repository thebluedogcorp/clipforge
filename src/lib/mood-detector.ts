/**
 * Mood detector for music suggestions.
 *
 * Counts keyword hits (English + Roman Urdu/Hindi) in the transcript and
 * maps the strongest signal to a music mood. No model, no network —
 * fully transparent.
 *
 * Inspired by the reference tool's mood.py.
 */

export interface MoodResult {
  mood: string;
  label: string;
  emoji: string;
  hint: string;
  scores: Record<string, number>;
}

const KEYWORDS: Record<string, string[]> = {
  romantic: ["love", "heart", "pyar", "pyaar", "ishq", "mohabbat", "romance", "dil",
    "beloved", "kiss", "crush", "relationship", "feelings", "mohabat", "chahat"],
  sad: ["sad", "cry", "alone", "tears", "pain", "dard", "udaas", "rona", "lonely",
    "broken", "miss", "death", "loss", "hurt", "depress", "gham", "tanha", "akela"],
  happy: ["happy", "joy", "fun", "laugh", "celebrate", "khushi", "maza", "mazaa",
    "smile", "excited", "amazing", "great", "awesome", "enjoy", "khush", "hassi"],
  energetic: ["money", "hustle", "grind", "power", "win", "energy", "party", "dance",
    "success", "goal", "beast", "fire", "boss", "gym", "paisa", "mehnat",
    "kamyabi", "jeet", "speed"],
  calm: ["calm", "peace", "relax", "slow", "quiet", "meditate", "sukoon", "breath",
    "gentle", "soft", "shanti", "aaram"],
};

const LABELS: Record<string, [string, string, string]> = {
  romantic: ["Romantic", "💜", "soft, emotional track"],
  sad: ["Sad / Emotional", "🖤", "slow, emotional track"],
  happy: ["Happy / Upbeat", "☀️", "cheerful, upbeat track"],
  energetic: ["Energetic / Hype", "🔥", "high-energy trap / hype beat"],
  calm: ["Calm / Chill", "🌙", "chill lo-fi track"],
  neutral: ["Neutral", "🎵", "any subtle background track"],
};

export function suggestMood(text: string): MoodResult {
  const t = (text || "").toLowerCase();
  const scores: Record<string, number> = {};
  let total = 0;

  for (const [mood, kws] of Object.entries(KEYWORDS)) {
    let count = 0;
    for (const kw of kws) {
      // word-boundary match to avoid partial hits
      const regex = new RegExp(`\\b${kw}\\b`, "gi");
      const matches = t.match(regex);
      if (matches) count += matches.length;
    }
    scores[mood] = count;
    total += count;
  }

  let best = "neutral";
  if (total > 0) {
    best = Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }

  const [label, emoji, hint] = LABELS[best] || LABELS.neutral;
  return { mood: best, label, emoji, hint, scores };
}
