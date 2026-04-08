import { useMemo } from 'react';
import { PanResponder, type GestureResponderHandlers } from 'react-native';
import { GESTURE_THRESHOLDS } from '../constants/gestures';
import { resolveSwipeDirection } from './resolveSwipeDirection';

export function useSwipeGesture(
  goToNextPage: () => void,
  goToPreviousPage: () => void
): GestureResponderHandlers {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > GESTURE_THRESHOLDS.MIN_SWIPE_DISTANCE &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * GESTURE_THRESHOLDS.SWIPE_ANGLE_RATIO,
        onPanResponderRelease: (_, gestureState) => {
          const direction = resolveSwipeDirection(gestureState.dx);
          if (direction === 'next') {
            goToNextPage();
            return;
          }
          if (direction === 'previous') {
            goToPreviousPage();
          }
        },
      }),
    [goToNextPage, goToPreviousPage]
  );

  return panResponder.panHandlers;
}
