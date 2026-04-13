export type ContinuousBoundary = {
  startTimeMs: number;
  endTimeMs: number;
};

export type ContinuousRepeatStep =
  | {
      action: 'repeat';
      nextRepeat: number;
    }
  | {
      action: 'stop';
      nextRepeat: number;
    };

export function resolveContinuousVerseIndex(boundaries: ContinuousBoundary[], positionMs: number) {
  if (boundaries.length === 0) {
    return 0;
  }

  if (positionMs <= boundaries[0].startTimeMs) {
    return 0;
  }

  for (let index = boundaries.length - 1; index >= 0; index -= 1) {
    if (positionMs >= boundaries[index].startTimeMs) {
      return index;
    }
  }

  return 0;
}

export function resolveContinuousRepeatStep(currentRepeat: number, repeatCount: number): ContinuousRepeatStep {
  if (currentRepeat < repeatCount) {
    return {
      action: 'repeat',
      nextRepeat: currentRepeat + 1,
    };
  }

  return {
    action: 'stop',
    nextRepeat: repeatCount,
  };
}
