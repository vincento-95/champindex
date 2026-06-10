// ============================================================
// ChampIndex — Boussole SVG d'exposition
// ============================================================

interface CompassRoseProps {
  aspect: number;       // Azimut 0-360°
  aspectLabel: string;  // "Nord", "Nord-Est", etc.
}

const directions = [
  { label: 'N', angle: 0 },
  { label: 'NE', angle: 45 },
  { label: 'E', angle: 90 },
  { label: 'SE', angle: 135 },
  { label: 'S', angle: 180 },
  { label: 'SO', angle: 225 },
  { label: 'O', angle: 270 },
  { label: 'NO', angle: 315 },
];

export default function CompassRose({ aspect, aspectLabel }: CompassRoseProps) {
  const center = 60;
  const radius = 45;
  const innerRadius = 20;

  function isHighlighted(dirAngle: number): boolean {
    const diff = Math.abs(aspect - dirAngle);
    return diff < 45 || diff > 315;
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Cercle de fond */}
        <circle cx={center} cy={center} r={radius + 5} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <circle cx={center} cy={center} r={innerRadius} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        {/* Lignes des directions */}
        {directions.map((dir) => {
          const rad = ((dir.angle - 90) * Math.PI) / 180;
          const highlighted = isHighlighted(dir.angle);
          const x1 = center + innerRadius * Math.cos(rad);
          const y1 = center + innerRadius * Math.sin(rad);
          const x2 = center + radius * Math.cos(rad);
          const y2 = center + radius * Math.sin(rad);
          const labelX = center + (radius + 12) * Math.cos(rad);
          const labelY = center + (radius + 12) * Math.sin(rad);

          return (
            <g key={dir.label}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={highlighted ? '#d4a855' : 'rgba(255,255,255,0.15)'}
                strokeWidth={highlighted ? 2.5 : 1}
              />
              <text
                x={labelX} y={labelY}
                textAnchor="middle"
                dominantBaseline="central"
                className={highlighted ? 'fill-amber-400' : 'fill-white/30'}
                style={{ fontSize: highlighted ? '11px' : '9px', fontWeight: highlighted ? 700 : 400 }}
              >
                {dir.label}
              </text>
            </g>
          );
        })}

        {/* Flèche d'exposition */}
        {(() => {
          const rad = ((aspect - 90) * Math.PI) / 180;
          const tipX = center + (radius - 5) * Math.cos(rad);
          const tipY = center + (radius - 5) * Math.sin(rad);
          return (
            <circle
              cx={tipX} cy={tipY} r={4}
              fill="#d4a855"
              style={{ filter: 'drop-shadow(0 0 4px #d4a855)' }}
            />
          );
        })()}

        {/* Point central */}
        <circle cx={center} cy={center} r={3} fill="#d4a855" />
      </svg>
      <p className="text-xs text-white/50 mt-1">Exposition : <span className="text-amber-400 font-semibold">{aspectLabel}</span></p>
    </div>
  );
}
