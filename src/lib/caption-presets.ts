/**
 * Caption style presets — the single source of truth for caption styles.
 *
 * Each preset defines: font, size, colors (primary, highlight, outline),
 * outline width, shadow, position, animation type, uppercase, tracking,
 * background, max_lines, max_chars.
 *
 * These are used by:
 *   1. The CaptionOverlay component (live CSS preview)
 *   2. The export's ASS subtitle filter (burned into video)
 *
 * Inspired by the reference tool's STYLE_PRESETS — covers creator-style
 * looks (Hormozi, Beast, Bebas, Bangers, etc.).
 */

export interface CaptionPreset {
  id: string;
  label: string;
  fontFamily: string;
  bold: boolean;
  fontSize: number; // relative to 720p height
  primaryColor: string; // #RRGGBB
  highlightColor: string; // #RRGGBB — the "active word" color
  outlineColor: string; // #RRGGBB
  outline: number; // px
  shadow: number; // px (0 = none)
  position: "top" | "center" | "bottom";
  karaoke: boolean; // highlight active word
  animation: "none" | "word_reveal" | "one_word" | "highlight";
  uppercase: boolean;
  tracking: number; // letter-spacing em
  maxLines: number;
  maxChars: number;
  background: boolean;
  backgroundColor: string;
  trending: boolean; // uses a trending display font
}

const BASE: CaptionPreset = {
  id: "",
  label: "",
  fontFamily: "DejaVu Sans",
  bold: true,
  fontSize: 90,
  primaryColor: "#FFFFFF",
  highlightColor: "#FFD400",
  outlineColor: "#000000",
  outline: 5,
  shadow: 1,
  position: "bottom",
  karaoke: false,
  animation: "none",
  uppercase: true,
  tracking: 0,
  maxLines: 2,
  maxChars: 22,
  background: false,
  backgroundColor: "#000000",
  trending: false,
};

function P(id: string, label: string, overrides: Partial<CaptionPreset>): CaptionPreset {
  return { ...BASE, id, label, ...overrides };
}

export const CAPTION_PRESETS: CaptionPreset[] = [
  // --- Originals ---
  P("bold_white", "Bold White", { highlightColor: "#FFFFFF", fontSize: 96, maxChars: 20 }),
  P("karaoke_yellow", "Karaoke Yellow", { karaoke: true, fontSize: 92, highlightColor: "#FFE600" }),
  P("minimal", "Minimal", { bold: false, uppercase: false, fontSize: 64, outline: 1, shadow: 2, highlightColor: "#FFFFFF", maxChars: 28 }),
  P("boxed_tiktok", "Boxed", { background: true, backgroundColor: "#000000", fontSize: 72, maxChars: 24 }),

  // --- Trending creator styles ---
  P("hormozi_green", "Hormozi Green", {
    trending: true, fontFamily: "Montserrat", fontSize: 88,
    highlightColor: "#39FF14", primaryColor: "#FFFFFF", outline: 4,
    animation: "highlight", maxChars: 20,
  }),
  P("hormozi_yellow", "Hormozi Yellow", {
    trending: true, fontFamily: "Montserrat", fontSize: 88,
    highlightColor: "#FFD700", primaryColor: "#FFFFFF", outline: 4,
    animation: "highlight", maxChars: 20,
  }),
  P("beast_red", "Beast Pop", {
    trending: true, fontFamily: "Anton", bold: false, fontSize: 100,
    primaryColor: "#FF1744", highlightColor: "#FFD700", outline: 6,
    uppercase: true, maxChars: 18,
  }),
  P("raj_clean", "Raj Shamani Clean", {
    trending: true, fontFamily: "Poppins", fontSize: 80,
    primaryColor: "#FFFFFF", highlightColor: "#00E5FF", outline: 3,
    uppercase: false, maxChars: 24,
  }),
  P("alex_caps", "Alex Bold Caps", {
    trending: true, fontFamily: "Montserrat", fontSize: 84,
    primaryColor: "#FFFFFF", highlightColor: "#FF6B00", outline: 5,
    uppercase: true, maxChars: 22,
  }),
  P("one_word_punch", "One-Word Punch", {
    trending: true, fontFamily: "Anton", bold: false, fontSize: 120,
    primaryColor: "#FFFFFF", highlightColor: "#FFD400", outline: 8,
    animation: "one_word", maxChars: 12,
  }),
  P("word_reveal", "Word Reveal", {
    trending: true, fontFamily: "Montserrat", fontSize: 90,
    primaryColor: "#FFFFFF", highlightColor: "#39FF14", outline: 4,
    animation: "word_reveal", maxChars: 20,
  }),
  P("bebas_clean", "Bebas Clean", {
    trending: true, fontFamily: "Bebas Neue", bold: false, fontSize: 110,
    primaryColor: "#FFFFFF", highlightColor: "#FFD400", outline: 3,
    uppercase: true, maxChars: 24, tracking: 0.05,
  }),
  P("comic_bangers", "Comic Punch", {
    trending: true, fontFamily: "Bangers", bold: false, fontSize: 95,
    primaryColor: "#FFFFFF", highlightColor: "#FF1744", outline: 6,
    uppercase: true, maxChars: 18,
  }),
  P("slab_impact", "Slab Impact", {
    trending: true, fontFamily: "Alfa Slab One", bold: false, fontSize: 88,
    primaryColor: "#FFFFFF", highlightColor: "#FFD700", outline: 4,
    uppercase: true, maxChars: 20,
  }),
  P("marker_note", "Marker", {
    trending: true, fontFamily: "Permanent Marker", bold: false, fontSize: 82,
    primaryColor: "#FFFFFF", highlightColor: "#00E5FF", outline: 3,
    uppercase: false, maxChars: 22,
  }),
  P("neon_pop", "Neon Pop", {
    trending: true, fontFamily: "Luckiest Guy", bold: false, fontSize: 90,
    primaryColor: "#FFFFFF", highlightColor: "#FF00E5", outline: 5,
    uppercase: true, maxChars: 18,
  }),
  P("oswald_news", "Oswald News", {
    trending: true, fontFamily: "Oswald", fontSize: 78,
    primaryColor: "#FFFFFF", highlightColor: "#FFD400", outline: 3,
    uppercase: true, maxChars: 26, tracking: 0.03,
  }),
  P("green_word", "Green Word", {
    trending: true, fontFamily: "Poppins", fontSize: 84,
    primaryColor: "#39FF14", highlightColor: "#FFFFFF", outline: 4,
    animation: "highlight", maxChars: 20,
  }),
  P("titan_bold", "Titan Bold", {
    trending: true, fontFamily: "Titan One", bold: false, fontSize: 92,
    primaryColor: "#FFFFFF", highlightColor: "#FFD400", outline: 5,
    uppercase: true, maxChars: 18,
  }),
  P("russo_strong", "Russo Strong", {
    trending: true, fontFamily: "Russo One", bold: false, fontSize: 85,
    primaryColor: "#FFFFFF", highlightColor: "#00E5FF", outline: 4,
    uppercase: true, maxChars: 20,
  }),
];

export const DEFAULT_PRESET = "bold_white";

export function getPreset(id: string): CaptionPreset {
  return CAPTION_PRESETS.find((p) => p.id === id) || CAPTION_PRESETS[0];
}

/**
 * Convert a hex color (#RRGGBB) to ASS &HBBGGRR format for libass.
 */
export function hexToAss(hex: string): string {
  const h = hex.replace("#", "");
  return `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase();
}
