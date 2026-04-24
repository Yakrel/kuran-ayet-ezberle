import { getTrackPlayerModule } from './trackPlayer';

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

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    void TrackPlayer.stop();
  });
}
