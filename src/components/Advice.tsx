// ============================================================
// ChampIndex — Conseil contextuel
// ============================================================

interface AdviceProps {
  advice: string;
}

export default function Advice({ advice }: AdviceProps) {
  return (
    <div className="mx-4 mt-6 p-4 rounded-xl bg-moss-wash border-l-4 border-moss">
      <div className="flex gap-3">
        <span className="material-symbols-outlined !text-xl text-moss flex-shrink-0" aria-hidden="true">
          lightbulb
        </span>
        <p className="text-sm text-ink leading-relaxed">{advice}</p>
      </div>
    </div>
  );
}
