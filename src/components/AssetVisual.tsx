export default function AssetVisual({ title }: { title: string }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#1E293B] bg-[hsl(var(--surface))] sm:aspect-[16/10] md:rounded-3xl">
      <div className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(600px 300px at 20% 10%, rgb(37 99 255 / 0.22), transparent 60%), radial-gradient(500px 300px at 100% 100%, rgb(34 211 238 / 0.12), transparent 60%)",
        }}
      />
      <div className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgb(59 130 246 / 0.10) 1px, transparent 1px), linear-gradient(90deg, rgb(59 130 246 / 0.10) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />
      <div className="absolute top-4 left-4 right-4 flex min-w-0 items-center gap-1.5 sm:top-6 sm:left-6 sm:right-6">
        <span className="h-2.5 w-2.5 rounded-full bg-[#F97316]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#2563FF]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#22D3EE]/60" />
        <span className="ml-2 min-w-0 truncate text-[10px] text-[#94A3B8]/70 font-mono sm:ml-3 sm:text-[11px]">make-better.app/run</span>
      </div>
      <div className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#94A3B8]/70">Interface preview</div>
        <div className="mt-2 line-clamp-3 max-w-md text-xl font-medium tracking-tight text-white/90 sm:text-2xl md:text-3xl">
          {title}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
          <span className="rounded-lg border border-[#1E293B] bg-[#111827]/75 px-2.5 py-1 text-[11px] text-[#94A3B8] font-mono">{`> analyze`}</span>
          <span className="rounded-lg border border-[#1E293B] bg-[#111827]/75 px-2.5 py-1 text-[11px] text-[#94A3B8] font-mono">{`> validate`}</span>
          <span className="rounded-lg border border-[#1E293B] bg-[#111827]/75 px-2.5 py-1 text-[11px] text-[#94A3B8] font-mono">{`> output`}</span>
        </div>
      </div>
      <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[#2563FF]/10 blur-3xl animate-glow" />
    </div>
  );
}
