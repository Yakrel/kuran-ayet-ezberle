import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = process.cwd();
const QURAN_DATA_PATH = resolve(ROOT, 'assets/data/quran.json');

function parseArgs() {
  const args = process.argv.slice(2);
  let recitationId = 13;
  let outputPath = `assets/data/recitations/qul-recitation-${recitationId}.json`;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--recitation-id') {
      const nextValue = Number(args[index + 1]);
      if (!Number.isFinite(nextValue) || nextValue <= 0) {
        throw new Error('Expected a positive number after --recitation-id.');
      }
      recitationId = nextValue;
      outputPath = `assets/data/recitations/qul-recitation-${recitationId}.json`;
      index += 1;
      continue;
    }

    if (arg === '--output') {
      const nextValue = args[index + 1];
      if (!nextValue) {
        throw new Error('Expected a path after --output.');
      }
      outputPath = nextValue;
      index += 1;
    }
  }

  return {
    recitationId,
    outputPath: resolve(ROOT, outputPath),
  };
}

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

function fetchAllSurahSegments(recitationId, surahId, verseCount) {
  const segments = {};
  let audio = null;
  let nextVerse = 1;

  while (Object.keys(segments).length < verseCount) {
    const payload = fetchJson(
      `https://qul.tarteel.ai/api/v1/audio/surah_segments/${recitationId}?surah=${surahId}&from=${nextVerse}`
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

function buildDataset({ recitationId, outputPath }) {
  const quran = loadQuranData();
  const surahs = [];

  for (const surah of quran.surahs) {
    console.log(`Fetching QUL dataset ${recitationId} for surah ${surah.id}/${quran.surahs.length}...`);
    const wordsVerses = fetchAllSurahWords(surah.id, surah.verse_count);
    const { audio, segments } = fetchAllSurahSegments(recitationId, surah.id, surah.verse_count);

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

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    `${JSON.stringify({ recitation_id: recitationId, surahs })}\n`,
    'utf8'
  );

  console.log(`Wrote ${outputPath}`);
}

buildDataset(parseArgs());
