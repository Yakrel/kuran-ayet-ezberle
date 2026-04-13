import { describe, expect, it } from 'vitest';
import {
  resolveContinuousRepeatStep,
  resolveContinuousVerseIndex,
} from './continuousPlayback';

describe('resolveContinuousVerseIndex', () => {
  const boundaries = [
    { startTimeMs: 1000, endTimeMs: 2000 },
    { startTimeMs: 2200, endTimeMs: 3200 },
    { startTimeMs: 3400, endTimeMs: 4500 },
  ];

  it('pins to the first ayah before the range begins', () => {
    expect(resolveContinuousVerseIndex(boundaries, 900)).toBe(0);
  });

  it('keeps the previous ayah active during natural gaps', () => {
    expect(resolveContinuousVerseIndex(boundaries, 2100)).toBe(0);
    expect(resolveContinuousVerseIndex(boundaries, 3300)).toBe(1);
  });

  it('switches once the next ayah actually starts', () => {
    expect(resolveContinuousVerseIndex(boundaries, 2200)).toBe(1);
    expect(resolveContinuousVerseIndex(boundaries, 4100)).toBe(2);
  });
});

describe('resolveContinuousRepeatStep', () => {
  it('advances to the next repeat before the final cycle', () => {
    expect(resolveContinuousRepeatStep(1, 3)).toEqual({
      action: 'repeat',
      nextRepeat: 2,
    });
  });

  it('stops after the final repeat completes', () => {
    expect(resolveContinuousRepeatStep(3, 3)).toEqual({
      action: 'stop',
      nextRepeat: 3,
    });
  });
});
