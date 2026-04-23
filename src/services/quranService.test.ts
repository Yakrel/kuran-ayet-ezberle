import { describe, expect, it } from 'vitest';
import { fetchPageVerses, fetchSurahAudioRefs, fetchSurahDetail } from './quranService';

describe('quranService', () => {
  it('keeps page verse mapping aligned with surah detail mapping', async () => {
    const surahDetail = await fetchSurahDetail(1, 32);
    const firstPage = surahDetail.verses[0]?.page ?? 1;
    const pageVerses = await fetchPageVerses(firstPage, 32);
    const matchingVerse = pageVerses.find((verse) => verse.surah_id === 1 && verse.verse_number === 1);

    expect(matchingVerse?.translation.text).toBe(surahDetail.verses[0]?.translation.text);
    expect(matchingVerse?.timing).toEqual(surahDetail.verses[0]?.timing);
  });

  it('returns translated page verses for non-default translation authors', async () => {
    const pageVerses = await fetchPageVerses(1, 113);

    expect(pageVerses.length).toBeGreaterThan(0);
    expect(pageVerses[0]?.translation.text).not.toBe('');
  });

  it('lists full-surah audio refs for offline downloads', async () => {
    const audioRefs = await fetchSurahAudioRefs();

    expect(audioRefs.length).toBe(114);
    expect(audioRefs[0]).toEqual({
      surahId: 1,
      remoteUrl: expect.stringContaining('/001.mp3'),
    });
  });
});
