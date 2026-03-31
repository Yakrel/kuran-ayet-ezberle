import { useCallback, useEffect, useRef } from 'react';
import { getPreferredVerseAudioUri } from '../services/audioCache';
import { appendAudioDiagnosticLog } from '../services/audioDiagnostics';
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

type TrackPlayerApi = {
  setupPlayer: () => Promise<void>;
  updateOptions: (options: unknown) => Promise<void>;
  setRepeatMode: (mode: unknown) => Promise<unknown>;
  stop: () => Promise<void>;
  reset: () => Promise<void>;
  setQueue: (queue: QueuedVerseTrack[]) => Promise<void>;
  play: () => Promise<void>;
  addEventListener: (event: unknown, listener: (payload: unknown) => void) => { remove: () => void };
};

type ActiveTrackChangedEvent = {
  track?: Record<string, unknown>;
};

const RECITER_NAME = 'Saad Al-Ghamdi';

function isTrackPlayerApi(value: unknown): value is TrackPlayerApi {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<TrackPlayerApi>;
  return (
    typeof candidate.setupPlayer === 'function' &&
    typeof candidate.updateOptions === 'function' &&
    typeof candidate.setRepeatMode === 'function' &&
    typeof candidate.stop === 'function' &&
    typeof candidate.reset === 'function' &&
    typeof candidate.setQueue === 'function' &&
    typeof candidate.play === 'function' &&
    typeof candidate.addEventListener === 'function'
  );
}

function resolveTrackPlayerApi(): TrackPlayerApi | null {
  const trackPlayerModule = getTrackPlayerModule();
  if (!trackPlayerModule) {
    return null;
  }

  const candidate = trackPlayerModule.default ?? trackPlayerModule;
  return isTrackPlayerApi(candidate) ? candidate : null;
}

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
  const isPlayerSetupRef = useRef(false);
  const activeSessionTokenRef = useRef<number | null>(null);
  const onTrackChangeRef = useRef(onTrackChange);
  const onQueueEndedRef = useRef(onQueueEnded);

  const logAudioStep = useCallback((step: string, payload?: Record<string, unknown>) => {
    console.log(`[audio] ${step}`, payload ?? '');
    void appendAudioDiagnosticLog(step, payload);
  }, []);

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
      logAudioStep('track_player_module_missing', { reason });
      setErrorMessage(reason);
      throw new Error(reason);
    }

    const TrackPlayer = resolveTrackPlayerApi();
    if (!TrackPlayer) {
      const reason = getTrackPlayerUnavailableReason() ?? audioModeError;
      logAudioStep('track_player_api_missing', { reason });
      setErrorMessage(reason);
      throw new Error(reason);
    }
    const { AppKilledPlaybackBehavior, Capability, RepeatMode } = trackPlayerModule;

    if (!setupPromiseRef.current) {
      setupPromiseRef.current = (async () => {
        try {
          logAudioStep('setup_player_start');
          await TrackPlayer.setupPlayer();
          logAudioStep('setup_player_success');
        } catch (error) {
          const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
          if (code !== 'player_already_initialized') {
            logAudioStep('setup_player_error', { code, message: error instanceof Error ? error.message : String(error) });
            throw error;
          }
          logAudioStep('setup_player_already_initialized');
        }

        logAudioStep('update_options_start');
        await TrackPlayer.updateOptions({
          capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
          compactCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
          notificationCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
          progressUpdateEventInterval: 0.25,
          android: {
            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
            alwaysPauseOnInterruption: true,
          },
        });
        logAudioStep('update_options_success');

        await TrackPlayer.setRepeatMode(RepeatMode.Off);
        logAudioStep('set_repeat_mode_success');
        isPlayerSetupRef.current = true;
      })().catch((error) => {
        setupPromiseRef.current = null;
        isPlayerSetupRef.current = false;
        logAudioStep('setup_sequence_error', { message: error instanceof Error ? error.message : String(error) });
        throw error;
      });
    }

    try {
      await setupPromiseRef.current;
    } catch (error) {
      isPlayerSetupRef.current = false;
      logAudioStep('ensure_setup_error', { message: error instanceof Error ? error.message : String(error) });
      setErrorMessage(error instanceof Error ? error.message : audioModeError);
      throw error;
    }
  }, [audioModeError, logAudioStep, setErrorMessage]);

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
      const TrackPlayer = resolveTrackPlayerApi();
      if (TrackPlayer && isPlayerSetupRef.current) {
        logAudioStep('stop_playback_start');
        await TrackPlayer.stop();
        await TrackPlayer.reset();
        logAudioStep('stop_playback_success');
      }
    } catch (error) {
      logAudioStep('stop_playback_error', { message: error instanceof Error ? error.message : String(error) });
      setErrorMessage(error instanceof Error ? error.message : stoppingAudioError);
    } finally {
      setIsPreparingAudio(false);
    }
  }, [logAudioStep, setErrorMessage, setIsPreparingAudio, stoppingAudioError]);

  const startPlaybackSession = useCallback(
    async (verses: Verse[], repeatCount: number, sessionToken: number): Promise<void> => {
      setIsPreparingAudio(true);

      try {
        logAudioStep('start_session', { repeatCount, verseCount: verses.length });
        await ensurePlayerSetup();
        const TrackPlayer = resolveTrackPlayerApi();
        if (!TrackPlayer) {
          logAudioStep('start_session_no_player');
          setIsPreparingAudio(false);
          return;
        }

        if (sessionToken !== playbackTokenRef.current) {
          setIsPreparingAudio(false);
          return;
        }

        const queue = await buildQueue(verses, repeatCount, sessionToken);
        logAudioStep('queue_built', { queueSize: queue.length });
        if (sessionToken !== playbackTokenRef.current) {
          setIsPreparingAudio(false);
          return;
        }

        logAudioStep('playback_reset_before_queue');
        await TrackPlayer.reset().catch((error: unknown) => {
          logAudioStep('reset_before_queue_error', { message: error instanceof Error ? error.message : String(error) });
          throw error;
        });
        logAudioStep('set_queue_start');
        await TrackPlayer.setQueue(queue).catch((error: unknown) => {
          logAudioStep('set_queue_error', { message: error instanceof Error ? error.message : String(error) });
          throw error;
        });
        activeSessionTokenRef.current = sessionToken;
        setIsPreparingAudio(false);
        logAudioStep('play_start');
        await TrackPlayer.play().catch((error: unknown) => {
          logAudioStep('play_error', { message: error instanceof Error ? error.message : String(error) });
          throw error;
        });
        logAudioStep('play_started');
      } catch (error) {
        setIsPreparingAudio(false);
        logAudioStep('start_session_error', { message: error instanceof Error ? error.message : String(error) });
        setErrorMessage(error instanceof Error ? error.message : playbackError);
        await stopPlayback();
      }
    },
    [buildQueue, ensurePlayerSetup, logAudioStep, playbackError, setErrorMessage, setIsPreparingAudio, stopPlayback]
  );

  useEffect(() => {
    const trackPlayerModule = getTrackPlayerModule();
    if (!trackPlayerModule) {
      return;
    }

    const TrackPlayer = resolveTrackPlayerApi();
    if (!TrackPlayer) {
      return;
    }
    const { Event } = trackPlayerModule;

    try {
      const subscriptions = [
        TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event: unknown) => {
          const payload = event as ActiveTrackChangedEvent;
          if (activeSessionTokenRef.current !== playbackTokenRef.current || !payload.track) {
            return;
          }

          const trackExtras = payload.track;
          const verseIndex = Number(trackExtras.verseIndex);
          const repeat = Number(trackExtras.repeat);

          if (!Number.isNaN(verseIndex) && !Number.isNaN(repeat)) {
            logAudioStep('active_track_changed', { verseIndex, repeat });
            onTrackChangeRef.current({ verseIndex, repeat });
          }
        }),
        TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
          if (activeSessionTokenRef.current !== playbackTokenRef.current) {
            return;
          }

          activeSessionTokenRef.current = null;
          logAudioStep('queue_ended');
          onQueueEndedRef.current();
        }),
      ];

      return () => {
        subscriptions.forEach((subscription) => {
          subscription.remove();
        });
      };
    } catch (error) {
      logAudioStep('event_listener_attach_error', { message: error instanceof Error ? error.message : String(error) });
      return;
    }
  }, [logAudioStep]);

  return {
    startPlaybackSession,
    stopPlayback,
    playbackTokenRef,
  };
}
