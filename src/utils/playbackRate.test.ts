import { describe, expect, it } from 'vitest';
import {
  formatPlaybackRate,
  normalizePlaybackRateInput,
  parsePlaybackRate,
  PLAYBACK_RATE_PRESETS,
} from './playbackRate';

describe('playbackRate helpers', () => {
  it('formats rates without unnecessary trailing zeroes', () => {
    expect(formatPlaybackRate(1)).toBe('1x');
    expect(formatPlaybackRate(1.25)).toBe('1.25x');
    expect(formatPlaybackRate(1.5)).toBe('1.5x');
  });

  it('normalizes decimal input', () => {
    expect(normalizePlaybackRateInput('1,25x')).toBe('1.25');
    expect(normalizePlaybackRateInput('2..0')).toBe('2.0');
  });

  it('accepts only supported playback rates', () => {
    expect(parsePlaybackRate('0.5')).toBe(0.5);
    expect(parsePlaybackRate('1.257')).toBe(1.26);
    expect(parsePlaybackRate('2')).toBe(2);
    expect(parsePlaybackRate('0.49')).toBeNull();
    expect(parsePlaybackRate('2.01')).toBeNull();
    expect(parsePlaybackRate('abc')).toBeNull();
  });

  it('exposes bounded playback presets for the speed menu', () => {
    expect(PLAYBACK_RATE_PRESETS).toEqual([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
    expect(PLAYBACK_RATE_PRESETS.map(formatPlaybackRate)).toEqual([
      '0.5x',
      '0.75x',
      '1x',
      '1.25x',
      '1.5x',
      '1.75x',
      '2x',
    ]);
  });
});
