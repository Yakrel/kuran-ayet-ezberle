import { DEFAULT_RECITER_ID, getReciterOption } from '../constants/reciters';
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
import { getTrackPlayerModule, getTrackPlayerUnavailableReason } from './trackPlayer';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped';

export type PlaybackSnapshot = {
  playbackStatus: PlaybackStatus;
  currentRepeat: number;
  activeVerse: Verse | null;
  playbackRate: number;
};

export type StartPlaybackArgs = {
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

type SnapshotListener = (snapshot: PlaybackSnapshot) => void;
type ErrorListener = (message: string | null) => void;

let snapshot: PlaybackSnapshot = {
  playbackStatus: 'idle',
  currentRepeat: 1,
  activeVerse: null,
  playbackRate: 1.0,
};

let session: PlaybackSession | null = null;
let setupPromise: Promise<void> | null = null;
let listenersReadyPromise: Promise<void> | null = null;
let boundaryTimer: ReturnType<typeof setTimeout> | null = null;
let playbackRequestId = 0;
let continuousVerseIndex = 0;
let pendingPlayTransition = false;
let continuousTransitionInFlight = false;

const snapshotListeners = new Set<SnapshotListener>();
const errorListeners = new Set<ErrorListener>();

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

function notifySnapshot() {
  for (const listener of snapshotListeners) {
    listener(snapshot);
  }
}

function setSnapshot(nextSnapshot: Partial<PlaybackSnapshot>) {
  snapshot = {
    ...snapshot,
    ...nextSnapshot,
  };
  notifySnapshot();
}

function notifyError(message: string | null) {
  for (const listener of errorListeners) {
    listener(message);
  }
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

function clearBoundaryTimer() {
  if (boundaryTimer) {
    clearTimeout(boundaryTimer);
    boundaryTimer = null;
  }
}

function syncVisibleState(nextActiveVerse: Verse | null, repeatIndex: number) {
  setSnapshot({
    currentRepeat: repeatIndex,
    activeVerse: nextActiveVerse,
  });
}

function syncContinuousActiveState(positionMs: number) {
  if (!session) {
    return;
  }

  const nextVerseIndex = resolveContinuousVerseIndex(session.boundaries, positionMs);
  if (continuousVerseIndex === nextVerseIndex) {
    return;
  }

  continuousVerseIndex = nextVerseIndex;
  const nextBoundary = session.boundaries[nextVerseIndex];
  if (!nextBoundary) {
    throw new Error(`Playback boundary ${nextVerseIndex} is missing.`);
  }

  syncVisibleState(nextBoundary.verse, snapshot.currentRepeat);
}

async function continueFromRangeEndIfNeeded(positionMs: number) {
  const currentSession = session;
  if (!currentSession || positionMs < currentSession.rangeEndMs) {
    return;
  }

  const didContinue = await advanceContinuousRangeEnd();
  if (didContinue && session) {
    await scheduleBoundaryTimer(session.rangeDurationMs);
  }
}

async function ensurePlayerSetup() {
  const playerModule = getTrackPlayerModule();
  const TrackPlayer = getPlayerApi();
  if (!playerModule || !TrackPlayer) {
    const reason = getTrackPlayerUnavailableReason() ?? 'TrackPlayer is unavailable.';
    notifyError(reason);
    throw new Error(reason);
  }

  if (!setupPromise) {
    const { Capability, RepeatMode } = playerModule;
    setupPromise = (async () => {
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
          appKilledPlaybackBehavior: playerModule.AppKilledPlaybackBehavior.ContinuePlayback,
        },
        progressUpdateEventInterval: 0.1,
      });
      await TrackPlayer.setRepeatMode(RepeatMode.Off);
      await TrackPlayer.setRate(snapshot.playbackRate);
    })().catch((error) => {
      setupPromise = null;
      throw error;
    });
  }

  await setupPromise;
  return { playerModule, TrackPlayer };
}

async function completeActiveSession(resetPlayer = true) {
  clearBoundaryTimer();
  continuousTransitionInFlight = false;
  continuousVerseIndex = 0;
  pendingPlayTransition = false;
  setSnapshot({
    currentRepeat: 1,
    activeVerse: null,
  });

  const TrackPlayer = getPlayerApi();
  if (resetPlayer && TrackPlayer) {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
  }

  session = null;
}

async function advanceContinuousRangeEnd() {
  if (continuousTransitionInFlight) {
    return false;
  }

  const currentSession = session;
  const currentPlayer = getPlayerApi();
  if (!currentSession || !currentPlayer) {
    return false;
  }

  continuousTransitionInFlight = true;
  clearBoundaryTimer();

  try {
    const repeatStep = resolveContinuousRepeatStep(snapshot.currentRepeat, currentSession.repeatCount);
    if (repeatStep.action === 'repeat') {
      continuousVerseIndex = 0;
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
    setSnapshot({ playbackStatus: 'stopped' });
    return false;
  } catch (error) {
    await completeActiveSession();
    setSnapshot({ playbackStatus: 'stopped' });
    notifyError(error instanceof Error ? error.message : String(error));
    return false;
  } finally {
    continuousTransitionInFlight = false;
  }
}

async function scheduleBoundaryTimer(remainingMs?: number) {
  if (!session) {
    return;
  }

  clearBoundaryTimer();

  const TrackPlayer = getPlayerApi();
  if (!TrackPlayer) {
    notifyError(getTrackPlayerUnavailableReason() ?? 'TrackPlayer is unavailable.');
    return;
  }

  let nextRemainingMs = remainingMs;
  if (nextRemainingMs === undefined) {
    const progress = await TrackPlayer.getProgress();
    const positionMs = Math.round(progress.position * 1000);
    nextRemainingMs = Math.max(session.rangeEndMs - positionMs, 0);
  }

  const playbackRateValue = Math.max(snapshot.playbackRate, 0.1);
  const timeoutMs = Math.max(Math.ceil(nextRemainingMs / playbackRateValue), 0);

  boundaryTimer = setTimeout(() => {
    const run = async () => {
      const didContinue = await advanceContinuousRangeEnd();
      if (didContinue && session) {
        await scheduleBoundaryTimer(session.rangeDurationMs);
      }
    };

    void run();
  }, timeoutMs);
}

export function getPlaybackSnapshot() {
  return snapshot;
}

export function subscribeToPlaybackSnapshot(listener: SnapshotListener) {
  snapshotListeners.add(listener);
  listener(snapshot);

  return () => {
    snapshotListeners.delete(listener);
  };
}

export function subscribeToPlaybackErrors(listener: ErrorListener) {
  errorListeners.add(listener);

  return () => {
    errorListeners.delete(listener);
  };
}

export async function initializeContinuousPlayback() {
  if (listenersReadyPromise) {
    return listenersReadyPromise;
  }

  listenersReadyPromise = ensurePlayerSetup()
    .then(({ playerModule, TrackPlayer }) => {
      TrackPlayer.addEventListener(playerModule.Event.PlaybackState, (payload: unknown) => {
        const nextState = payload as { state?: string };
        if (isContinuousPlaybackEndState(nextState.state) && session) {
          void (async () => {
            const didContinue = await advanceContinuousRangeEnd();
            if (didContinue && session) {
              await scheduleBoundaryTimer(session.rangeDurationMs);
            }
          })();
          return;
        }

        const nextStatus = toPlaybackStatus(nextState.state);

        if (pendingPlayTransition && nextStatus === 'paused') {
          return;
        }

        if (nextStatus === 'playing') {
          void scheduleBoundaryTimer();
        }

        if (nextStatus === 'paused' || nextStatus === 'stopped' || nextStatus === 'idle') {
          clearBoundaryTimer();
        }

        if (nextStatus === 'playing' || nextStatus === 'stopped' || nextStatus === 'idle') {
          pendingPlayTransition = false;
        }

        setSnapshot({ playbackStatus: nextStatus });
      });

      TrackPlayer.addEventListener(playerModule.Event.PlaybackQueueEnded, (_payload: unknown) => {
        if (!session) {
          return;
        }

        void (async () => {
          const didContinue = await advanceContinuousRangeEnd();
          if (didContinue && session) {
            await scheduleBoundaryTimer(session.rangeDurationMs);
          }
        })();
      });

      TrackPlayer.addEventListener(playerModule.Event.PlaybackProgressUpdated, (payload: unknown) => {
        const nextProgress = payload as Partial<TrackPlayerProgress>;
        if (typeof nextProgress.position !== 'number') {
          notifyError('Playback progress update did not include a position.');
          return;
        }

        const positionMs = Math.round(nextProgress.position * 1000);
        syncContinuousActiveState(positionMs);
        void continueFromRangeEndIfNeeded(positionMs);
      });

      TrackPlayer.addEventListener(playerModule.Event.PlaybackError, (payload: unknown) => {
        const nextError = payload as { message?: string };

        void (async () => {
          await completeActiveSession(false);
          setSnapshot({ playbackStatus: 'stopped' });
          notifyError(nextError.message ? nextError.message : String(payload));
        })();
      });
    })
    .catch((error) => {
      listenersReadyPromise = null;
      notifyError(error instanceof Error ? error.message : String(error));
      throw error;
    });

  return listenersReadyPromise;
}

export async function startContinuousPlayback({
  surahDetail,
  startVerseNumber,
  endVerseNumber,
  repeatCount,
}: StartPlaybackArgs) {
  const requestId = playbackRequestId + 1;
  playbackRequestId = requestId;

  pendingPlayTransition = true;
  setSnapshot({ playbackStatus: 'loading' });
  notifyError(null);
  clearBoundaryTimer();

  try {
    const { TrackPlayer } = await ensurePlayerSetup();
    await initializeContinuousPlayback();
    const reciter = getReciterOption(DEFAULT_RECITER_ID);
    const nextSession = await buildContinuousPlaybackSession(
      surahDetail,
      startVerseNumber,
      endVerseNumber,
      repeatCount
    );

    if (requestId !== playbackRequestId) {
      pendingPlayTransition = false;
      return;
    }

    await completeActiveSession();
    if (requestId !== playbackRequestId) {
      pendingPlayTransition = false;
      return;
    }

    session = nextSession;
    continuousVerseIndex = 0;
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
    await scheduleBoundaryTimer(nextSession.rangeDurationMs);

    if (requestId === playbackRequestId) {
      pendingPlayTransition = false;
      setSnapshot({ playbackStatus: 'playing' });
    }
  } catch (error) {
    pendingPlayTransition = false;
    await completeActiveSession();
    setSnapshot({ playbackStatus: 'stopped' });
    throw error;
  }
}

export async function pauseContinuousPlayback() {
  const TrackPlayer = getPlayerApi();
  if (!TrackPlayer) {
    notifyError(getTrackPlayerUnavailableReason() ?? 'TrackPlayer is unavailable.');
    return;
  }

  clearBoundaryTimer();
  await TrackPlayer.pause();
  setSnapshot({ playbackStatus: 'paused' });
}

export async function resumeContinuousPlayback() {
  const TrackPlayer = getPlayerApi();
  if (!TrackPlayer) {
    notifyError(getTrackPlayerUnavailableReason() ?? 'TrackPlayer is unavailable.');
    return;
  }

  if (!session) {
    notifyError('No active playback session to resume.');
    return;
  }

  pendingPlayTransition = true;
  await TrackPlayer.play();
  pendingPlayTransition = false;
  await scheduleBoundaryTimer();
  setSnapshot({ playbackStatus: 'playing' });
}

export async function stopContinuousPlayback() {
  playbackRequestId += 1;
  await completeActiveSession();
  setSnapshot({ playbackStatus: 'stopped' });
}

export async function setContinuousPlaybackRate(rate: number) {
  const TrackPlayer = getPlayerApi();
  if (!TrackPlayer) {
    notifyError(getTrackPlayerUnavailableReason() ?? 'TrackPlayer is unavailable.');
    return;
  }

  try {
    await TrackPlayer.setRate(rate);
    setSnapshot({ playbackRate: rate });

    if (session && snapshot.playbackStatus === 'playing') {
      await scheduleBoundaryTimer();
    }
  } catch (error) {
    notifyError(error instanceof Error ? error.message : String(error));
  }
}
