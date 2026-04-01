import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPreferredSurahAudioUri } from '../services/surahAudioCache';
import { getTrackPlayerModule, getTrackPlayerUnavailableReason } from '../services/trackPlayer';
import type { SurahDetail, Verse } from '../types/quran';

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped';

type PlaybackSession = {
  surahId: number;
  startVerseNumber: number;
  endVerseNumber: number;
  startTimeMs: number;
  endTimeMs: number;
  repeatCount: number;
};

type UseSegmentedPlayerOptions = {
  onError: (message: string | null) => void;
  onActiveVerseChange?: (verse: Verse | null) => void;
};

type StartPlaybackArgs = {
  surahDetail: SurahDetail;
  startVerseNumber: number;
  endVerseNumber: number;
  repeatCount: number;
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
  setRate: (rate: number) => Promise<void>;
  getProgress: () => Promise<{ position: number; duration: number; buffered: number }>;
  addEventListener: (event: unknown, listener: (payload: unknown) => void) => { remove: () => void };
};

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
    typeof candidate.setRate === 'function' &&
    typeof candidate.getProgress === 'function' &&
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

function findVerseByTime(verses: Verse[], timeMs: number) {
  return verses.find((verse) => {
    if (!verse.timing) {
      return false;
    }

    return timeMs >= verse.timing.time_from_ms && timeMs <= verse.timing.time_to_ms;
  }) ?? null;
}

function findWordLocationAtTime(verse: Verse | null, timeMs: number) {
  if (!verse?.timing) {
    return null;
  }

  const textWords = verse.words.filter((word) => !word.is_ayah_marker);
  const segment = verse.timing.segments.find((item) => timeMs >= item[1] && timeMs <= item[2]);
  if (!segment) {
    return null;
  }

  return textWords[segment[0] - 1]?.location ?? null;
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

export function useSegmentedPlayer({ onError, onActiveVerseChange }: UseSegmentedPlayerOptions) {
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [currentRepeat, setCurrentRepeat] = useState(1);
  const [activeVerse, setActiveVerse] = useState<Verse | null>(null);
  const [activeWordLocation, setActiveWordLocation] = useState<string | null>(null);
  const [loadedSurahId, setLoadedSurahId] = useState<number | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(1.0);

  const surahRef = useRef<SurahDetail | null>(null);
  const sessionRef = useRef<PlaybackSession | null>(null);
  const currentRepeatRef = useRef(1);
  const playbackRateRef = useRef(1.0);
  const setupPromiseRef = useRef<Promise<void> | null>(null);
  const loadedAudioUriRef = useRef<string | null>(null);
  const isHandlingLoopRef = useRef(false);

  const syncActiveState = useCallback((positionMs: number, durationValueMs: number) => {
    setCurrentTimeMs(positionMs);
    setDurationMs(durationValueMs);

    const currentSurah = surahRef.current;
    const nextActiveVerse = currentSurah ? findVerseByTime(currentSurah.verses, positionMs) : null;
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
    setActiveWordLocation(findWordLocationAtTime(nextActiveVerse, positionMs));
  }, [onActiveVerseChange]);

  const setPlaybackRate = useCallback(async (rate: number) => {
    const TrackPlayer = getPlayerApi();
    if (!TrackPlayer) {
      return;
    }

    try {
      await TrackPlayer.setRate(rate);
      playbackRateRef.current = rate;
      setPlaybackRateState(rate);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to set playback rate.');
    }
  }, [onError]);

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
          capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
          compactCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
          notificationCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
          progressUpdateEventInterval: 0.25,
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


  useEffect(() => {
    let isMounted = true;
    const cleanups: Array<() => void> = [];

    void ensurePlayerSetup()
      .then(({ playerModule, TrackPlayer }) => {
        if (!isMounted) {
          return;
        }

        const progressSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackProgressUpdated,
          (payload: unknown) => {
            const progress = payload as { position?: number; duration?: number; buffered?: number };
            const positionMs = Math.max(0, Math.round((progress.position ?? 0) * 1000));
            const durationValueMs = Math.max(0, Math.round((progress.duration ?? 0) * 1000));
            syncActiveState(positionMs, durationValueMs);

            const session = sessionRef.current;
            if (!session || isHandlingLoopRef.current || positionMs < Math.max(0, session.endTimeMs - 180)) {
              return;
            }

            isHandlingLoopRef.current = true;
            void (async () => {
              try {
                if (currentRepeatRef.current < session.repeatCount) {
                  currentRepeatRef.current += 1;
                  setCurrentRepeat(currentRepeatRef.current);
                  await TrackPlayer.seekTo(session.startTimeMs / 1000);
                  await TrackPlayer.play();
                  syncActiveState(session.startTimeMs, durationValueMs);
                } else {
                  await TrackPlayer.pause();
                  await TrackPlayer.seekTo(session.startTimeMs / 1000);
                  currentRepeatRef.current = 1;
                  setCurrentRepeat(1);
                  setPlaybackStatus('stopped');
                  syncActiveState(session.startTimeMs, durationValueMs);
                }
              } catch (error) {
                onError(error instanceof Error ? error.message : 'Range loop failed.');
              } finally {
                isHandlingLoopRef.current = false;
              }
            })();
          }
        );

        const stateSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackState,
          (payload: unknown) => {
            const nextState = payload as { state?: string };
            setPlaybackStatus(toPlaybackStatus(nextState.state));
          }
        );

        const queueEndedSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackQueueEnded,
          () => {
            if (sessionRef.current) {
              currentRepeatRef.current = 1;
              setCurrentRepeat(1);
              setPlaybackStatus('stopped');
            }
          }
        );

        const errorSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackError,
          (payload: unknown) => {
            const nextError = payload as { message?: string };
            onError(nextError.message ?? 'Playback failed.');
            setPlaybackStatus('stopped');
          }
        );

        cleanups.push(() => {
          progressSubscription.remove();
          stateSubscription.remove();
          queueEndedSubscription.remove();
          errorSubscription.remove();
        });
      })
      .catch((error) => {
        onError(error instanceof Error ? error.message : 'Playback setup failed.');
      });

    return () => {
      isMounted = false;
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [ensurePlayerSetup, onError, syncActiveState]);

  const loadSurahTrack = useCallback(async (surahDetail: SurahDetail) => {
    if (!surahDetail.audio) {
      throw new Error('This surah has no audio manifest.');
    }

    const { TrackPlayer } = await ensurePlayerSetup();
    const audioUri = await getPreferredSurahAudioUri(surahDetail.id, surahDetail.audio.url);

    if (loadedSurahId === surahDetail.id && loadedAudioUriRef.current === audioUri) {
      surahRef.current = surahDetail;
      return { TrackPlayer, audioUri };
    }

    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: `surah-${surahDetail.id}`,
      url: audioUri,
      title: surahDetail.name,
      artist: 'Saad Al-Ghamdi',
    });

    surahRef.current = surahDetail;
    loadedAudioUriRef.current = audioUri;
    setLoadedSurahId(surahDetail.id);

    const progress = await TrackPlayer.getProgress();
    syncActiveState(
      Math.max(0, Math.round((progress.position ?? 0) * 1000)),
      Math.max(0, Math.round((progress.duration ?? 0) * 1000))
    );

    return { TrackPlayer, audioUri };
  }, [ensurePlayerSetup, loadedSurahId, syncActiveState]);

  const startPlayback = useCallback(async ({
    surahDetail,
    startVerseNumber,
    endVerseNumber,
    repeatCount,
  }: StartPlaybackArgs) => {
    const startVerse = surahDetail.verses.find((verse) => verse.verse_number === startVerseNumber);
    const endVerse = surahDetail.verses.find((verse) => verse.verse_number === endVerseNumber);
    if (!startVerse?.timing || !endVerse?.timing) {
      throw new Error('Selected range has no timing information.');
    }

    setPlaybackStatus('loading');
    onError(null);

    const { TrackPlayer } = await loadSurahTrack(surahDetail);
    const startTimeMs = startVerse.timing.time_from_ms;
    const endTimeMs = endVerse.timing.time_to_ms;

    sessionRef.current = {
      surahId: surahDetail.id,
      startVerseNumber,
      endVerseNumber,
      startTimeMs,
      endTimeMs,
      repeatCount,
    };
    currentRepeatRef.current = 1;
    setCurrentRepeat(1);

    await TrackPlayer.seekTo(startTimeMs / 1000);
    syncActiveState(startTimeMs, durationMs);
    await TrackPlayer.play();
    setPlaybackStatus('playing');
  }, [durationMs, loadSurahTrack, onError, syncActiveState]);

  const pausePlayback = useCallback(async () => {
    const TrackPlayer = getPlayerApi();
    if (!TrackPlayer) {
      return;
    }

    await TrackPlayer.pause();
    setPlaybackStatus('paused');
  }, []);

  const resumePlayback = useCallback(async () => {
    const TrackPlayer = getPlayerApi();
    if (!TrackPlayer) {
      return;
    }

    await TrackPlayer.play();
    setPlaybackStatus('playing');
  }, []);

  const stopPlayback = useCallback(async () => {
    const TrackPlayer = getPlayerApi();
    currentRepeatRef.current = 1;
    setCurrentRepeat(1);
    sessionRef.current = null;

    if (!TrackPlayer) {
      setPlaybackStatus('stopped');
      return;
    }

    await TrackPlayer.pause().catch(() => undefined);
    setPlaybackStatus('stopped');
  }, []);

  const seekToVerse = useCallback(async (surahDetail: SurahDetail, verseNumber: number, shouldPlay = true) => {
    const verse = surahDetail.verses.find((item) => item.verse_number === verseNumber);
    if (!verse?.timing) {
      throw new Error('This verse has no timing information.');
    }

    const { TrackPlayer } = await loadSurahTrack(surahDetail);
    await TrackPlayer.seekTo(verse.timing.time_from_ms / 1000);
    syncActiveState(verse.timing.time_from_ms, durationMs);

    if (shouldPlay) {
      await TrackPlayer.play();
      setPlaybackStatus('playing');
    } else {
      await TrackPlayer.pause();
      setPlaybackStatus('paused');
    }
  }, [durationMs, loadSurahTrack, syncActiveState]);

  const state = useMemo(() => ({
    playbackStatus,
    currentTimeMs,
    durationMs,
    currentRepeat,
    activeVerse,
    activeWordLocation,
    loadedSurahId,
    playbackRate,
  }), [activeVerse, activeWordLocation, currentRepeat, currentTimeMs, durationMs, loadedSurahId, playbackStatus, playbackRate]);

  return {
    ...state,
    startPlayback,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    seekToVerse,
    setPlaybackRate,
  };
}
