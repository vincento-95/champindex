// ============================================================
// ChampIndex — Icônes SVG custom (monoline, stroke-based)
// Style Lucide/Phosphor — crisp à toute taille, colorables en CSS
// ============================================================

interface IconProps {
  size?: number;
  className?: string;
}

const defaultProps = { size: 24, className: '' };

// ── Champignon (catégorie mushroom) ──
export function IconMushroom({ size = defaultProps.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Chapeau */}
      <path d="M4 13c0-4.4 3.6-8 8-8s8 3.6 8 8H4z" />
      {/* Pied */}
      <path d="M10 13v6c0 .6.4 1 1 1h2c.6 0 1-.4 1-1v-6" />
      {/* Lamelles */}
      <path d="M9 13v2M12 13v3M15 13v2" />
    </svg>
  );
}

// ── Plante / Feuille (catégorie plant) ──
export function IconPlant({ size = defaultProps.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Feuille */}
      <path d="M12 22V8" />
      <path d="M5 12c0-5 3-9 7-9s7 4 7 9c0 3-2.5 5-7 5s-7-2-7-5z" />
      {/* Nervures */}
      <path d="M12 8c-2 2-4 3.5-5.5 4.5" />
      <path d="M12 8c2 2 4 3.5 5.5 4.5" />
      <path d="M12 12c-1.5 1-3 2-4 2.5" />
      <path d="M12 12c1.5 1 3 2 4 2.5" />
    </svg>
  );
}

// ── Baie (catégorie berry) ──
export function IconBerry({ size = defaultProps.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Tige */}
      <path d="M12 3v5" />
      <path d="M10 5c1 0 2-.5 2-2" />
      {/* Baies */}
      <circle cx="9" cy="12" r="3.5" />
      <circle cx="15" cy="12" r="3.5" />
      <circle cx="12" cy="17" r="3.5" />
      {/* Petite feuille */}
      <path d="M14 4c1.5.5 2.5 2 2 3.5" />
    </svg>
  );
}

// ── Forêt / Arbre ──
export function IconForest({ size = defaultProps.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3L6 11h3l-2 5h3l-2 5h8l-2-5h3l-2-5h3L12 3z" />
      <path d="M12 21v-2" />
    </svg>
  );
}

// ── Pin de localisation avec feuille ──
export function IconLocationLeaf({ size = defaultProps.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 21c-4-4-7-7.5-7-11a7 7 0 1114 0c0 3.5-3 7-7 11z" />
      {/* Feuille dans le pin */}
      <path d="M12 7c-1.5 1-2 3-1.5 4.5.3 1 1.2 1.5 1.5 1.5s1.2-.5 1.5-1.5c.5-1.5 0-3.5-1.5-4.5z" />
    </svg>
  );
}

// ── Caméra + feuille (identification) ──
export function IconCameraLeaf({ size = defaultProps.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" />
      {/* Feuille au lieu du cercle classique */}
      <path d="M12 10c-2 1.5-2.5 4-1.5 5.5.5 1 1.2 1.3 1.5 1.3s1-.3 1.5-1.3c1-1.5.5-4-1.5-5.5z" />
    </svg>
  );
}

// ── Météo (nuage + soleil) ──
export function IconWeather({ size = defaultProps.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.5 19H9a5 5 0 01-.5-10 7 7 0 0113 3.5 4 4 0 01-4 6.5z" />
      <path d="M22 10a3 3 0 00-3-3" />
      {/* Rayons soleil */}
      <path d="M20 3v2M23.5 6.5l-1.5 1M16.5 6.5l1.5 1" />
    </svg>
  );
}

// ── Alerte / Cloche ──
export function IconAlert({ size = defaultProps.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
      {/* Point notif */}
      <circle cx="18" cy="5" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ── Danger / Crâne ──
export function IconDanger({ size = defaultProps.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="10" r="7" />
      {/* Yeux */}
      <circle cx="9.5" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="9" r="1" fill="currentColor" stroke="none" />
      {/* Nez */}
      <path d="M12 11v1.5" />
      {/* Mâchoire */}
      <path d="M8 17h8" />
      <path d="M9 17v3M11 17v3M13 17v3M15 17v3" />
    </svg>
  );
}

// ── Logo ChampIndex (champignon stylisé + cercle) ──
export function IconLogo({ size = defaultProps.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      {/* Cercle extérieur */}
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      {/* Chapeau du champignon */}
      <path d="M12 26c0-6.6 5.4-12 12-12s12 5.4 12 26H12z"
        fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      {/* Pied */}
      <path d="M20 26v10c0 1 .8 1.8 1.8 1.8h4.4c1 0 1.8-.8 1.8-1.8V26"
        stroke="currentColor" strokeWidth="1.5" />
      {/* Points sur le chapeau */}
      <circle cx="18" cy="22" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="24" cy="19" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="30" cy="22" r="1.2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
