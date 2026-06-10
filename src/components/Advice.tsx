// ============================================================
// ChampIndex — Conseil contextuel
// ============================================================

interface AdviceProps {
  advice: string;
}

export default function Advice({ advice }: AdviceProps) {
  return (
    <div className="mx-4 mt-6 p-4 rounded-xl bg-[#2d3828]/40 border border-white/5 border-l-4 border-l-emerald-400">
      <div className="flex gap-3">
        <span className="text-xl flex-shrink-0" aria-hidden="true">💡</span>
        <p className="text-sm text-white/80 leading-relaxed">{advice}</p>
      </div>
    </div>
  );
}
