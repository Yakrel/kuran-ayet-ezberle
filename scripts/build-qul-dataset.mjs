import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const RECITATION_ID = 13;
const ROOT = process.cwd();
const QURAN_DATA_PATH = resolve(ROOT, 'assets/data/quran.json');
const OUTPUT_PATH = resolve(ROOT, `assets/data/qul-recitation-${RECITATION_ID}.json`);

function fetchJson(url) {
  const response = execFileSync('curl', ['-sfL', url], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  });

  return JSON.parse(response);
}

function loadQuranData() {
  return JSON.parse(readFileSync(QURAN_DATA_PATH, 'utf8'));
}

function fetchAllSurahWords(surahId, verseCount) {
  const verses = [];
  let from = 1;

  while (verses.length < verseCount) {
    const remaining = verseCount - verses.length;
    const perPage = Math.min(50, remaining);
    const payload = fetchJson(
      `https://qul.tarteel.ai/api/v1/chapters/${surahId}/verses?words=true&from=${from}&per_page=${perPage}`
    );

    const batch = Array.isArray(payload.verses) ? payload.verses : [];
    if (batch.length === 0) {
      throw new Error(`No verse words returned for surah ${surahId} from ayah ${from}.`);
    }

    verses.push(...batch);
    from = verses.length + 1;
  }

  return verses;
}

function fetchAllSurahSegments(surahId, verseCount) {
  const segments = {};
  let audio = null;
  let nextVerse = 1;

  while (Object.keys(segments).length < verseCount) {
    const payload = fetchJson(
      `https://qul.tarteel.ai/api/v1/audio/surah_segments/${RECITATION_ID}?surah=${surahId}&from=${nextVerse}`
    );

    if (!audio && payload.audio) {
      audio = payload.audio;
    }

    const batch = payload.segments ?? {};
    const keys = Object.keys(batch);
    if (keys.length === 0) {
      throw new Error(`No timing segments returned for surah ${surahId} from ayah ${nextVerse}.`);
    }

    for (const key of keys) {
      segments[key] = batch[key];
    }

    const maxVerseNumber = keys.reduce((max, key) => {
      const [, verseNumber] = key.split(':');
      return Math.max(max, Number(verseNumber));
    }, nextVerse);

    if (maxVerseNumber < nextVerse) {
      throw new Error(`Timing pagination stalled for surah ${surahId} at ayah ${nextVerse}.`);
    }

    nextVerse = maxVerseNumber + 1;
  }

  if (!audio) {
    throw new Error(`Audio metadata missing for surah ${surahId}.`);
  }

  return { audio, segments };
}

function buildDataset() {
  const quran = loadQuranData();
  const surahs = [];

  for (const surah of quran.surahs) {
    console.log(`Fetching QUL dataset for surah ${surah.id}/${quran.surahs.length}...`);
    const wordsVerses = fetchAllSurahWords(surah.id, surah.verse_count);
    const { audio, segments } = fetchAllSurahSegments(surah.id, surah.verse_count);

    surahs.push({
      id: surah.id,
      audio,
      verses: wordsVerses.map((verse) => ({
        verse_key: verse.verse_key,
        page_number: verse.page_number,
        words: verse.words.map((word) => ({
          location: word.location,
          text: word.text,
          position: word.position,
          line_number: word.line_number,
          page_number: word.page_number,
        })),
        timing: segments[verse.verse_key] ?? null,
      })),
    });
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(
    OUTPUT_PATH,
    `${JSON.stringify({ recitation_id: RECITATION_ID, surahs })}\n`,
    'utf8'
  );

  console.log(`Wrote ${OUTPUT_PATH}`);
}

buildDataset();
