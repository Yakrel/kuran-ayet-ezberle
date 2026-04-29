import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const QURAN_DATA_PATH = resolve(ROOT, 'assets/data/quran.json');
const TOTAL_VERSE_COUNT = 6236;

// Product decision: use Quran.com's Imlaei text for display.
// It keeps the trainer readable by avoiding mushaf-specific Uthmani/QPC signs
// such as tatweel, alef wasla, and pause glyphs that looked like rendering bugs.
function fetchJson(url) {
  const response = execFileSync('curl', ['-sfL', url], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16,
  });

  return JSON.parse(response);
}

function getVerseKey(surahId, verseNumber) {
  return `${surahId}:${verseNumber}`;
}

function assertNonEmptyString(value, message) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(message);
  }
}

function loadCurrentQuranData() {
  return JSON.parse(readFileSync(QURAN_DATA_PATH, 'utf8'));
}

function fetchImlaeiByKey(surahIds) {
  const byKey = new Map();

  for (const surahId of surahIds) {
    console.log(`Fetching Imlaei text for surah ${surahId}/${surahIds.length}...`);
    const payload = fetchJson(`https://api.quran.com/api/v4/quran/verses/imlaei?chapter_number=${surahId}`);
    const verses = payload.verses ?? [];
    for (const verse of verses) {
      assertNonEmptyString(verse.verse_key, `Imlaei verse key is missing for surah ${surahId}.`);
      assertNonEmptyString(verse.text_imlaei, `Imlaei text is missing for ${verse.verse_key}.`);
      byKey.set(verse.verse_key, verse.text_imlaei.normalize('NFC').trim());
    }
  }

  return byKey;
}

function fetchTranscriptionsByKey(surahIds) {
  const byKey = new Map();

  for (const surahId of surahIds) {
    console.log(`Fetching Turkish transcription for surah ${surahId}/${surahIds.length}...`);
    const payload = fetchJson(`https://api.acikkuran.com/surah/${surahId}?author=6`);
    const verses = payload.data?.verses ?? [];
    for (const verse of verses) {
      const verseNumber = Number(verse.verse_number);
      if (!Number.isInteger(verseNumber) || verseNumber <= 0) {
        throw new Error(`Invalid transcription verse number for surah ${surahId}.`);
      }
      assertNonEmptyString(verse.transcription, `Transcription is missing for ${surahId}:${verseNumber}.`);
      byKey.set(getVerseKey(surahId, verseNumber), verse.transcription.trim());
    }
  }

  return byKey;
}

function buildDataset() {
  const currentData = loadCurrentQuranData();
  const surahs = currentData.surahs ?? [];
  const surahIds = surahs.map((surah) => surah.id);
  const imlaeiByKey = fetchImlaeiByKey(surahIds);
  const transcriptionsByKey = fetchTranscriptionsByKey(surahIds);
  let verseCount = 0;

  const nextData = {
    ...currentData,
    surahs: surahs.map((surah) => {
      if (!Number.isInteger(surah.id) || !Number.isInteger(surah.verse_count)) {
        throw new Error(`Invalid surah metadata: ${JSON.stringify(surah)}`);
      }

      if (!Array.isArray(surah.verses) || surah.verses.length !== surah.verse_count) {
        throw new Error(`Verse count mismatch for surah ${surah.id}.`);
      }

      return {
        ...surah,
        verses: surah.verses.map((verse) => {
          const verseKey = getVerseKey(surah.id, verse.verse_number);
          const imlaeiText = imlaeiByKey.get(verseKey);
          const transcription = transcriptionsByKey.get(verseKey);
          assertNonEmptyString(imlaeiText, `Imlaei text is missing for ${verseKey}.`);
          assertNonEmptyString(transcription, `Transcription is missing for ${verseKey}.`);
          verseCount += 1;

          return {
            ...verse,
            verse: imlaeiText,
            transcription,
          };
        }),
      };
    }),
  };

  if (verseCount !== TOTAL_VERSE_COUNT) {
    throw new Error(`Expected ${TOTAL_VERSE_COUNT} ayahs, found ${verseCount}.`);
  }
  if (imlaeiByKey.size !== TOTAL_VERSE_COUNT) {
    throw new Error(`Expected ${TOTAL_VERSE_COUNT} Imlaei ayahs, found ${imlaeiByKey.size}.`);
  }
  if (transcriptionsByKey.size !== TOTAL_VERSE_COUNT) {
    throw new Error(`Expected ${TOTAL_VERSE_COUNT} transcriptions, found ${transcriptionsByKey.size}.`);
  }

  writeFileSync(QURAN_DATA_PATH, `${JSON.stringify(nextData)}\n`, 'utf8');
  console.log(`Wrote ${QURAN_DATA_PATH}`);
}

buildDataset();
