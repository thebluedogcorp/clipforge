/**
 * Cinematic video effects — ffmpeg filter chains for the "reel" look.
 *
 * Each effect is an ffmpeg filter expression that sits between the reframed
 * video and the burned-in captions. Color grades use `eq`/`colorbalance`/
 * `curves`; glow uses `split`→`gblur`→`blend=screen`; gradients use
 * stacked `drawbox` bands; vignette uses `geq`; grain uses `noise`.
 *
 * Inspired by the reference tool's effects.py.
 */

export interface ColorGrade {
  id: string;
  label: string;
  filter: string; // ffmpeg -vf filter chain
  cssFilter: string; // CSS filter for live preview
}

export const COLOR_GRADES: ColorGrade[] = [
  { id: "none", label: "None", filter: "", cssFilter: "none" },
  { id: "warm", label: "Warm", filter: "eq=saturation=1.10,colorbalance=rm=0.06:gm=0.02:bm=-0.06:rh=0.05:bh=-0.06", cssFilter: "saturate(1.1) sepia(0.15)" },
  { id: "cool", label: "Cool", filter: "eq=saturation=1.05,colorbalance=rm=-0.05:bm=0.06:bh=0.06", cssFilter: "saturate(1.05) hue-rotate(180deg) brightness(0.95)" },
  { id: "teal_orange", label: "Teal & Orange", filter: "colorbalance=rh=0.08:gh=0.02:bh=-0.05:bs=0.06:gs=0.02:rs=-0.05,eq=saturation=1.12:contrast=1.05", cssFilter: "saturate(1.2) contrast(1.05) hue-rotate(-10deg)" },
  { id: "vintage", label: "Vintage", filter: "curves=preset=vintage", cssFilter: "sepia(0.4) contrast(1.1) brightness(0.95)" },
  { id: "vibrant", label: "Vibrant", filter: "eq=saturation=1.35:contrast=1.08:brightness=0.01", cssFilter: "saturate(1.35) contrast(1.08) brightness(1.01)" },
  { id: "bw", label: "B&W", filter: "hue=s=0,eq=contrast=1.10", cssFilter: "grayscale(1) contrast(1.1)" },
];

export interface CinematicEffect {
  id: string;
  label: string;
  description: string;
}

export const CINEMATIC_EFFECTS: CinematicEffect[] = [
  { id: "glow", label: "Glow / Bloom", description: "Soft highlight bloom" },
  { id: "bottom_fade", label: "Bottom Fade", description: "Dark gradient at the bottom" },
  { id: "top_fade", label: "Top Fade", description: "Dark gradient at the top" },
  { id: "vignette", label: "Vignette", description: "Darkened corners" },
  { id: "grain", label: "Film Grain", description: "Subtle noise texture" },
];

export interface EffectSettings {
  glow: boolean;
  glowStrength: number; // 0..100
  bottomFade: boolean;
  bottomFadeStrength: number;
  topFade: boolean;
  topFadeStrength: number;
  vignette: boolean;
  vignetteStrength: number;
  grain: boolean;
  grainStrength: number;
}

export const DEFAULT_EFFECTS: EffectSettings = {
  glow: false,
  glowStrength: 50,
  bottomFade: false,
  bottomFadeStrength: 50,
  topFade: false,
  topFadeStrength: 50,
  vignette: false,
  vignetteStrength: 40,
  grain: false,
  grainStrength: 40,
};

/**
 * Build the ffmpeg filter chain for cinematic effects.
 * Returns a string of comma-separated filters (to prepend before captions).
 */
export function buildEffectFilter(effects: EffectSettings, vw: number, vh: number): string {
  const parts: string[] = [];

  if (effects.glow) {
    const sigma = 6 + (effects.glowStrength / 100) * 16; // 6..22
    const opacity = 0.35 + (effects.glowStrength / 100) * 0.5; // 0.35..0.85
    parts.push(
      `split=2[g0][g1];[g1]gblur=sigma=${sigma}:color=gray[gbloom];[g0][gbloom]blend=screen:all_mode=screen:opacity=${opacity}`
    );
  }

  if (effects.bottomFade) {
    const strength = effects.bottomFadeStrength / 100; // 0..1
    const bands = 32;
    const bandHeight = Math.floor(vh * 0.3 / bands);
    const fadeParts: string[] = [];
    for (let i = 0; i < bands; i++) {
      const y = vh - bandHeight * (bands - i);
      const alpha = Math.round(strength * 255 * (i / bands));
      fadeParts.push(`drawbox=x=0:y=${y}:w=${vw}:h=${bandHeight}:color=black@${(alpha / 255).toFixed(3)}:t=fill`);
    }
    parts.push(fadeParts.join(","));
  }

  if (effects.topFade) {
    const strength = effects.topFadeStrength / 100;
    const bands = 32;
    const bandHeight = Math.floor(vh * 0.3 / bands);
    const fadeParts: string[] = [];
    for (let i = 0; i < bands; i++) {
      const y = bandHeight * i;
      const alpha = Math.round(strength * 255 * ((bands - i) / bands));
      fadeParts.push(`drawbox=x=0:y=${y}:w=${vw}:h=${bandHeight}:color=black@${(alpha / 255).toFixed(3)}:t=fill`);
    }
    parts.push(fadeParts.join(","));
  }

  if (effects.vignette) {
    const strength = effects.vignetteStrength / 100;
    const angle = Math.PI * (0.5 + strength * 0.5);
    parts.push(`geq=lum='lum*(1-(${strength.toFixed(2)}*(1-sin(X/${vw}*${angle.toFixed(2)})*sin(Y/${vh}*${angle.toFixed(2)}))))'`);
  }

  if (effects.grain) {
    const strength = Math.round(4 + (effects.grainStrength / 100) * 28); // 4..32
    parts.push(`noise=alls=${strength}:allf=t`);
  }

  return parts.length > 0 ? parts.join(",") : "";
}

/**
 * Build a CSS filter string for the live preview of color grades.
 */
export function buildCssFilter(gradeId: string): string {
  const grade = COLOR_GRADES.find((g) => g.id === gradeId);
  return grade?.cssFilter || "none";
}
