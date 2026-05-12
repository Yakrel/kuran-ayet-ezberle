import { SURAH_LIST } from '../constants/surahList';
import { DEFAULT_RECITER_ID, getReciterOption } from '../constants/reciters';
import type { SurahAudioAsset, SurahDetail, SurahSummary, Verse } from '../types/quran';

type RawTranslationMap = Record<string, string>;

type RawVerse = {
  verse_number: number;
  page: number;
  verse: string;
  transcription: string;
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

type RawRecitationTiming = {
  time_from: number;
  time_to: number;
  duration: number;
};

type RawRecitationVerse = {
  verse_key: string;
  page_number: number;
  timing: RawRecitationTiming | null;
};

type RawRecitationSurah = {
  id: number;
  audio: {
    url: string;
    duration: number;
    audio_size: number;
  } | null;
  verses: RawRecitationVerse[];
};

type RecitationDataset = {
  recitation_id: number;
  surahs: RawRecitationSurah[];
};

let cachedQuranData: QuranData | null = null;
let cachedRecitationDataset: RecitationDataset | null = null;
let cachedSurahsById = new Map<number, RawSurah>();
let cachedRecitationSurahsById = new Map<number, RawRecitationSurah>();
let cachedRawVersesByKey = new Map<string, RawVerse>();
let cachedRecitationVersesByKey = new Map<string, RawRecitationVerse>();
let cachedPageVerseKeys = new Map<number, string[]>();

function getVerseKey(surahId: number, verseNumber: number) {
  return `${surahId}:${verseNumber}`;
}

function normalizeArabicVerseText(text: string): string {
  const normalizedText = text.normalize('NFC');
  if (normalizedText.trim().length === 0) {
    throw new Error('Embedded Quran text is empty.');
  }

  return normalizedText;
}

function normalizeTranscription(rawSurah: RawSurah, rawVerse: RawVerse): string {
  const transcription = rawVerse.transcription?.trim();
  if (!transcription) {
    throw new Error(`Embedded transcription is missing for ayah ${rawSurah.id}:${rawVerse.verse_number}.`);
  }

  return transcription;
}

function getTranslationText(verse: RawVerse, translationAuthorId: number): string {
  const translationText = verse.translations[String(translationAuthorId)];
  if (translationText === undefined) {
    throw new Error(
      `Translation ${translationAuthorId} is unavailable for ayah ${verse.verse_number}.`
    );
  }

  return translationText;
}

function mapAudioAsset(rawSurah: RawRecitationSurah | undefined, surahId: number): SurahAudioAsset {
  if (!rawSurah?.audio) {
    throw new Error(`Embedded audio is missing for surah ${surahId}.`);
  }

  const durationSeconds = Number(rawSurah.audio.duration);
  const sizeBytes = Number(rawSurah.audio.audio_size);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(`Embedded audio duration is invalid for surah ${surahId}.`);
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error(`Embedded audio size is invalid for surah ${surahId}.`);
  }

  return {
    url: rawSurah.audio.url,
    duration_seconds: durationSeconds,
    size_bytes: sizeBytes,
  };
}

function mapVerse(
  rawSurah: RawSurah,
  rawVerse: RawVerse,
  rawRecitationVerse: RawRecitationVerse | undefined,
  translationAuthorId: number
): Verse {
  if (!rawRecitationVerse?.timing) {
    throw new Error(`Embedded timing is missing for ayah ${rawSurah.id}:${rawVerse.verse_number}.`);
  }

  return {
    surah_id: rawSurah.id,
    verse_number: rawVerse.verse_number,
    page: rawVerse.page,
    verse: normalizeArabicVerseText(rawVerse.verse),
    transcription: normalizeTranscription(rawSurah, rawVerse),
    translation: {
      text: getTranslationText(rawVerse, translationAuthorId),
    },
    timing: {
      time_from_ms: rawRecitationVerse.timing.time_from,
      time_to_ms: rawRecitationVerse.timing.time_to,
      duration_ms: Math.max(0, rawRecitationVerse.timing.time_to - rawRecitationVerse.timing.time_from),
    },
  };
}

function buildIndexes(quranData: QuranData, recitationDataset: RecitationDataset) {
  if (cachedSurahsById.size > 0) {
    return;
  }

  cachedSurahsById = new Map<number, RawSurah>();
  cachedRecitationSurahsById = new Map<number, RawRecitationSurah>();
  cachedRawVersesByKey = new Map<string, RawVerse>();
  cachedRecitationVersesByKey = new Map<string, RawRecitationVerse>();
  cachedPageVerseKeys = new Map<number, string[]>();

  for (const surah of quranData.surahs) {
    cachedSurahsById.set(surah.id, surah);
    for (const verse of surah.verses) {
      const verseKey = getVerseKey(surah.id, verse.verse_number);
      cachedRawVersesByKey.set(verseKey, verse);

      const currentPageVerseKeys = cachedPageVerseKeys.get(verse.page);
      if (currentPageVerseKeys) {
        currentPageVerseKeys.push(verseKey);
      } else {
        cachedPageVerseKeys.set(verse.page, [verseKey]);
      }
    }
  }

  for (const recitationSurah of recitationDataset.surahs) {
    cachedRecitationSurahsById.set(recitationSurah.id, recitationSurah);
    for (const verse of recitationSurah.verses) {
      cachedRecitationVersesByKey.set(verse.verse_key, verse);
    }
  }
}

function mapVerseByKey(verseKey: string, translationAuthorId: number) {
  const [surahIdText, verseNumberText] = verseKey.split(':');
  const surahId = Number(surahIdText);
  const verseNumber = Number(verseNumberText);
  const surah = cachedSurahsById.get(surahId);
  const rawVerse = cachedRawVersesByKey.get(verseKey);

  if (!surah || !rawVerse) {
    throw new Error(`Verse not found in local data: ${surahId}:${verseNumber}`);
  }

  return mapVerse(surah, rawVerse, cachedRecitationVersesByKey.get(getVerseKey(surahId, verseNumber)), translationAuthorId);
}

async function getQuranData(): Promise<QuranData> {
  if (!cachedQuranData) {
    cachedQuranData = require('../../assets/data/quran.json') as QuranData;
  }

  return cachedQuranData;
}

function loadRecitationDatasetAsset(): RecitationDataset {
  const reciter = getReciterOption(DEFAULT_RECITER_ID);
  switch (reciter.recitationDatasetAsset) {
    case 'assets/data/recitations/saad-al-ghamdi-recitation-13.json':
      return require('../../assets/data/recitations/saad-al-ghamdi-recitation-13.json') as RecitationDataset;
    default:
      throw new Error(`Missing embedded timing dataset for reciter: ${DEFAULT_RECITER_ID}`);
  }
}

async function getRecitationDataset(): Promise<RecitationDataset> {
  if (!cachedRecitationDataset) {
    cachedRecitationDataset = loadRecitationDatasetAsset();
  }

  return cachedRecitationDataset;
}

async function ensureIndexes() {
  const [quranData, recitationDataset] = await Promise.all([getQuranData(), getRecitationDataset()]);
  buildIndexes(quranData, recitationDataset);
}

export async function fetchSurahs(): Promise<SurahSummary[]> {
  return SURAH_LIST;
}

export async function fetchSurahDetail(
  surahId: number,
  translationAuthorId: number = 6
): Promise<SurahDetail> {
  await ensureIndexes();

  const surah = cachedSurahsById.get(surahId);
  const recitationSurah = cachedRecitationSurahsById.get(surahId);
  if (!surah) {
    throw new Error('Surah not found in local data');
  }

  return {
    id: surah.id,
    name: surah.name,
    verse_count: surah.verse_count,
    audio: mapAudioAsset(recitationSurah, surah.id),
    recitation_id: getReciterOption(DEFAULT_RECITER_ID).recitationId,
    verses: surah.verses.map((verse) =>
      mapVerseByKey(getVerseKey(surah.id, verse.verse_number), translationAuthorId)
    ),
  };
}

export async function fetchPageVerses(
  pageNumber: number,
  translationAuthorId: number = 6
): Promise<Verse[]> {
  await ensureIndexes();

  const pageVerseKeys = cachedPageVerseKeys.get(pageNumber);
  if (!pageVerseKeys) {
    throw new Error(`Page ${pageNumber} is missing from local Quran data.`);
  }

  return pageVerseKeys.map((verseKey) => mapVerseByKey(verseKey, translationAuthorId));
}

export async function getRecitationId() {
  return getReciterOption(DEFAULT_RECITER_ID).recitationId;
}

export async function fetchSurahAudioRefs(): Promise<Array<{ surahId: number; remoteUrl: string }>> {
  const dataset = await getRecitationDataset();
  return dataset.surahs.map((surah) => {
    if (!surah.audio?.url) {
      throw new Error(`Embedded audio is missing for surah ${surah.id}.`);
    }

    return { surahId: surah.id, remoteUrl: surah.audio.url };
  });
}
