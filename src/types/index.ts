// ============================================================
// ChampIndex — Types
// ============================================================

// --- Géolocalisation & Spots ---

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Spot extends Coordinates {
  name: string;
  region: string;
}

// --- Météo ---

export interface WeatherDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  temperature_2m_mean: number[];
  precipitation_sum: number[];
  precipitation_probability_max?: number[];
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  daily: WeatherDaily;
}

export interface WeatherScoreDetail {
  factor: string;
  label: string;
  value: string;
  score: number;
  maxScore: number;
  impact: '++' | '+' | '~' | '-' | '--';
}

export interface WeatherScore {
  total: number;
  details: WeatherScoreDetail[];
}

// --- Terrain / Élévation ---

export interface ElevationPoint {
  lat: number;
  lon: number;
  elevation: number;
}

export interface ElevationGrid {
  points: ElevationPoint[];
  centerElevation: number;
}

export interface TerrainData {
  slope: number;        // degrés
  aspect: number;       // azimut 0-360°
  aspectLabel: string;  // "Nord", "Nord-Est", etc.
  altitude: number;     // mètres
  twi: number;          // Topographic Wetness Index
  twiLabel: string;     // "Élevée", "Moyenne", "Faible"
}

export interface TerrainScoreDetail {
  factor: string;
  label: string;
  value: string;
  score: number;
  favorable: 'bon' | 'moyen' | 'défavorable';
}

export interface TerrainScore {
  total: number;
  details: TerrainScoreDetail[];
}

// --- Score global ---

export type ScoreLevel =
  | 'exceptionnel'
  | 'tres-favorable'
  | 'favorable'
  | 'moyen'
  | 'peu-favorable'
  | 'defavorable';

export interface ScoreLevelInfo {
  label: string;
  color: string;
  emoji: string;
  advice: string;
}

export interface MushroomScore {
  total: number;
  level: ScoreLevel;
  levelInfo: ScoreLevelInfo;
  weather: WeatherScore;
  terrain: TerrainScore | null;
  species: MushroomSpecies[];
  location: string;
  coordinates: Coordinates;
  date: string;
}

// --- Prévisions 7 jours ---

export interface ForecastDay {
  date: string;
  dayName: string;
  dayNumber: number;
  score: number;
  level: ScoreLevel;
  tempMin: number;
  tempMax: number;
  precipitation: number;
  precipitationProbability: number;
  isToday: boolean;
}

// --- Espèces (legacy) ---

export type RainNeed = 'faible' | 'modéré' | 'élevé' | 'très élevé';
export type Exposure = 'ombre' | 'mi-ombre' | 'indifférent';
export type SlopePreference = 'plat' | 'douce' | 'indifférent';
export type Edibility = 'excellent' | 'bon' | 'moyen';

export interface MushroomSpecies {
  id: string;
  nom: string;
  latin: string;
  emoji: string;
  moisDebut: number;
  moisFin: number;
  tempMin: number;
  tempMax: number;
  besoinPluie: RainNeed;
  altitudeMin: number;
  altitudeMax: number;
  expositionPreferee: Exposure;
  pentePreferee: SlopePreference;
  essences: string[];
  description: string;
  confusionsDangereuses: string;
  comestibilite: Edibility;
}

// --- Foraging (extension multi-catégories) ---

export type ForagingCategory = 'mushroom' | 'plant' | 'berry';

export type ForagingEdibility =
  | 'exceptionnel' | 'excellent' | 'tres_bon' | 'bon' | 'moyen'
  | 'mediocre' | 'medicinal' | 'non_comestible' | 'toxique' | 'mortel';

export type ConfusionDangerLevel =
  | 'tres_faible' | 'faible' | 'moyen' | 'eleve' | 'tres_eleve' | 'mortel';

export type SeasonIntensity = 'none' | 'season' | 'peak';

export interface SeasonDetail {
  jan: SeasonIntensity;
  fev: SeasonIntensity;
  mar: SeasonIntensity;
  avr: SeasonIntensity;
  mai: SeasonIntensity;
  jun: SeasonIntensity;
  jul: SeasonIntensity;
  aou: SeasonIntensity;
  sep: SeasonIntensity;
  oct: SeasonIntensity;
  nov: SeasonIntensity;
  dec: SeasonIntensity;
}

export interface ConfusionEntry {
  espece: string;
  danger: 'inoffensif' | 'toxique' | 'mortel';
  description: string;
}

export type ForagingExposure = 'ombre' | 'mi-ombre' | 'indifférent' | 'soleil';

export interface ForagingSpecies {
  id: string;
  category: ForagingCategory;
  nom: string;
  latin: string;
  emoji: string;

  // Comestibilité & danger
  comestibilite: ForagingEdibility;
  partiesComestibles?: string;
  dangerConfusion: ConfusionDangerLevel;
  confusions: ConfusionEntry[];

  // Saisonnalité
  moisDebut: number;
  moisFin: number;
  saisonDetail: SeasonDetail;

  // Conditions météo & terrain
  tempMin: number;
  tempMax: number;
  tempNuitMin?: number;
  tempNuitMax?: number;
  besoinPluie: RainNeed;
  humiditeMin?: number;
  humiditeMax?: number;
  conditionDeclenchante?: string;

  // Habitat
  altitudeMin: number;
  altitudeMax: number;
  expositionPreferee: ForagingExposure;
  pentePreferee: SlopePreference;
  essences: string[];
  habitats: string[];
  regions: string[];

  // Contenu fiche
  description?: string;
  conseilsCueillette?: string;
  usagesCulinaires?: string;
  avertissement?: string;

  // Photo d'identification (ajoutée manuellement dans public/photos/{id}.jpg)
  photoUrl?: string;
}

// --- État de l'application ---

export type AppView = 'home' | 'results' | 'map' | 'heatmap' | 'habitats' | 'notebook' | 'identify';
export type ResultTab = 'score' | 'forecast' | 'terrain' | 'species';

export interface AppState {
  view: AppView;
  selectedSpot: Spot | null;
  activeTab: ResultTab;
  isLoading: boolean;
  error: string | null;
}
