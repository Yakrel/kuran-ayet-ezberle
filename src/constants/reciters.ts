export type ReciterId = 'ghamdi';

export type ReciterOption = {
  id: ReciterId;
  label: string;
  artist: string;
  recitationId: number;
  qulDatasetAsset: string;
};

export const DEFAULT_RECITER_ID: ReciterId = 'ghamdi';

export const RECITER_OPTIONS: ReciterOption[] = [
  {
    id: 'ghamdi',
    label: 'Saad Al-Ghamdi',
    artist: 'Saad Al-Ghamdi',
    recitationId: 13,
    qulDatasetAsset: 'assets/data/recitations/qul-recitation-13.json',
  },
];

export function getReciterOption(reciterId: ReciterId): ReciterOption {
  const reciter = RECITER_OPTIONS.find((option) => option.id === reciterId);
  if (!reciter) {
    throw new Error(`Unknown reciter: ${reciterId}`);
  }

  return reciter;
}
