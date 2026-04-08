import { describe, expect, it } from 'vitest';
import { resolveSwipeDirection } from './resolveSwipeDirection';

describe('resolveSwipeDirection', () => {
  it('maps a right swipe to the next page', () => {
    expect(resolveSwipeDirection(80)).toBe('next');
  });

  it('maps a left swipe to the previous page', () => {
    expect(resolveSwipeDirection(-80)).toBe('previous');
  });

  it('ignores gestures below the execute threshold', () => {
    expect(resolveSwipeDirection(20)).toBeNull();
    expect(resolveSwipeDirection(-20)).toBeNull();
  });
});
