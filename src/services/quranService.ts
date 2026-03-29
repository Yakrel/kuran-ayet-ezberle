import { SURAH_LIST } from '../constants/surahList';
import type { SurahDetail, SurahSummary, Verse } from '../types/quran';

type RawTranslationMap = Record<string, string>;

type RawVerse = {
  verse_number: number;
  page: number;
  verse: string;
  translations: RawTranslationMap;
};

type RawSurah = {
  id: number;
  name: string;
  verse_count: number;
  verses: RawVerse[];
};

type QuranData = {
  surahs: RawSurah[];
};

let cachedQuranData: QuranData | null = null;
let cachedSurahsById = new Map<number, RawSurah>();
let cachedVersesByPage = new Map<number, Array<{ surahId: number; verse: RawVerse }>>();

function normalizeArabicVerseText(text: string): string {
  return text.normalize('NFC');
}

function getTranslationText(verse: RawVerse, translationAuthorId: number): string {
  return verse.translations[String(translationAuthorId)] ?? verse.translations['6'] ?? '';
}

function buildIndexes(data: QuranData) {
  if (cachedSurahsById.size > 0 || cachedVersesByPage.size > 0) {
    return;
  }

  cachedSurahsById = new Map<number, RawSurah>();
  cachedVersesByPage = new Map<number, Array<{ surahId: number; verse: RawVerse }>>();

  for (const surah of data.surahs) {
    cachedSurahsById.set(surah.id, surah);

    for (const verse of surah.verses) {
      const versesOnPage = cachedVersesByPage.get(verse.page) ?? [];
      versesOnPage.push({ surahId: surah.id, verse });
      cachedVersesByPage.set(verse.page, versesOnPage);
    }
  }
}

async function getQuranData(): Promise<QuranData> {
  if (cachedQuranData) {
    return cachedQuranData;
  }

  try {
    cachedQuranData = require('../../assets/data/quran.json') as QuranData;
    buildIndexes(cachedQuranData);
    return cachedQuranData;
  } catch (error) {
    console.error('Error loading quran data:', error);
    throw new Error('Quran data could not be loaded');
  }
}

export async function fetchSurahs(): Promise<SurahSummary[]> {
  return SURAH_LIST;
}

export async function fetchSurahDetail(
  surahId: number,
  translationAuthorId: number = 6
): Promise<SurahDetail> {
  const data = await getQuranData();
  buildIndexes(data);

  const surah = cachedSurahsById.get(surahId);
  if (!surah) {
    throw new Error('Surah not found in local data');
  }

  return {
    id: surah.id,
    name: surah.name,
    verse_count: surah.verse_count,
    verses: surah.verses.map((verse) => ({
      surah_id: surah.id,
      verse_number: verse.verse_number,
      page: verse.page,
      verse: normalizeArabicVerseText(verse.verse),
      translation: {
        text: getTranslationText(verse, translationAuthorId),
      },
    })),
  };
}

export async function fetchPageVerses(
  pageNumber: number,
  translationAuthorId: number = 6
): Promise<Verse[]> {
  const data = await getQuranData();
  buildIndexes(data);

  return (cachedVersesByPage.get(pageNumber) ?? []).map(({ surahId, verse }) => ({
    surah_id: surahId,
    verse_number: verse.verse_number,
    page: verse.page,
    verse: normalizeArabicVerseText(verse.verse),
    translation: {
      text: getTranslationText(verse, translationAuthorId),
    },
  }));
}
