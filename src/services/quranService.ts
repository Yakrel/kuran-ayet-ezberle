import { SURAH_LIST } from '../constants/surahList';
import { getReciterOption, type ReciterId } from '../constants/reciters';
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

type ReciterTrackingBundle = {
  recitationId: number | null;
  dataset: QulDataset | null;
};

const AYAH_MARKER_PATTERN = /^[٠-٩١٢٣٤٥٦٧٨٩]+$/;

let cachedQuranData: QuranData | null = null;
const cachedQulDatasets = new Map<ReciterId, QulDataset>();
let cachedSurahsById = new Map<number, RawSurah>();
const cachedQulSurahsByIdByReciter = new Map<ReciterId, Map<number, RawQulSurah>>();
const cachedRawVersesByKey = new Map<string, RawVerse>();
const cachedPageVerseKeysByReciter = new Map<ReciterId, Map<number, string[]>>();
const cachedQulVersesByKeyByReciter = new Map<ReciterId, Map<string, RawQulVerse>>();

function getVerseKey(surahId: number, verseNumber: number) {
  return `${surahId}:${verseNumber}`;
}

function normalizeArabicVerseText(text: string): string {
  return text.normalize('NFC');
}

function getTranslationText(verse: RawVerse, translationAuthorId: number): string {
  return verse.translations[String(translationAuthorId)] ?? verse.translations['6'] ?? '';
}

/**
 * Normalizes word data from QUL dataset.
 * 
 * Unicode normalization:
 * - Converts U+06E1 (ARABIC SMALL HIGH DOTLESS HEAD OF KHAH) → U+0652 (ARABIC SUKUN)
 * - The QUL dataset uses U+06E1 which renders as a small ḥāʾ (ح) in most fonts
 * - Standard Arabic typography expects U+0652 which renders as a small circle (○)
 * - This ensures consistent rendering across all fonts (Scheherazade, Amiri, Noto Naskh)
 */
function normalizeWords(words: RawQulWord[]): WordToken[] {
  return words.map((word) => ({
    ...word,
    text: word.text
      .normalize('NFC')
      .replace(/\u06E1/g, '\u0652'),
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

function buildIndexes(reciterId: ReciterId, quranData: QuranData, qulDataset: QulDataset | null) {
  if (cachedSurahsById.size === 0) {
    cachedSurahsById = new Map<number, RawSurah>();

    for (const surah of quranData.surahs) {
      cachedSurahsById.set(surah.id, surah);
      for (const verse of surah.verses) {
        cachedRawVersesByKey.set(getVerseKey(surah.id, verse.verse_number), verse);
      }
    }
  }

  if (
    cachedQulSurahsByIdByReciter.has(reciterId) &&
    cachedPageVerseKeysByReciter.has(reciterId) &&
    cachedQulVersesByKeyByReciter.has(reciterId)
  ) {
    return;
  }

  const cachedQulSurahsById = new Map<number, RawQulSurah>();
  const cachedQulVersesByKey = new Map<string, RawQulVerse>();
  const cachedPageVerseKeys = new Map<number, string[]>();

  for (const qulSurah of qulDataset?.surahs ?? []) {
    cachedQulSurahsById.set(qulSurah.id, qulSurah);
    for (const verse of qulSurah.verses) {
      cachedQulVersesByKey.set(verse.verse_key, verse);
    }
  }

  for (const surah of quranData.surahs) {
    for (const verse of surah.verses) {
      const verseKey = getVerseKey(surah.id, verse.verse_number);
      const currentPageVerseKeys = cachedPageVerseKeys.get(verse.page) ?? [];
      currentPageVerseKeys.push(verseKey);
      cachedPageVerseKeys.set(verse.page, currentPageVerseKeys);
    }
  }

  cachedQulSurahsByIdByReciter.set(reciterId, cachedQulSurahsById);
  cachedQulVersesByKeyByReciter.set(reciterId, cachedQulVersesByKey);
  cachedPageVerseKeysByReciter.set(reciterId, cachedPageVerseKeys);
}

function mapVerseByKey(
  verseKey: string,
  translationAuthorId: number,
  qulVersesByKey: Map<string, RawQulVerse>
) {
  const [surahIdText, verseNumberText] = verseKey.split(':');
  const surahId = Number(surahIdText);
  const verseNumber = Number(verseNumberText);
  const surah = cachedSurahsById.get(surahId);
  const rawVerse = cachedRawVersesByKey.get(verseKey);

  if (!surah || !rawVerse) {
    throw new Error(`Verse not found in local data: ${surahId}:${verseNumber}`);
  }

  return mapVerse(surah, rawVerse, qulVersesByKey.get(getVerseKey(surahId, verseNumber)), translationAuthorId);
}

async function getQuranData(): Promise<QuranData> {
  if (!cachedQuranData) {
    cachedQuranData = require('../../assets/data/quran.json') as QuranData;
  }

  return cachedQuranData;
}

function loadQulDatasetAsset(reciterId: ReciterId): QulDataset | null {
  const reciter = getReciterOption(reciterId);
  if (reciter.trackingSupport !== 'embedded') {
    return null;
  }

  switch (reciter.qulDatasetAsset) {
    case 'assets/data/recitations/qul-recitation-13.json':
      return require('../../assets/data/recitations/qul-recitation-13.json') as QulDataset;
    default:
      throw new Error(`Missing embedded tracking dataset for reciter: ${reciterId}`);
  }
}

async function getTrackingBundle(reciterId: ReciterId): Promise<ReciterTrackingBundle> {
  const cachedDataset = cachedQulDatasets.get(reciterId);
  if (cachedDataset) {
    return {
      recitationId: cachedDataset.recitation_id,
      dataset: cachedDataset,
    };
  }

  const dataset = loadQulDatasetAsset(reciterId);
  if (!dataset) {
    return {
      recitationId: null,
      dataset: null,
    };
  }

  cachedQulDatasets.set(reciterId, dataset);
  return {
    recitationId: dataset.recitation_id,
    dataset,
  };
}

export async function fetchSurahs(): Promise<SurahSummary[]> {
  return SURAH_LIST;
}

export async function fetchSurahDetail(
  surahId: number,
  translationAuthorId: number = 6,
  reciterId: ReciterId = 'ghamdi'
): Promise<SurahDetail> {
  const [quranData, trackingBundle] = await Promise.all([getQuranData(), getTrackingBundle(reciterId)]);
  buildIndexes(reciterId, quranData, trackingBundle.dataset);

  const surah = cachedSurahsById.get(surahId);
  const reciter = getReciterOption(reciterId);
  const cachedQulSurahsById = cachedQulSurahsByIdByReciter.get(reciterId) ?? new Map<number, RawQulSurah>();
  const cachedQulVersesByKey = cachedQulVersesByKeyByReciter.get(reciterId) ?? new Map<string, RawQulVerse>();
  const qulSurah = cachedQulSurahsById.get(surahId);
  if (!surah) {
    throw new Error('Surah not found in local data');
  }

  return {
    id: surah.id,
    name: surah.name,
    verse_count: surah.verse_count,
    audio: mapAudioAsset(qulSurah),
    recitation_id: reciter.qulRecitationId ?? trackingBundle.recitationId,
    verses: surah.verses.map((verse) =>
      mapVerseByKey(getVerseKey(surah.id, verse.verse_number), translationAuthorId, cachedQulVersesByKey)
    ),
  };
}

export async function fetchPageVerses(
  pageNumber: number,
  translationAuthorId: number = 6,
  reciterId: ReciterId = 'ghamdi'
): Promise<Verse[]> {
  const [quranData, trackingBundle] = await Promise.all([getQuranData(), getTrackingBundle(reciterId)]);
  buildIndexes(reciterId, quranData, trackingBundle.dataset);

  const cachedPageVerseKeys = cachedPageVerseKeysByReciter.get(reciterId) ?? new Map<number, string[]>();
  const cachedQulVersesByKey = cachedQulVersesByKeyByReciter.get(reciterId) ?? new Map<string, RawQulVerse>();
  const pageVerseKeys = cachedPageVerseKeys.get(pageNumber) ?? [];

  return pageVerseKeys.map((verseKey) => mapVerseByKey(verseKey, translationAuthorId, cachedQulVersesByKey));
}

export async function getRecitationId(reciterId: ReciterId = 'ghamdi') {
  const trackingBundle = await getTrackingBundle(reciterId);
  return trackingBundle.recitationId;
}
