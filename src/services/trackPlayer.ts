type TrackPlayerModule = typeof import('react-native-track-player');

let cachedModule: TrackPlayerModule | null | undefined;
let cachedError: string | null | undefined;

function formatLoadError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

export function getTrackPlayerModule(): TrackPlayerModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  try {
    cachedModule = require('react-native-track-player') as TrackPlayerModule;
    cachedError = null;
    return cachedModule;
  } catch (error) {
    cachedModule = null;
    cachedError = formatLoadError(error);
    console.error('TrackPlayer could not be loaded:', error);
    return null;
  }
}

export function getTrackPlayerUnavailableReason() {
  if (cachedError !== undefined) {
    return cachedError;
  }

  getTrackPlayerModule();
  return cachedError ?? null;
}

export function registerPlaybackService(service: () => Promise<void>) {
  const trackPlayerModule = getTrackPlayerModule();
  if (!trackPlayerModule) {
    return false;
  }

  const TrackPlayer = trackPlayerModule.default ?? trackPlayerModule;
  TrackPlayer.registerPlaybackService(() => service);
  return true;
}
