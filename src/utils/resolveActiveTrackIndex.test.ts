import { describe, expect, it } from 'vitest';
import { resolveActiveTrackIndex } from './resolveActiveTrackIndex';

describe('resolveActiveTrackIndex', () => {
  const tracks = [
    { id: 'surah-1-verse-1-repeat-1' },
    { id: 'surah-1-verse-2-repeat-1' },
  ];

  it('prefers the native track index when present', () => {
    expect(resolveActiveTrackIndex({ index: 1 }, tracks)).toBe(1);
  });

  it('falls back to the emitted track id when index is missing', () => {
    expect(
      resolveActiveTrackIndex({ track: { id: 'surah-1-verse-2-repeat-1' } }, tracks)
    ).toBe(1);
  });

  it('returns null when neither index nor track id matches the queue', () => {
    expect(resolveActiveTrackIndex({ track: { id: 'surah-9-verse-9-repeat-9' } }, tracks)).toBeNull();
  });
});
