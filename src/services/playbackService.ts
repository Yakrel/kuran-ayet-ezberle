import { getTrackPlayerModule } from './trackPlayer';
import {
  initializeContinuousPlayback,
  pauseContinuousPlayback,
  resumeContinuousPlayback,
  stopContinuousPlayback,
} from './continuousPlaybackController';

export async function playbackService() {
  const trackPlayerModule = getTrackPlayerModule();
  if (!trackPlayerModule) {
    return;
  }

  const TrackPlayer = trackPlayerModule.default;
  if (!TrackPlayer) {
    throw new Error('TrackPlayer default export is unavailable.');
  }

  const { Event } = trackPlayerModule;

  void initializeContinuousPlayback().catch(() => undefined);

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void resumeContinuousPlayback();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void pauseContinuousPlayback();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    void stopContinuousPlayback();
  });
}
