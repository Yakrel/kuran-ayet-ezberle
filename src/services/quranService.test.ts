import { describe, expect, it } from 'vitest';
import { fetchPageVerses, fetchSurahAudioRefs, fetchSurahDetail } from './quranService';

describe('quranService', () => {
  it('keeps page verse mapping aligned with surah detail mapping', async () => {
    const surahDetail = await fetchSurahDetail(1, 32);
    const firstVerse = surahDetail.verses[0];
    expect(firstVerse).toBeDefined();
    const firstPage = firstVerse.page;
    const pageVerses = await fetchPageVerses(firstPage, 32);
    const matchingVerse = pageVerses.find((verse) => verse.surah_id === 1 && verse.verse_number === 1);

    expect(matchingVerse?.translation.text).toBe(firstVerse.translation.text);
    expect(matchingVerse?.timing).toEqual(firstVerse.timing);
  });

  it('returns translated page verses for non-default translation authors', async () => {
    const pageVerses = await fetchPageVerses(1, 32);

    expect(pageVerses.length).toBeGreaterThan(0);
    expect(pageVerses[0]?.translation.text).not.toBe('');
  });

  it('throws when the requested translation is not embedded', async () => {
    await expect(fetchPageVerses(1, 999999)).rejects.toThrow('Translation 999999 is unavailable');
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
