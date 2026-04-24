import { describe, expect, it, vi } from 'vitest';
import type { SurahDetail, Verse } from '../types/quran';
import { buildContinuousPlaybackSession } from './continuousPlaybackSession';

vi.mock('../services/surahAudioCache', () => ({
  resolveSurahAudioUri: vi.fn(async (_surahId: number, remoteUrl: string) => `cached:${remoteUrl}`),
}));

function makeVerse(verseNumber: number): Verse {
  return {
    surah_id: 1,
    verse_number: verseNumber,
    page: 1,
    verse: `verse ${verseNumber}`,
    translation: {
      text: `translation ${verseNumber}`,
    },
    timing: {
      time_from_ms: verseNumber * 1000,
      time_to_ms: verseNumber * 1000 + 500,
      duration_ms: 500,
    },
  };
}

function makeSurahDetail(overrides: Partial<SurahDetail> = {}): SurahDetail {
  return {
    id: 1,
    name: 'Al-Fatiha',
    verse_count: 7,
    audio: {
      url: 'https://example.test/001.mp3',
      duration_seconds: 100,
      size_bytes: 1024,
    },
    recitation_id: 13,
    verses: [makeVerse(1), makeVerse(2), makeVerse(3)],
    ...overrides,
  };
}

describe('buildContinuousPlaybackSession', () => {
  it('builds a timed session for the selected range', async () => {
    const session = await buildContinuousPlaybackSession(makeSurahDetail(), 2, 3, 4);

    expect(session).toMatchObject({
      surahId: 1,
      startVerseNumber: 2,
      endVerseNumber: 3,
      repeatCount: 4,
      trackId: 'surah-1-continuous',
      surahAudioUrl: 'cached:https://example.test/001.mp3',
      rangeStartMs: 2000,
      rangeEndMs: 3500,
      rangeDurationMs: 1500,
      totalDurationMs: 6000,
    });
    expect(session.boundaries.map((boundary) => boundary.verse.verse_number)).toEqual([2, 3]);
  });

  it('throws when the selected range has no ayahs', async () => {
    await expect(buildContinuousPlaybackSession(makeSurahDetail(), 10, 12, 1)).rejects.toThrow(
      'No playable ayahs found'
    );
  });
});
