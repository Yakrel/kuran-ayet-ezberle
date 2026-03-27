import { useMemo } from 'react';
import { PanResponder, type GestureResponderHandlers } from 'react-native';
import { GESTURE_THRESHOLDS } from '../constants/gestures';

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
          if (Math.abs(gestureState.dx) < GESTURE_THRESHOLDS.MIN_SWIPE_EXECUTE_DISTANCE) {
            return;
          }
          if (gestureState.dx < 0) {
            goToNextPage();
            return;
          }
          goToPreviousPage();
        },
      }),
    [goToNextPage, goToPreviousPage]
  );

  return panResponder.panHandlers;
}
