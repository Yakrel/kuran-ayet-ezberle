export type SurahSummary = {
  id: number;
  name: string;
  verse_count: number;
};

export type TranslationOption = {
  id: number;
  label: string;
  language: import('../i18n/types').LanguageCode;
};

export type VerseTranslation = {
  text: string;
};

export type VerseTiming = {
  time_from_ms: number;
  time_to_ms: number;
  duration_ms: number;
};

export type Verse = {
  surah_id: number;
  verse_number: number;
  page: number;
  verse: string;
  translation: VerseTranslation;
  timing: VerseTiming;
};

export type SurahAudioAsset = {
  url: string;
  duration_seconds: number;
  size_bytes: number;
};

export type SurahDetail = {
  id: number;
  name: string;
  verse_count: number;
  audio: SurahAudioAsset;
  recitation_id: number;
  verses: Verse[];
};
