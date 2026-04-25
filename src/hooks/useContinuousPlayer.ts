import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { DEFAULT_RECITER_ID, getReciterOption } from '../constants/reciters';
import { getTrackPlayerModule, getTrackPlayerUnavailableReason } from '../services/trackPlayer';
import type { SurahDetail, Verse } from '../types/quran';
import {
  isContinuousPlaybackEndState,
  resolveContinuousRepeatStep,
  resolveContinuousVerseIndex,
} from '../utils/continuousPlayback';
import {
  buildContinuousPlaybackSession,
  type PlaybackSession,
} from '../utils/continuousPlaybackSession';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped';

type UseContinuousPlayerOptions = {
  onError: (message: string | null) => void;
  onActiveVerseChange?: (verse: Verse | null) => void;
};

type StartPlaybackArgs = {
  surahDetail: SurahDetail;
  startVerseNumber: number;
  endVerseNumber: number;
  repeatCount: number;
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

  const candidate = module.default;
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

export function useContinuousPlayer({ onError, onActiveVerseChange }: UseContinuousPlayerOptions) {
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
    const nextBoundary = session.boundaries[nextVerseIndex];
    if (!nextBoundary) {
      throw new Error(`Playback boundary ${nextVerseIndex} is missing.`);
    }

    syncVisibleState(nextBoundary.verse, currentRepeatRef.current);
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
      await TrackPlayer.stop();
      await TrackPlayer.reset();
    }

    sessionRef.current = null;
  }, [clearContinuousBoundaryTimer]);

  const advanceContinuousRangeEnd = useCallback(async () => {
    if (continuousTransitionInFlightRef.current) {
      return false;
    }

    const currentSession = sessionRef.current;
    const currentPlayer = getPlayerApi();
    if (!currentSession || !currentPlayer) {
      return false;
    }

    continuousTransitionInFlightRef.current = true;
    clearContinuousBoundaryTimer();

    try {
      const repeatStep = resolveContinuousRepeatStep(currentRepeatRef.current, currentSession.repeatCount);
      if (repeatStep.action === 'repeat') {
        continuousVerseIndexRef.current = 0;
        const firstBoundary = currentSession.boundaries[0];
        if (!firstBoundary) {
          throw new Error('Playback session has no ayah boundaries.');
        }

        syncVisibleState(firstBoundary.verse, repeatStep.nextRepeat);
        await currentPlayer.seekTo(currentSession.rangeStartMs / 1000);
        await currentPlayer.play();
        return true;
      }

      await completeActiveSession();
      setPlaybackStatus('stopped');
      return false;
    } catch (error) {
      await completeActiveSession();
      setPlaybackStatus('stopped');
      onError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      continuousTransitionInFlightRef.current = false;
    }
  }, [clearContinuousBoundaryTimer, completeActiveSession, onError, syncVisibleState]);

  const scheduleContinuousBoundaryTimer = useCallback(async (remainingMs?: number) => {
    const session = sessionRef.current;
    if (!session) {
      return;
    }

    clearContinuousBoundaryTimer();

    const TrackPlayer = getPlayerApi();
    if (!TrackPlayer) {
      onError(getTrackPlayerUnavailableReason() ?? 'TrackPlayer is unavailable.');
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
        const didContinue = await advanceContinuousRangeEnd();
        const nextSession = sessionRef.current;
        if (didContinue && nextSession) {
          await scheduleContinuousBoundaryTimer(nextSession.rangeDurationMs);
        }
      };

      void run();
    }, timeoutMs);
  }, [advanceContinuousRangeEnd, clearContinuousBoundaryTimer, onError]);

  const setPlaybackRate = useCallback(async (rate: number) => {
    const TrackPlayer = getPlayerApi();
    if (!TrackPlayer) {
      onError(getTrackPlayerUnavailableReason() ?? 'TrackPlayer is unavailable.');
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
      onError(error instanceof Error ? error.message : String(error));
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
            if (isContinuousPlaybackEndState(nextState.state) && sessionRef.current) {
              void (async () => {
                const didContinue = await advanceContinuousRangeEnd();
                const nextSession = sessionRef.current;
                if (didContinue && nextSession) {
                  await scheduleContinuousBoundaryTimer(nextSession.rangeDurationMs);
                }
              })();
              return;
            }

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

        const queueEndedSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackQueueEnded,
          (_payload: unknown) => {
            if (!sessionRef.current) {
              return;
            }

            void (async () => {
              const didContinue = await advanceContinuousRangeEnd();
              const nextSession = sessionRef.current;
              if (didContinue && nextSession) {
                await scheduleContinuousBoundaryTimer(nextSession.rangeDurationMs);
              }
            })();
          }
        );

        const progressSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackProgressUpdated,
          (payload: unknown) => {
            const nextProgress = payload as Partial<TrackPlayerProgress>;
            if (typeof nextProgress.position !== 'number') {
              onError('Playback progress update did not include a position.');
              return;
            }

            const positionMs = Math.round(nextProgress.position * 1000);
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
              onError(nextError.message ? nextError.message : String(payload));
            })();
          }
        );

        cleanups.push(() => {
          stateSubscription.remove();
          queueEndedSubscription.remove();
          progressSubscription.remove();
          errorSubscription.remove();
        });
      })
      .catch((error) => {
        onError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      isMounted = false;
      clearContinuousBoundaryTimer();
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [
    advanceContinuousRangeEnd,
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
      const firstBoundary = nextSession.boundaries[0];
      if (!firstBoundary) {
        throw new Error('Playback session has no ayah boundaries.');
      }

      syncVisibleState(firstBoundary.verse, 1);

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
      onError(getTrackPlayerUnavailableReason() ?? 'TrackPlayer is unavailable.');
      return;
    }

    clearContinuousBoundaryTimer();
    await TrackPlayer.pause();
    setPlaybackStatus('paused');
  }, [clearContinuousBoundaryTimer, onError]);

  const resumePlayback = useCallback(async () => {
    const TrackPlayer = getPlayerApi();
    const session = sessionRef.current;
    if (!TrackPlayer) {
      onError(getTrackPlayerUnavailableReason() ?? 'TrackPlayer is unavailable.');
      return;
    }

    if (!session) {
      onError('No active playback session to resume.');
      return;
    }

    pendingPlayTransitionRef.current = true;
    await TrackPlayer.play();
    pendingPlayTransitionRef.current = false;
    await scheduleContinuousBoundaryTimer();
    setPlaybackStatus('playing');
  }, [onError, scheduleContinuousBoundaryTimer]);

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
