import { GESTURE_THRESHOLDS } from '../constants/gestures';

export function resolveSwipeDirection(dx: number): 'next' | 'previous' | null {
  if (Math.abs(dx) < GESTURE_THRESHOLDS.MIN_SWIPE_EXECUTE_DISTANCE) {
    return null;
  }

  return dx > 0 ? 'next' : 'previous';
}
