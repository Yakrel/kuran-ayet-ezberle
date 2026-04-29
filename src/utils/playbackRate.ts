export const MIN_PLAYBACK_RATE = 0.5;
export const MAX_PLAYBACK_RATE = 2;
export const PLAYBACK_RATE_PRESETS = [0.75, 1, 1.25, 1.5, 2] as const;

export function formatPlaybackRate(rate: number) {
  if (!Number.isFinite(rate)) {
    throw new Error('Playback rate must be a finite number.');
  }

  return `${Number(rate.toFixed(2)).toString()}x`;
}

export function normalizePlaybackRateInput(value: string) {
  return value
    .replace(',', '.')
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1');
}

export function parsePlaybackRate(value: string) {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const normalized = Number(parsed.toFixed(2));
  if (normalized < MIN_PLAYBACK_RATE || normalized > MAX_PLAYBACK_RATE) {
    return null;
  }

  return normalized;
}
