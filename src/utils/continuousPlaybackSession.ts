import { resolveSurahAudioUri } from '../services/surahAudioCache';
import type { SurahDetail, Verse } from '../types/quran';
import type { ContinuousBoundary } from './continuousPlayback';

export type ContinuousVerseBoundary = ContinuousBoundary & {
  verse: Verse;
};

export type PlaybackSession = {
  surahId: number;
  startVerseNumber: number;
  endVerseNumber: number;
  repeatCount: number;
  trackId: string;
  surahAudioUrl: string;
  boundaries: ContinuousVerseBoundary[];
  rangeStartMs: number;
  rangeEndMs: number;
  rangeDurationMs: number;
  totalDurationMs: number;
};

function getSelectedVerses(
  surahDetail: SurahDetail,
  startVerseNumber: number,
  endVerseNumber: number
) {
  return surahDetail.verses.filter(
    (verse) => verse.verse_number >= startVerseNumber && verse.verse_number <= endVerseNumber
  );
}

export async function buildContinuousPlaybackSession(
  surahDetail: SurahDetail,
  startVerseNumber: number,
  endVerseNumber: number,
  repeatCount: number
): Promise<PlaybackSession> {
  const selectedVerses = getSelectedVerses(surahDetail, startVerseNumber, endVerseNumber);
  const boundaries = selectedVerses.map((verse) => {
    return {
      verse,
      startTimeMs: verse.timing.time_from_ms,
      endTimeMs: verse.timing.time_to_ms,
    };
  });

  if (boundaries.length === 0) {
    throw new Error('No playable ayahs found in the selected range.');
  }

  const rangeStartMs = boundaries[0].startTimeMs;
  const rangeEndMs = boundaries[boundaries.length - 1].endTimeMs;
  const rangeDurationMs = Math.max(rangeEndMs - rangeStartMs, 1);
  const surahAudioUrl = await resolveSurahAudioUri(surahDetail.id, surahDetail.audio.url);

  return {
    surahId: surahDetail.id,
    startVerseNumber,
    endVerseNumber,
    repeatCount,
    trackId: `surah-${surahDetail.id}-continuous`,
    surahAudioUrl,
    boundaries,
    rangeStartMs,
    rangeEndMs,
    rangeDurationMs,
    totalDurationMs: rangeDurationMs * repeatCount,
  };
}
