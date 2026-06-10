// ============================================================
// ChampIndex — API PlantNet (identification par photo)
// https://my.plantnet.org/doc/getting-started/introduction
// ============================================================

import { FORAGING_SPECIES } from './foraging-db';
import type { ForagingSpecies } from '../types';

// Clé API via variable d'environnement (pas exposée dans le bundle en prod)
// Fallback sur la clé directe pour le dev
const API_KEY = import.meta.env.VITE_PLANTNET_API_KEY || '2b10o5cBRIFH4CXXWop0IiVhju';
const API_BASE = 'https://my-api.plantnet.org/v2/identify';
const PROJECT = 'all';

// Organes valides pour PlantNet (pas de "auto")
export type PlantOrgan = 'flower' | 'leaf' | 'fruit' | 'bark' | 'habit';

export interface PlantNetResult {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    scientificName: string;
    genus: { scientificName: string };
    family: { scientificName: string };
    commonNames: string[];
  };
  images: { url: { m: string } }[];
}

export interface PlantNetResponse {
  query: {
    project: string;
    organs: string[];
    remainingIdentificationRequests: number;
  };
  results: PlantNetResult[];
  remainingIdentificationRequests: number;
}

// ── Compression d'image avant envoi ──

const MAX_IMAGE_SIZE = 1200; // px (côté le plus long)
const JPEG_QUALITY = 0.8;

function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    // Si déjà petit (< 500KB), pas de compression
    if (file.size < 500 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width <= MAX_IMAGE_SIZE && height <= MAX_IMAGE_SIZE) {
        resolve(file);
        return;
      }

      // Redimensionner
      const ratio = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
          } else {
            resolve(file); // fallback
          }
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback
    };

    img.src = url;
  });
}

// ── Matching PlantNet → notre base locale ──

export function matchToLocalSpecies(latin: string): ForagingSpecies | null {
  const normalized = latin.toLowerCase().trim();
  const binomial = normalized.split(' ').slice(0, 2).join(' ');

  // 1. Match exact sur le nom latin complet
  const exact = FORAGING_SPECIES.find(s => s.latin.toLowerCase() === normalized);
  if (exact) return exact;

  // 2. Match sur le binomial (genre + espèce)
  const binomialMatch = FORAGING_SPECIES.find(s =>
    s.latin.toLowerCase().split(' ').slice(0, 2).join(' ') === binomial
  );
  if (binomialMatch) return binomialMatch;

  // 3. Match sur le genre seul (fallback partiel)
  const genus = normalized.split(' ')[0];
  const genusMatch = FORAGING_SPECIES.find(s =>
    s.latin.toLowerCase().startsWith(genus + ' ')
  );
  return genusMatch || null;
}

// ── API ──

export async function identifySpecies(
  imageFile: File,
  organ: PlantOrgan = 'leaf',
): Promise<PlantNetResponse> {
  // Compresser l'image avant envoi
  const compressed = await compressImage(imageFile);

  const url = `${API_BASE}/${PROJECT}?api-key=${API_KEY}&include-related-images=true&lang=fr`;

  const formData = new FormData();
  formData.append('images', compressed);
  formData.append('organs', organ);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Aucune espèce identifiée. Essayez avec une photo plus nette.');
      }
      if (response.status === 429) {
        throw new Error('Limite quotidienne atteinte (500/jour). Réessayez demain.');
      }
      if (response.status === 400) {
        throw new Error('Image invalide. Essayez une autre photo.');
      }
      throw new Error(`Erreur PlantNet (${response.status}). Réessayez.`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Délai dépassé. Vérifiez votre connexion.');
    }
    throw err;
  }
}
