// ============================================================
// ChampIndex — Photo d'identification espèce
// Lazy-load, fallback emoji, zoom plein écran
// ============================================================

import { useState, memo } from 'react';

interface SpeciesPhotoProps {
  speciesId: string;
  emoji: string;
  nom: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Résout l'URL de la photo. Convention : /photos/{speciesId}.jpg
 * Retourne null si pas de photo (fallback emoji).
 */
function getPhotoUrl(speciesId: string): string {
  return `${import.meta.env.BASE_URL}photos/${speciesId}.jpg`;
}

export default memo(function SpeciesPhoto({ speciesId, emoji, nom, size = 'sm' }: SpeciesPhotoProps) {
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10 text-2xl',
    md: 'w-16 h-16 text-3xl',
    lg: 'w-24 h-24 text-4xl',
  };

  const url = getPhotoUrl(speciesId);

  // Pas de photo → emoji
  if (failed) {
    return <span className={`${sizeClasses[size]} flex items-center justify-center flex-shrink-0`}>{emoji}</span>;
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setZoomed(true); }}
        className={`${sizeClasses[size]} flex-shrink-0 rounded-xl overflow-hidden bg-paper-deep`}
      >
        <img
          src={url}
          alt={nom}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      </button>

      {/* Lightbox zoom */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <img
            src={url}
            alt={nom}
            className="max-w-full max-h-full rounded-xl object-contain"
          />
          <button
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl"
          >
            &times;
          </button>
          <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/60">{nom}</p>
        </div>
      )}
    </>
  );
});
