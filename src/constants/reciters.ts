export type ReciterId = 'ghamdi' | 'mishary' | 'maher' | 'minshawy';

export type ReciterOption = {
  id: ReciterId;
  label: string;
  artist: string;
  verseBaseUrl: string;
  trackingSupport: 'embedded' | 'none';
  qulRecitationId?: number;
  qulDatasetAsset?: string;
};

export const DEFAULT_RECITER_ID: ReciterId = 'ghamdi';

export const RECITER_OPTIONS: ReciterOption[] = [
  {
    id: 'ghamdi',
    label: 'Saad Al-Ghamdi',
    artist: 'Saad Al-Ghamdi',
    verseBaseUrl: 'https://everyayah.com/data/Ghamadi_40kbps',
    trackingSupport: 'embedded',
    qulRecitationId: 13,
    qulDatasetAsset: 'assets/data/recitations/qul-recitation-13.json',
  },
  {
    id: 'mishary',
    label: 'Mishary Rashid Al-Afasy',
    artist: 'Mishary Rashid Al-Afasy',
    verseBaseUrl: 'https://everyayah.com/data/Alafasy_128kbps',
    trackingSupport: 'none',
  },
  {
    id: 'maher',
    label: 'Maher Al-Muaiqly',
    artist: 'Maher Al-Muaiqly',
    verseBaseUrl: 'https://everyayah.com/data/MaherAlMuaiqly128kbps',
    trackingSupport: 'none',
  },
  {
    id: 'minshawy',
    label: 'Muhammad Siddiq Al-Minshawi',
    artist: 'Muhammad Siddiq Al-Minshawi',
    verseBaseUrl: 'https://everyayah.com/data/Minshawy_Murattal_128kbps',
    trackingSupport: 'none',
  },
];

export function getReciterOption(reciterId: ReciterId): ReciterOption {
  const reciter = RECITER_OPTIONS.find((option) => option.id === reciterId);
  if (!reciter) {
    throw new Error(`Unknown reciter: ${reciterId}`);
  }

  return reciter;
}

export function hasEmbeddedTracking(reciterId: ReciterId): boolean {
  return getReciterOption(reciterId).trackingSupport === 'embedded';
}
