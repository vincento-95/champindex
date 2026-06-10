// ============================================================
// ChampIndex — Conseil contextuel
// ============================================================

interface AdviceProps {
  advice: string;
}

export default function Advice({ advice }: AdviceProps) {
  return (
    <div className="mx-4 mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
      <div className="flex gap-3">
        <span className="text-2xl flex-shrink-0">💡</span>
        <p className="text-sm text-amber-100/90 leading-relaxed">{advice}</p>
      </div>
    </div>
  );
}
