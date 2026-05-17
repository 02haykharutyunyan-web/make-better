export default function AssetVisual({ title }: { title: string }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-white/10 bg-[hsl(var(--surface))]">
      <div className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(600px 300px at 20% 10%, hsl(0 0% 100% / 0.08), transparent 60%), radial-gradient(500px 300px at 100% 100%, hsl(0 0% 100% / 0.05), transparent 60%)",
        }}
      />
      <div className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100% / 0.04) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />
      <div className="absolute top-6 left-6 right-6 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <span className="ml-3 text-[11px] text-white/40 font-mono">make-better.app/run</span>
      </div>
      <div className="absolute bottom-8 left-8 right-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">Interface preview</div>
        <div className="mt-2 text-2xl md:text-3xl font-medium tracking-tight text-white/90 max-w-md">
          {title}
        </div>
        <div className="mt-5 flex gap-2">
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/60 font-mono">{`> analyze`}</span>
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/60 font-mono">{`> validate`}</span>
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/60 font-mono">{`> output`}</span>
        </div>
      </div>
      <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/[0.04] blur-3xl animate-glow" />
    </div>
  );
}
