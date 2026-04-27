type TrackPlayerApi = {
  registerPlaybackService: (factory: PlaybackServiceFactory) => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  addEventListener: (event: unknown, listener: () => void) => unknown;
};

type TrackPlayerModule = {
  default?: TrackPlayerApi;
  Event: {
    RemotePlay: unknown;
    RemotePause: unknown;
    RemoteStop: unknown;
    PlaybackState: unknown;
    PlaybackQueueEnded: unknown;
    PlaybackProgressUpdated: unknown;
    PlaybackError: unknown;
  };
  Capability: {
    Play: unknown;
    Pause: unknown;
    Stop: unknown;
    SeekTo: unknown;
  };
  RepeatMode: {
    Off: unknown;
  };
  AppKilledPlaybackBehavior: {
    ContinuePlayback: unknown;
    StopPlaybackAndRemoveNotification: unknown;
  };
};
type PlaybackServiceFactory = () => (() => Promise<void>);

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
    return null;
  }
}

export function getTrackPlayerUnavailableReason() {
  if (cachedError !== undefined) {
    return cachedError;
  }

  getTrackPlayerModule();
  return cachedError === undefined ? null : cachedError;
}

export function registerPlaybackService(factory: PlaybackServiceFactory) {
  const trackPlayerModule = getTrackPlayerModule();
  if (!trackPlayerModule) {
    return false;
  }

  const TrackPlayer = trackPlayerModule.default;
  if (!TrackPlayer) {
    throw new Error('TrackPlayer default export is unavailable.');
  }

  TrackPlayer.registerPlaybackService(factory);
  return true;
}
