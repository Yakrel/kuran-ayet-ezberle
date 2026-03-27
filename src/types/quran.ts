export type SurahSummary = {
  id: number;
  name: string;
  verse_count: number;
};

export type LanguageCode = 'tr' | 'en';

export type TranslationOption = {
  id: number;
  label: string;
  language: LanguageCode;
};

export type VerseTranslation = {
  text: string;
};

export type Verse = {
  surah_id: number;
  verse_number: number;
  page: number;
  verse: string;
  translation: VerseTranslation;
};

export type SurahDetail = {
  id: number;
  name: string;
  verse_count: number;
  verses: Verse[];
};
