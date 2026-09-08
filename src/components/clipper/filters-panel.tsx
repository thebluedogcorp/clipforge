"use client";

import { Wand2, Sun, Contrast, Droplet, Grid3x3, Circle, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useClipper } from "@/lib/store";

const PRESETS: { name: string; filters: { brightness: number; contrast: number; saturation: number; grayscale: number; blur: number } }[] = [
  { name: "Normal", filters: { brightness: 1, contrast: 1, saturation: 1, grayscale: 0, blur: 0 } },
  { name: "Vivid", filters: { brightness: 1.1, contrast: 1.2, saturation: 1.5, grayscale: 0, blur: 0 } },
  { name: "Warm", filters: { brightness: 1.05, contrast: 1.1, saturation: 1.3, grayscale: 0, blur: 0 } },
  { name: "Cool", filters: { brightness: 0.95, contrast: 1.15, saturation: 0.8, grayscale: 0, blur: 0 } },
  { name: "B&W", filters: { brightness: 1, contrast: 1.2, saturation: 0, grayscale: 1, blur: 0 } },
  { name: "Vintage", filters: { brightness: 0.9, contrast: 0.85, saturation: 0.6, grayscale: 0.2, blur: 0 } },
  { name: "Dream", filters: { brightness: 1.15, contrast: 0.9, saturation: 1.1, grayscale: 0, blur: 1.5 } },
  { name: "Sharp", filters: { brightness: 1, contrast: 1.3, saturation: 1.2, grayscale: 0, blur: 0 } },
];

export function FiltersPanel() {
  const filters = useClipper((s) => s.filters);
  const setFilters = useClipper((s) => s.setFilters);
  const resetFilters = useClipper((s) => s.resetFilters);

  const isDefault =
    filters.brightness === 1 &&
    filters.contrast === 1 &&
    filters.saturation === 1 &&
    filters.grayscale === 0 &&
    filters.blur === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Adjust
          </h3>
        </div>
        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={resetFilters}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      {/* Presets */}
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">Presets</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {PRESETS.map((p) => {
            const active =
              filters.brightness === p.filters.brightness &&
              filters.contrast === p.filters.contrast &&
              filters.saturation === p.filters.saturation &&
              filters.grayscale === p.filters.grayscale &&
              filters.blur === p.filters.blur;
            return (
              <button
                key={p.name}
                onClick={() => setFilters(p.filters)}
                className={`rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-all ${
                  active
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Sliders */}
      <div className="space-y-4">
        <FilterSlider
          icon={Sun}
          label="Brightness"
          value={filters.brightness}
          min={0.3}
          max={2}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => setFilters({ brightness: v })}
        />
        <FilterSlider
          icon={Contrast}
          label="Contrast"
          value={filters.contrast}
          min={0}
          max={2}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => setFilters({ contrast: v })}
        />
        <FilterSlider
          icon={Droplet}
          label="Saturation"
          value={filters.saturation}
          min={0}
          max={3}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => setFilters({ saturation: v })}
        />
        <FilterSlider
          icon={Circle}
          label="Grayscale"
          value={filters.grayscale}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => setFilters({ grayscale: v })}
        />
        <FilterSlider
          icon={Grid3x3}
          label="Blur"
          value={filters.blur}
          min={0}
          max={10}
          step={0.5}
          format={(v) => `${v.toFixed(1)}px`}
          onChange={(v) => setFilters({ blur: v })}
        />
      </div>

      <div className="rounded-lg border border-border/50 bg-card/40 p-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Filters apply live to the preview and are burned into exported video.
          Use presets for quick looks, or fine-tune each slider individually.
        </p>
      </div>
    </div>
  );
}

function FilterSlider({
  icon: Icon,
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  icon: typeof Sun;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Label>
        <span className="font-mono text-[11px] text-foreground/80">{format(value)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
