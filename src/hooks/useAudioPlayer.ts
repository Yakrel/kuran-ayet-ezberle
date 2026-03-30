import { useCallback, useEffect, useRef } from 'react';
import { getPreferredVerseAudioUri } from '../services/audioCache';
import { getTrackPlayerModule, getTrackPlayerUnavailableReason } from '../services/trackPlayer';
import type { Verse } from '../types/quran';

type TrackChangePayload = {
  verseIndex: number;
  repeat: number;
};

type UseAudioPlayerReturn = {
  startPlaybackSession: (verses: Verse[], repeatCount: number, sessionToken: number) => Promise<void>;
  stopPlayback: () => Promise<void>;
  playbackTokenRef: React.MutableRefObject<number>;
};

type QueuedVerseTrack = {
  id: string;
  url: string;
  title: string;
  artist: string;
  verseIndex: number;
  repeat: number;
};

const RECITER_NAME = 'Saad Al-Ghamdi';

export function useAudioPlayer(
  setErrorMessage: (error: string | null) => void,
  setIsPreparingAudio: (preparing: boolean) => void,
  stoppingAudioError: string,
  playbackError: string,
  audioModeError: string,
  onTrackChange: (payload: TrackChangePayload) => void,
  onQueueEnded: () => void
): UseAudioPlayerReturn {
  const playbackTokenRef = useRef(0);
  const setupPromiseRef = useRef<Promise<void> | null>(null);
  const activeSessionTokenRef = useRef<number | null>(null);
  const onTrackChangeRef = useRef(onTrackChange);
  const onQueueEndedRef = useRef(onQueueEnded);

  useEffect(() => {
    onTrackChangeRef.current = onTrackChange;
  }, [onTrackChange]);

  useEffect(() => {
    onQueueEndedRef.current = onQueueEnded;
  }, [onQueueEnded]);

  const ensurePlayerSetup = useCallback(async () => {
    const trackPlayerModule = getTrackPlayerModule();
    if (!trackPlayerModule) {
      const reason = getTrackPlayerUnavailableReason() ?? audioModeError;
      setErrorMessage(reason);
      throw new Error(reason);
    }

    const TrackPlayer = trackPlayerModule.default ?? trackPlayerModule;
    const { AppKilledPlaybackBehavior, Capability, RepeatMode } = trackPlayerModule;

    if (!setupPromiseRef.current) {
      setupPromiseRef.current = (async () => {
        try {
          await TrackPlayer.setupPlayer();
        } catch (error) {
          const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
          if (code !== 'player_already_initialized') {
            throw error;
          }
        }

        await TrackPlayer.updateOptions({
          capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
          compactCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
          notificationCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
          progressUpdateEventInterval: 0.25,
          android: {
            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
            alwaysPauseOnInterruption: true,
            foregroundServiceType: 'mediaPlayback',
          },
        });

        await TrackPlayer.setRepeatMode(RepeatMode.Off);
      })().catch((error) => {
        setupPromiseRef.current = null;
        throw error;
      });
    }

    try {
      await setupPromiseRef.current;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : audioModeError);
      throw error;
    }
  }, [audioModeError, setErrorMessage]);

  const buildQueue = useCallback(async (verses: Verse[], repeatCount: number, sessionToken: number) => {
    const queue: QueuedVerseTrack[] = [];

    for (let repeat = 1; repeat <= repeatCount; repeat += 1) {
      for (let verseIndex = 0; verseIndex < verses.length; verseIndex += 1) {
        const verse = verses[verseIndex];
        const url = await getPreferredVerseAudioUri(verse.surah_id, verse.verse_number);

        queue.push({
          id: `${sessionToken}:${repeat}:${verse.surah_id}:${verse.verse_number}`,
          url,
          title: `${verse.surah_id}:${verse.verse_number}`,
          artist: RECITER_NAME,
          verseIndex,
          repeat,
        });
      }
    }

    return queue;
  }, []);

  const stopPlayback = useCallback(async (): Promise<void> => {
    playbackTokenRef.current += 1;
    activeSessionTokenRef.current = null;

    try {
      const trackPlayerModule = getTrackPlayerModule();
      const TrackPlayer = trackPlayerModule?.default ?? trackPlayerModule;
      await ensurePlayerSetup();
      if (!TrackPlayer) {
        return;
      }
      await TrackPlayer.stop();
      await TrackPlayer.reset();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : stoppingAudioError);
    }

    setIsPreparingAudio(false);
  }, [ensurePlayerSetup, setErrorMessage, setIsPreparingAudio, stoppingAudioError]);

  const startPlaybackSession = useCallback(
    async (verses: Verse[], repeatCount: number, sessionToken: number): Promise<void> => {
      setIsPreparingAudio(true);

      try {
        const trackPlayerModule = getTrackPlayerModule();
        const TrackPlayer = trackPlayerModule?.default ?? trackPlayerModule;
        await ensurePlayerSetup();
        if (!TrackPlayer) {
          return;
        }

        if (sessionToken !== playbackTokenRef.current) {
          setIsPreparingAudio(false);
          return;
        }

        const queue = await buildQueue(verses, repeatCount, sessionToken);
        if (sessionToken !== playbackTokenRef.current) {
          setIsPreparingAudio(false);
          return;
        }

        await TrackPlayer.reset();
        await TrackPlayer.setQueue(queue);
        activeSessionTokenRef.current = sessionToken;
        setIsPreparingAudio(false);
        await TrackPlayer.play();
      } catch (error) {
        setIsPreparingAudio(false);
        setErrorMessage(error instanceof Error ? error.message : playbackError);
        await stopPlayback();
      }
    },
    [buildQueue, ensurePlayerSetup, playbackError, setErrorMessage, setIsPreparingAudio, stopPlayback]
  );

  useEffect(() => {
    const trackPlayerModule = getTrackPlayerModule();
    if (!trackPlayerModule) {
      return;
    }

    const TrackPlayer = trackPlayerModule.default ?? trackPlayerModule;
    const { Event } = trackPlayerModule;

    const subscriptions = [
      TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event: { track?: { verseIndex?: string | number; repeat?: string | number } }) => {
        if (activeSessionTokenRef.current !== playbackTokenRef.current || !event.track) {
          return;
        }

        const verseIndex = Number(event.track.verseIndex);
        const repeat = Number(event.track.repeat);

        if (!Number.isNaN(verseIndex) && !Number.isNaN(repeat)) {
          onTrackChangeRef.current({ verseIndex, repeat });
        }
      }),
      TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
        if (activeSessionTokenRef.current !== playbackTokenRef.current) {
          return;
        }

        activeSessionTokenRef.current = null;
        onQueueEndedRef.current();
      }),
    ];

    return () => {
      subscriptions.forEach((subscription) => {
        subscription.remove();
      });
    };
  }, []);

  return {
    startPlaybackSession,
    stopPlayback,
    playbackTokenRef,
  };
}
