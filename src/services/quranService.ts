import { SURAH_LIST } from '../constants/surahList';
import type { SurahAudioAsset, SurahDetail, SurahSummary, Verse, WordSegment, WordToken } from '../types/quran';

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

type RawQulWord = {
  location: string;
  text: string;
  position: number;
  line_number: number;
  page_number: number;
};

type RawQulTiming = {
  time_from: number;
  time_to: number;
  duration: number;
  segments: WordSegment[];
};

type RawQulVerse = {
  verse_key: string;
  page_number: number;
  words: RawQulWord[];
  timing: RawQulTiming | null;
};

type RawQulSurah = {
  id: number;
  audio: {
    url: string;
    duration: number;
    audio_size: number;
  } | null;
  verses: RawQulVerse[];
};

type QulDataset = {
  recitation_id: number;
  surahs: RawQulSurah[];
};

const AYAH_MARKER_PATTERN = /^[٠-٩١٢٣٤٥٦٧٨٩]+$/;

let cachedQuranData: QuranData | null = null;
let cachedQulDataset: QulDataset | null = null;
let cachedSurahsById = new Map<number, RawSurah>();
let cachedQulSurahsById = new Map<number, RawQulSurah>();
let cachedVersesByPage = new Map<number, Verse[]>();

function normalizeArabicVerseText(text: string): string {
  return text.normalize('NFC');
}

function getTranslationText(verse: RawVerse, translationAuthorId: number): string {
  return verse.translations[String(translationAuthorId)] ?? verse.translations['6'] ?? '';
}

function normalizeWords(words: RawQulWord[]): WordToken[] {
  return words.map((word) => ({
    ...word,
    text: word.text.normalize('NFC'),
    is_ayah_marker: AYAH_MARKER_PATTERN.test(word.text.trim()),
  }));
}

function mapAudioAsset(rawSurah: RawQulSurah | undefined): SurahAudioAsset | null {
  if (!rawSurah?.audio) {
    return null;
  }

  return {
    url: rawSurah.audio.url,
    duration_seconds: Number(rawSurah.audio.duration) || 0,
    size_bytes: Number(rawSurah.audio.audio_size) || 0,
  };
}

function mapVerse(
  rawSurah: RawSurah,
  rawVerse: RawVerse,
  rawQulVerse: RawQulVerse | undefined,
  translationAuthorId: number
): Verse {
  return {
    surah_id: rawSurah.id,
    verse_number: rawVerse.verse_number,
    page: rawVerse.page,
    verse: normalizeArabicVerseText(rawVerse.verse),
    translation: {
      text: getTranslationText(rawVerse, translationAuthorId),
    },
    words: normalizeWords(rawQulVerse?.words ?? []),
    timing: rawQulVerse?.timing
      ? {
          time_from_ms: rawQulVerse.timing.time_from,
          time_to_ms: rawQulVerse.timing.time_to,
          duration_ms: Math.max(0, rawQulVerse.timing.time_to - rawQulVerse.timing.time_from),
          segments: rawQulVerse.timing.segments ?? [],
        }
      : null,
  };
}

function buildIndexes(quranData: QuranData, qulDataset: QulDataset) {
  if (cachedSurahsById.size > 0 || cachedVersesByPage.size > 0 || cachedQulSurahsById.size > 0) {
    return;
  }

  cachedSurahsById = new Map<number, RawSurah>();
  cachedQulSurahsById = new Map<number, RawQulSurah>();
  cachedVersesByPage = new Map<number, Verse[]>();

  for (const surah of quranData.surahs) {
    cachedSurahsById.set(surah.id, surah);
  }

  for (const qulSurah of qulDataset.surahs) {
    cachedQulSurahsById.set(qulSurah.id, qulSurah);
  }

  for (const surah of quranData.surahs) {
    const qulSurah = cachedQulSurahsById.get(surah.id);
    const qulVerseMap = new Map(
      (qulSurah?.verses ?? []).map((verse) => [verse.verse_key, verse] as const)
    );

    for (const verse of surah.verses) {
      const verseKey = `${surah.id}:${verse.verse_number}`;
      const mappedVerse = mapVerse(surah, verse, qulVerseMap.get(verseKey), 6);
      const currentPageVerses = cachedVersesByPage.get(verse.page) ?? [];
      currentPageVerses.push(mappedVerse);
      cachedVersesByPage.set(verse.page, currentPageVerses);
    }
  }
}

async function getQuranData(): Promise<QuranData> {
  if (!cachedQuranData) {
    cachedQuranData = require('../../assets/data/quran.json') as QuranData;
  }

  return cachedQuranData;
}

async function getQulDataset(): Promise<QulDataset> {
  if (!cachedQulDataset) {
    cachedQulDataset = require('../../assets/data/qul-recitation-13.json') as QulDataset;
  }

  return cachedQulDataset;
}

export async function fetchSurahs(): Promise<SurahSummary[]> {
  return SURAH_LIST;
}

export async function fetchSurahDetail(
  surahId: number,
  translationAuthorId: number = 6
): Promise<SurahDetail> {
  const [quranData, qulDataset] = await Promise.all([getQuranData(), getQulDataset()]);
  buildIndexes(quranData, qulDataset);

  const surah = cachedSurahsById.get(surahId);
  const qulSurah = cachedQulSurahsById.get(surahId);
  if (!surah) {
    throw new Error('Surah not found in local data');
  }

  const qulVerseMap = new Map(
    (qulSurah?.verses ?? []).map((verse) => [verse.verse_key, verse] as const)
  );

  return {
    id: surah.id,
    name: surah.name,
    verse_count: surah.verse_count,
    audio: mapAudioAsset(qulSurah),
    verses: surah.verses.map((verse) =>
      mapVerse(surah, verse, qulVerseMap.get(`${surah.id}:${verse.verse_number}`), translationAuthorId)
    ),
  };
}

export async function fetchPageVerses(
  pageNumber: number,
  translationAuthorId: number = 6
): Promise<Verse[]> {
  const [quranData, qulDataset] = await Promise.all([getQuranData(), getQulDataset()]);
  buildIndexes(quranData, qulDataset);

  const pageVerses = cachedVersesByPage.get(pageNumber) ?? [];
  if (translationAuthorId === 6) {
    return pageVerses;
  }

  return pageVerses.map((verse) => {
    const surah = cachedSurahsById.get(verse.surah_id);
    const rawVerse = surah?.verses.find((item) => item.verse_number === verse.verse_number);
    if (!surah || !rawVerse) {
      return verse;
    }

    const qulVerse = cachedQulSurahsById
      .get(verse.surah_id)
      ?.verses.find((item) => item.verse_key === `${verse.surah_id}:${verse.verse_number}`);

    return mapVerse(surah, rawVerse, qulVerse, translationAuthorId);
  });
}

export async function getRecitationId() {
  const dataset = await getQulDataset();
  return dataset.recitation_id;
}
