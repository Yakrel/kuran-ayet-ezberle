import { describe, expect, it } from 'vitest';
import {
  buildNumberOptions,
  getEndVerseOptionStart,
  REPEAT_COUNT_PRESETS,
  resolveStartVerseSelection,
} from './presetControls';

describe('preset control helpers', () => {
  it('builds inclusive number option lists', () => {
    expect(buildNumberOptions(3, 5)).toEqual([
      { label: '3', value: 3 },
      { label: '4', value: 4 },
      { label: '5', value: 5 },
    ]);
  });

  it('keeps the end verse when the selected start remains before it', () => {
    expect(resolveStartVerseSelection(4, 7, 10)).toEqual({
      startVerse: 4,
      endVerse: 7,
    });
  });

  it('pulls the end verse forward when the selected start passes it', () => {
    expect(resolveStartVerseSelection(8, 5, 10)).toEqual({
      startVerse: 8,
      endVerse: 8,
    });
  });

  it('starts end verse options at the selected start verse', () => {
    expect(getEndVerseOptionStart(12)).toBe(12);
    expect(buildNumberOptions(getEndVerseOptionStart(12), 14)).toEqual([
      { label: '12', value: 12 },
      { label: '13', value: 13 },
      { label: '14', value: 14 },
    ]);
  });

  it('uses repeat count presets only', () => {
    expect(REPEAT_COUNT_PRESETS).toEqual([1, 2, 3, 5, 10, 20, 30, 50]);
  });
});
