import { describe, expect, it } from 'vitest';
import { getAutoScrollTargetIndex } from '../utils/getAutoScrollTargetIndex';

describe('getAutoScrollTargetIndex', () => {
  it('keeps the list still when the active verse stays within the visible band', () => {
    expect(getAutoScrollTargetIndex(3, [1, 2, 3, 4, 5])).toBeNull();
  });

  it('scrolls when the active verse moves above the visible band', () => {
    expect(getAutoScrollTargetIndex(0, [1, 2, 3, 4, 5])).toBe(0);
  });

  it('scrolls when the active verse moves below the visible band', () => {
    expect(getAutoScrollTargetIndex(6, [1, 2, 3, 4, 5])).toBe(6);
  });

  it('scrolls to the active verse when there is no visibility snapshot yet', () => {
    expect(getAutoScrollTargetIndex(4, [])).toBe(4);
  });
});
