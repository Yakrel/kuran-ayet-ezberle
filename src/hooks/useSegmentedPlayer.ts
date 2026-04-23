import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { DEFAULT_RECITER_ID, getReciterOption, type ReciterId } from '../constants/reciters';
import { getTrackPlayerModule, getTrackPlayerUnavailableReason } from '../services/trackPlayer';
import { getPreferredSurahAudioUri } from '../services/surahAudioCache';
import type { SurahDetail, Verse } from '../types/quran';
import {
  resolveContinuousRepeatStep,
  resolveContinuousVerseIndex,
  type ContinuousBoundary,
} from '../utils/continuousPlayback';

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped';

type ContinuousVerseBoundary = ContinuousBoundary & {
  verse: Verse;
};

type PlaybackSession = {
  surahId: number;
  startVerseNumber: number;
  endVerseNumber: number;
  repeatCount: number;
  trackId: string;
  surahAudioUrl: string;
  boundaries: ContinuousVerseBoundary[];
  rangeStartMs: number;
  rangeEndMs: number;
  rangeDurationMs: number;
  totalDurationMs: number;
};

type UseSegmentedPlayerOptions = {
  onError: (message: string | null) => void;
  onActiveVerseChange?: (verse: Verse | null) => void;
  reciterId: ReciterId;
};

type StartPlaybackArgs = {
  surahDetail: SurahDetail;
  startVerseNumber: number;
  endVerseNumber: number;
  repeatCount: number;
  reciterId: ReciterId;
};

type TrackPlayerProgress = {
  position: number;
  duration: number;
  buffered: number;
};

type TrackPlayerApi = {
  setupPlayer: () => Promise<void>;
  updateOptions: (options: unknown) => Promise<void>;
  setRepeatMode: (mode: unknown) => Promise<unknown>;
  reset: () => Promise<void>;
  add: (track: unknown) => Promise<unknown>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (positionSeconds: number) => Promise<void>;
  getProgress: () => Promise<TrackPlayerProgress>;
  setRate: (rate: number) => Promise<void>;
  addEventListener: (event: unknown, listener: (payload: unknown) => void) => { remove: () => void };
};

const KEEP_AWAKE_TAG = 'kuran-ayet-ezberle-playback';

function isTrackPlayerApi(value: unknown): value is TrackPlayerApi {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<TrackPlayerApi>;
  return (
    typeof candidate.setupPlayer === 'function' &&
    typeof candidate.updateOptions === 'function' &&
    typeof candidate.setRepeatMode === 'function' &&
    typeof candidate.reset === 'function' &&
    typeof candidate.add === 'function' &&
    typeof candidate.play === 'function' &&
    typeof candidate.pause === 'function' &&
    typeof candidate.stop === 'function' &&
    typeof candidate.seekTo === 'function' &&
    typeof candidate.getProgress === 'function' &&
    typeof candidate.setRate === 'function' &&
    typeof candidate.addEventListener === 'function'
  );
}

function getPlayerApi() {
  const module = getTrackPlayerModule();
  if (!module) {
    return null;
  }

  const candidate = module.default ?? module;
  return isTrackPlayerApi(candidate) ? candidate : null;
}

function toPlaybackStatus(trackPlayerState: string | undefined): PlaybackStatus {
  switch (trackPlayerState) {
    case 'loading':
    case 'buffering':
      return 'loading';
    case 'playing':
      return 'playing';
    case 'paused':
    case 'ready':
      return 'paused';
    case 'stopped':
    case 'ended':
      return 'stopped';
    default:
      return 'idle';
  }
}

function getSelectedVerses(
  surahDetail: SurahDetail,
  startVerseNumber: number,
  endVerseNumber: number
) {
  return surahDetail.verses.filter(
    (verse) => verse.verse_number >= startVerseNumber && verse.verse_number <= endVerseNumber
  );
}

async function buildContinuousPlaybackSession(
  surahDetail: SurahDetail,
  startVerseNumber: number,
  endVerseNumber: number,
  repeatCount: number
): Promise<PlaybackSession> {
  if (!surahDetail.audio?.url) {
    throw new Error('Continuous playback is unavailable because the surah audio is missing.');
  }

  const selectedVerses = getSelectedVerses(surahDetail, startVerseNumber, endVerseNumber);
  const boundaries = selectedVerses.map((verse) => {
    if (!verse.timing) {
      throw new Error(`Continuous playback is unavailable for ayah ${verse.verse_number}.`);
    }

    return {
      verse,
      startTimeMs: verse.timing.time_from_ms,
      endTimeMs: verse.timing.time_to_ms,
    };
  });

  if (boundaries.length === 0) {
    throw new Error('No playable ayahs found in the selected range.');
  }

  const rangeStartMs = boundaries[0].startTimeMs;
  const rangeEndMs = boundaries[boundaries.length - 1].endTimeMs;
  const rangeDurationMs = Math.max(rangeEndMs - rangeStartMs, 1);
  const surahAudioUrl = await getPreferredSurahAudioUri(DEFAULT_RECITER_ID, surahDetail.id, surahDetail.audio.url);

  return {
    surahId: surahDetail.id,
    startVerseNumber,
    endVerseNumber,
    repeatCount,
    trackId: `surah-${surahDetail.id}-continuous`,
    surahAudioUrl,
    boundaries,
    rangeStartMs,
    rangeEndMs,
    rangeDurationMs,
    totalDurationMs: rangeDurationMs * repeatCount,
  };
}

export function useSegmentedPlayer({ onError, onActiveVerseChange }: UseSegmentedPlayerOptions) {
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [currentRepeat, setCurrentRepeat] = useState(1);
  const [activeVerse, setActiveVerse] = useState<Verse | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(1.0);

  const sessionRef = useRef<PlaybackSession | null>(null);
  const currentRepeatRef = useRef(1);
  const continuousVerseIndexRef = useRef(0);
  const playbackRateRef = useRef(1.0);
  const setupPromiseRef = useRef<Promise<void> | null>(null);
  const playbackRequestIdRef = useRef(0);
  const pendingPlayTransitionRef = useRef(false);
  const continuousBoundaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const continuousTransitionInFlightRef = useRef(false);

  const clearContinuousBoundaryTimer = useCallback(() => {
    if (continuousBoundaryTimerRef.current) {
      clearTimeout(continuousBoundaryTimerRef.current);
      continuousBoundaryTimerRef.current = null;
    }
  }, []);

  const syncVisibleState = useCallback((nextActiveVerse: Verse | null, repeatIndex: number) => {
    currentRepeatRef.current = repeatIndex;
    setCurrentRepeat(repeatIndex);
    setActiveVerse((previous) => {
      if (
        previous?.surah_id === nextActiveVerse?.surah_id &&
        previous?.verse_number === nextActiveVerse?.verse_number
      ) {
        return previous;
      }

      onActiveVerseChange?.(nextActiveVerse);
      return nextActiveVerse;
    });
  }, [onActiveVerseChange]);

  const syncContinuousActiveState = useCallback((positionMs: number) => {
    const session = sessionRef.current;
    if (!session) {
      return;
    }

    const nextVerseIndex = resolveContinuousVerseIndex(session.boundaries, positionMs);
    if (continuousVerseIndexRef.current === nextVerseIndex) {
      return;
    }

    continuousVerseIndexRef.current = nextVerseIndex;
    syncVisibleState(session.boundaries[nextVerseIndex]?.verse ?? null, currentRepeatRef.current);
  }, [syncVisibleState]);

  const ensurePlayerSetup = useCallback(async () => {
    const playerModule = getTrackPlayerModule();
    const TrackPlayer = getPlayerApi();
    if (!playerModule || !TrackPlayer) {
      const reason = getTrackPlayerUnavailableReason() ?? 'TrackPlayer is unavailable.';
      onError(reason);
      throw new Error(reason);
    }

    if (!setupPromiseRef.current) {
      const { Capability, RepeatMode } = playerModule;
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
          capabilities: [Capability.Play, Capability.Pause, Capability.Stop, Capability.SeekTo],
          compactCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
          notificationCapabilities: [Capability.Play, Capability.Pause, Capability.Stop, Capability.SeekTo],
          android: {
            appKilledPlaybackBehavior: playerModule.AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
          },
          progressUpdateEventInterval: 0.1,
        });
        await TrackPlayer.setRepeatMode(RepeatMode.Off);
        await TrackPlayer.setRate(playbackRateRef.current);
      })().catch((error) => {
        setupPromiseRef.current = null;
        throw error;
      });
    }

    await setupPromiseRef.current;
    return { playerModule, TrackPlayer };
  }, [onError]);

  const completeActiveSession = useCallback(async (resetPlayer = true) => {
    clearContinuousBoundaryTimer();
    continuousTransitionInFlightRef.current = false;
    continuousVerseIndexRef.current = 0;
    currentRepeatRef.current = 1;
    setCurrentRepeat(1);
    setActiveVerse(null);
    pendingPlayTransitionRef.current = false;

    const TrackPlayer = getPlayerApi();
    if (resetPlayer && TrackPlayer) {
      await TrackPlayer.stop().catch(() => undefined);
      await TrackPlayer.reset().catch(() => undefined);
    }

    sessionRef.current = null;
  }, [clearContinuousBoundaryTimer]);

  const scheduleContinuousBoundaryTimer = useCallback(async (remainingMs?: number) => {
    const session = sessionRef.current;
    if (!session) {
      return;
    }

    clearContinuousBoundaryTimer();

    const TrackPlayer = getPlayerApi();
    if (!TrackPlayer) {
      return;
    }

    let nextRemainingMs = remainingMs;
    if (nextRemainingMs === undefined) {
      const progress = await TrackPlayer.getProgress();
      const positionMs = Math.round(progress.position * 1000);
      nextRemainingMs = Math.max(session.rangeEndMs - positionMs, 0);
    }

    const playbackRateValue = Math.max(playbackRateRef.current, 0.1);
    const timeoutMs = Math.max(Math.ceil(nextRemainingMs / playbackRateValue), 0);

    continuousBoundaryTimerRef.current = setTimeout(() => {
      const run = async () => {
        if (continuousTransitionInFlightRef.current) {
          return;
        }

        const currentSession = sessionRef.current;
        const currentPlayer = getPlayerApi();
        if (!currentSession || !currentPlayer) {
          return;
        }

        continuousTransitionInFlightRef.current = true;
        clearContinuousBoundaryTimer();

        try {
          const repeatStep = resolveContinuousRepeatStep(currentRepeatRef.current, currentSession.repeatCount);
          if (repeatStep.action === 'repeat') {
            continuousVerseIndexRef.current = 0;
            syncVisibleState(currentSession.boundaries[0]?.verse ?? null, repeatStep.nextRepeat);
            await currentPlayer.seekTo(currentSession.rangeStartMs / 1000);
            await scheduleContinuousBoundaryTimer(currentSession.rangeDurationMs);
            return;
          }

          await completeActiveSession();
          setPlaybackStatus('stopped');
        } catch (error) {
          await completeActiveSession();
          setPlaybackStatus('stopped');
          onError(error instanceof Error ? error.message : 'Playback failed.');
        } finally {
          continuousTransitionInFlightRef.current = false;
        }
      };

      void run();
    }, timeoutMs);
  }, [clearContinuousBoundaryTimer, completeActiveSession, onError, syncVisibleState]);

  const setPlaybackRate = useCallback(async (rate: number) => {
    const TrackPlayer = getPlayerApi();
    if (!TrackPlayer) {
      return;
    }

    try {
      await TrackPlayer.setRate(rate);
      playbackRateRef.current = rate;
      setPlaybackRateState(rate);

      if (sessionRef.current && playbackStatus === 'playing') {
        await scheduleContinuousBoundaryTimer();
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to set playback rate.');
    }
  }, [onError, playbackStatus, scheduleContinuousBoundaryTimer]);

  useEffect(() => {
    let isMounted = true;
    const cleanups: Array<() => void> = [];

    void ensurePlayerSetup()
      .then(({ playerModule, TrackPlayer }) => {
        if (!isMounted) {
          return;
        }

        const stateSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackState,
          (payload: unknown) => {
            const nextState = payload as { state?: string };
            const nextStatus = toPlaybackStatus(nextState.state);

            if (pendingPlayTransitionRef.current && nextStatus === 'paused') {
              return;
            }

            if (nextStatus === 'playing') {
              void scheduleContinuousBoundaryTimer();
            }

            if (nextStatus === 'paused' || nextStatus === 'stopped' || nextStatus === 'idle') {
              clearContinuousBoundaryTimer();
            }

            if (nextStatus === 'playing' || nextStatus === 'stopped' || nextStatus === 'idle') {
              pendingPlayTransitionRef.current = false;
            }

            setPlaybackStatus(nextStatus);
          }
        );

        const progressSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackProgressUpdated,
          (payload: unknown) => {
            const nextProgress = payload as Partial<TrackPlayerProgress>;
            const positionMs = Math.round((nextProgress.position ?? 0) * 1000);
            syncContinuousActiveState(positionMs);
          }
        );

        const errorSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackError,
          (payload: unknown) => {
            const nextError = payload as { message?: string };

            void (async () => {
              await completeActiveSession(false);
              setPlaybackStatus('stopped');
              onError(nextError.message ?? 'Playback failed.');
            })();
          }
        );

        cleanups.push(() => {
          stateSubscription.remove();
          progressSubscription.remove();
          errorSubscription.remove();
        });
      })
      .catch((error) => {
        onError(error instanceof Error ? error.message : 'Playback setup failed.');
      });

    return () => {
      isMounted = false;
      clearContinuousBoundaryTimer();
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [
    clearContinuousBoundaryTimer,
    completeActiveSession,
    ensurePlayerSetup,
    onError,
    scheduleContinuousBoundaryTimer,
    syncContinuousActiveState,
  ]);

  useEffect(() => {
    if (playbackStatus !== 'playing') {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
      return;
    }

    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [playbackStatus]);

  const startPlayback = useCallback(async ({
    surahDetail,
    startVerseNumber,
    endVerseNumber,
    repeatCount,
  }: StartPlaybackArgs) => {
    const requestId = playbackRequestIdRef.current + 1;
    playbackRequestIdRef.current = requestId;

    pendingPlayTransitionRef.current = true;
    setPlaybackStatus('loading');
    onError(null);
    clearContinuousBoundaryTimer();

    try {
      const { TrackPlayer } = await ensurePlayerSetup();
      const reciter = getReciterOption(DEFAULT_RECITER_ID);
      const nextSession = await buildContinuousPlaybackSession(
        surahDetail,
        startVerseNumber,
        endVerseNumber,
        repeatCount
      );

      if (requestId !== playbackRequestIdRef.current) {
        pendingPlayTransitionRef.current = false;
        return;
      }

      await completeActiveSession();
      if (requestId !== playbackRequestIdRef.current) {
        pendingPlayTransitionRef.current = false;
        return;
      }

      sessionRef.current = nextSession;
      continuousVerseIndexRef.current = 0;
      syncVisibleState(nextSession.boundaries[0]?.verse ?? null, 1);

      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: nextSession.trackId,
        url: nextSession.surahAudioUrl,
        title: `${surahDetail.name} ${startVerseNumber}-${endVerseNumber}`,
        artist: reciter.artist,
      });
      await TrackPlayer.seekTo(nextSession.rangeStartMs / 1000);
      await TrackPlayer.play();
      await scheduleContinuousBoundaryTimer(nextSession.rangeDurationMs);

      if (requestId === playbackRequestIdRef.current) {
        pendingPlayTransitionRef.current = false;
        setPlaybackStatus('playing');
      }
    } catch (error) {
      pendingPlayTransitionRef.current = false;
      await completeActiveSession();
      setPlaybackStatus('stopped');
      throw error;
    }
  }, [clearContinuousBoundaryTimer, completeActiveSession, ensurePlayerSetup, onError, scheduleContinuousBoundaryTimer, syncVisibleState]);

  const pausePlayback = useCallback(async () => {
    const TrackPlayer = getPlayerApi();
    if (!TrackPlayer) {
      return;
    }

    clearContinuousBoundaryTimer();
    await TrackPlayer.pause();
    setPlaybackStatus('paused');
  }, [clearContinuousBoundaryTimer]);

  const resumePlayback = useCallback(async () => {
    const TrackPlayer = getPlayerApi();
    const session = sessionRef.current;
    if (!TrackPlayer || !session) {
      return;
    }

    pendingPlayTransitionRef.current = true;
    await TrackPlayer.play();
    pendingPlayTransitionRef.current = false;
    await scheduleContinuousBoundaryTimer();
    setPlaybackStatus('playing');
  }, [scheduleContinuousBoundaryTimer]);

  const stopPlayback = useCallback(async () => {
    playbackRequestIdRef.current += 1;
    await completeActiveSession();
    setPlaybackStatus('stopped');
  }, [completeActiveSession]);

  const state = useMemo(() => ({
    playbackStatus,
    currentRepeat,
    activeVerse,
    playbackRate,
  }), [activeVerse, currentRepeat, playbackStatus, playbackRate]);

  return {
    ...state,
    startPlayback,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    setPlaybackRate,
  };
}
