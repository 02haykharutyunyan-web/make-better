import { Bot, Boxes, Braces, CircuitBoard, Layers3, MessageSquareText, Sparkles, Workflow } from "lucide-react";
import type { ProductType } from "@/data/marketplace";

const iconMap: Record<string, typeof Sparkles> = {
  Prompts: MessageSquareText,
  "AI Agents": Bot,
  "AI Assistants": Sparkles,
  "API Tools": Braces,
  Workflows: Workflow,
  Templates: Layers3,
  "Automation Assets": CircuitBoard,
  "Creator Resources": Boxes,
};

export function AmbientBackground() {
  return (
    <div aria-hidden className="ambient-background">
      <div className="ambient-grid" />
      <div className="ambient-light ambient-light-a" />
      <div className="ambient-light ambient-light-b" />
      <div className="ambient-light ambient-light-c" />
    </div>
  );
}

export function SectionVisual({ variant = "mesh" }: { variant?: "mesh" | "lines" | "market" }) {
  return (
    <div aria-hidden className={`section-visual section-visual-${variant}`}>
      <div className="section-visual-grid" />
      <div className="section-visual-line section-visual-line-a" />
      <div className="section-visual-line section-visual-line-b" />
      <div className="section-visual-chip section-visual-chip-a" />
      <div className="section-visual-chip section-visual-chip-b" />
    </div>
  );
}

export function ProductMockupCard() {
  const rows = [
    { label: "Prompt system", value: "94", width: "w-4/5" },
    { label: "Agent workflow", value: "88", width: "w-2/3" },
    { label: "Template pack", value: "76", width: "w-3/5" },
  ];

  return (
    <div aria-hidden className="relative mx-auto mt-12 w-full max-w-[430px] lg:mt-0">
      <div className="visual-halo" />
      <div className="mockup-card mockup-card-back" />
      <div className="mockup-card mockup-card-mid" />
      <div className="mockup-card mockup-card-front">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#FFD600]">Marketplace signal</div>
            <div className="mt-2 text-xl font-medium tracking-normal text-white">AI Asset Index</div>
          </div>
          <div className="category-glyph category-glyph-lg">
            <CircuitBoard className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-8 grid gap-3">
          {rows.map(row => (
            <div key={row.label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#CFCFCF]">{row.label}</span>
                <span className="text-white">{row.value}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full bg-[#FFD600] ${row.width}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 grid grid-cols-3 gap-3">
          {["Use", "Trust", "Ship"].map(item => (
            <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
              <div className="mx-auto h-6 w-6 rounded-lg border border-[#FFD600]/25 bg-[#FFD600]/10" />
              <div className="mt-2 text-[11px] text-[#CFCFCF]">{item}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CategoryGlyph({ type, size = "md" }: { type?: ProductType | string; size?: "sm" | "md" | "lg" }) {
  const Icon = iconMap[type || ""] || Sparkles;
  return (
    <span className={`category-glyph category-glyph-${size}`}>
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
    </span>
  );
}

export function AssetPreviewVisual({ type, title }: { type?: ProductType | string; title: string }) {
  return (
    <div aria-hidden className="asset-preview-visual">
      <div className="asset-preview-grid" />
      <div className="asset-preview-scan" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <CategoryGlyph type={type} />
          <div className="h-1.5 w-14 rounded-full bg-[#FFD600]/60" />
        </div>
        <div>
          <div className="mb-3 grid gap-1.5">
            <div className="h-1.5 w-4/5 rounded-full bg-white/30" />
            <div className="h-1.5 w-3/5 rounded-full bg-white/15" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/55 line-clamp-1">{title}</div>
        </div>
      </div>
    </div>
  );
}
