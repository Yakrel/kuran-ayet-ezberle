export const REPEAT_COUNT_PRESETS = [1, 2, 3, 5, 10, 20, 30, 50] as const;

export type NumberOption = {
  label: string;
  value: number;
};

export function buildNumberOptions(start: number, end: number, formatLabel: (value: number) => string = String) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    return [];
  }

  return Array.from({ length: end - start + 1 }, (_, index) => {
    const value = start + index;
    return {
      label: formatLabel(value),
      value,
    };
  });
}

export function resolveStartVerseSelection(nextStartVerse: number, currentEndVerse: number | null, maxVerse: number) {
  const startVerse = Math.min(Math.max(nextStartVerse, 1), maxVerse);
  const endVerse = currentEndVerse === null || currentEndVerse < startVerse
    ? startVerse
    : Math.min(currentEndVerse, maxVerse);

  return {
    startVerse,
    endVerse,
  };
}

export function getEndVerseOptionStart(startVerse: number | null) {
  return startVerse ?? 1;
}
