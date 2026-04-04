import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTrackPlayerModule, getTrackPlayerUnavailableReason } from '../services/trackPlayer';
import { getVerseAudioForPlayback, retainVerseRangeForPlayback } from '../services/audioCache';
import type { SurahDetail, Verse } from '../types/quran';

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped';

type PlaybackSession = {
  surahId: number;
  startVerseNumber: number;
  endVerseNumber: number;
  repeatCount: number;
  tracks: VerseTrack[];
  totalDurationMs: number;
};

type VerseTrack = {
  id: string;
  verse: Verse;
  repeatIndex: number;
  durationMs: number;
  url: string;
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

type AudioCacheLease = Awaited<ReturnType<typeof retainVerseRangeForPlayback>>;

type TrackPlayerApi = {
  setupPlayer: () => Promise<void>;
  updateOptions: (options: unknown) => Promise<void>;
  setRepeatMode: (mode: unknown) => Promise<unknown>;
  reset: () => Promise<void>;
  add: (track: unknown) => Promise<unknown>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  setRate: (rate: number) => Promise<void>;
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

function getVerseDurationMs(verse: Verse) {
  return Math.max(verse.timing?.duration_ms ?? 0, 1);
}

async function buildPlaybackTracks(
  surahDetail: SurahDetail,
  startVerseNumber: number,
  endVerseNumber: number,
  repeatCount: number
) {
  const selectedVerses = surahDetail.verses.filter(
    (verse) => verse.verse_number >= startVerseNumber && verse.verse_number <= endVerseNumber
  );

  const verseAudio = await mapWithConcurrency(selectedVerses, 3, async (verse) => ({
    verse,
    audio: await getVerseAudioForPlayback(verse.surah_id, verse.verse_number),
  }));

  const tracks: VerseTrack[] = [];

  for (let repeatIndex = 1; repeatIndex <= repeatCount; repeatIndex += 1) {
    for (const item of verseAudio) {
      tracks.push({
        id: `surah-${item.verse.surah_id}-verse-${item.verse.verse_number}-repeat-${repeatIndex}`,
        verse: item.verse,
        repeatIndex,
        durationMs: getVerseDurationMs(item.verse),
        url: item.audio.uri,
      });
    }
  }

  return {
    selectedVerses,
    tracks,
    totalDurationMs: tracks.reduce((sum, track) => sum + track.durationMs, 0),
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  iteratee: (item: T, index: number) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await iteratee(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

export function useSegmentedPlayer({ onError, onActiveVerseChange }: UseSegmentedPlayerOptions) {
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [currentRepeat, setCurrentRepeat] = useState(1);
  const [activeVerse, setActiveVerse] = useState<Verse | null>(null);
  const [loadedSurahId, setLoadedSurahId] = useState<number | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(1.0);

  const sessionRef = useRef<PlaybackSession | null>(null);
  const currentTrackIndexRef = useRef(0);
  const playbackRateRef = useRef(1.0);
  const setupPromiseRef = useRef<Promise<void> | null>(null);
  const playbackLeaseRef = useRef<AudioCacheLease | null>(null);
  const playbackRequestIdRef = useRef(0);
  const pendingPlayTransitionRef = useRef(false);

  const releasePlaybackLease = useCallback(async () => {
    const lease = playbackLeaseRef.current;
    playbackLeaseRef.current = null;
    if (lease) {
      await lease.release();
    }
  }, []);

  const syncActiveState = useCallback(() => {
    const activeTrack = sessionRef.current?.tracks[currentTrackIndexRef.current] ?? null;
    const nextActiveVerse = activeTrack?.verse ?? null;
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
    setCurrentRepeat(activeTrack?.repeatIndex ?? 1);
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

        const stateSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackState,
          (payload: unknown) => {
            const nextState = payload as { state?: string };
            const nextStatus = toPlaybackStatus(nextState.state);

            if (pendingPlayTransitionRef.current && nextStatus === 'paused') {
              return;
            }

            if (nextStatus === 'playing' || nextStatus === 'stopped' || nextStatus === 'idle') {
              pendingPlayTransitionRef.current = false;
            }

            setPlaybackStatus(nextStatus);
          }
        );

        const activeTrackSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackActiveTrackChanged,
          (payload: unknown) => {
            const nextEvent = payload as { index?: number };
            const nextIndex = typeof nextEvent.index === 'number' ? nextEvent.index : 0;
            currentTrackIndexRef.current = Math.max(0, nextIndex);
            const activeTrack = sessionRef.current?.tracks[currentTrackIndexRef.current] ?? null;
            if (activeTrack) {
              syncActiveState();
            }
          }
        );

        const queueEndedSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackQueueEnded,
          () => {
            const session = sessionRef.current;
            if (!session) {
              return;
            }

            currentTrackIndexRef.current = 0;
            setCurrentRepeat(1);
            pendingPlayTransitionRef.current = false;
            setPlaybackStatus('stopped');
            sessionRef.current = null;
            void releasePlaybackLease();
          }
        );

        const errorSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackError,
          (payload: unknown) => {
            const nextError = payload as { message?: string };
            onError(nextError.message ?? 'Playback failed.');
            sessionRef.current = null;
            pendingPlayTransitionRef.current = false;
            setPlaybackStatus('stopped');
            void releasePlaybackLease();
          }
        );

        cleanups.push(() => {
          stateSubscription.remove();
          activeTrackSubscription.remove();
          queueEndedSubscription.remove();
          errorSubscription.remove();
        });
      })
      .catch((error) => {
        onError(error instanceof Error ? error.message : 'Playback setup failed.');
      });

    return () => {
      isMounted = false;
      void releasePlaybackLease();
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [ensurePlayerSetup, onActiveVerseChange, onError, releasePlaybackLease, syncActiveState]);

  const startPlayback = useCallback(async ({
    surahDetail,
    startVerseNumber,
    endVerseNumber,
    repeatCount,
  }: StartPlaybackArgs) => {
    const requestId = playbackRequestIdRef.current + 1;
    playbackRequestIdRef.current = requestId;
    const startVerse = surahDetail.verses.find((verse) => verse.verse_number === startVerseNumber);
    const endVerse = surahDetail.verses.find((verse) => verse.verse_number === endVerseNumber);
    if (!startVerse?.timing || !endVerse?.timing) {
      throw new Error('Selected range has no timing information.');
    }

    pendingPlayTransitionRef.current = true;
    setPlaybackStatus('loading');
    onError(null);

    const selectedVerses = surahDetail.verses.filter(
      (verse) => verse.verse_number >= startVerseNumber && verse.verse_number <= endVerseNumber
    );
    const nextLease = await retainVerseRangeForPlayback(
      selectedVerses.map((verse) => ({
        surahId: verse.surah_id,
        verseNumber: verse.verse_number,
      }))
    );

    try {
      const { TrackPlayer } = await ensurePlayerSetup();
      const { tracks, totalDurationMs } = await buildPlaybackTracks(
        surahDetail,
        startVerseNumber,
        endVerseNumber,
        repeatCount
      );

      if (requestId !== playbackRequestIdRef.current) {
        pendingPlayTransitionRef.current = false;
        await nextLease.release();
        if (playbackLeaseRef.current === nextLease) {
          playbackLeaseRef.current = null;
        }
        return;
      }

      if (tracks.length === 0) {
        throw new Error('No playable ayahs found in the selected range.');
      }

      await releasePlaybackLease();
      playbackLeaseRef.current = nextLease;

      sessionRef.current = {
        surahId: surahDetail.id,
        startVerseNumber,
        endVerseNumber,
        repeatCount,
        tracks,
        totalDurationMs,
      };
      currentTrackIndexRef.current = 0;
      setLoadedSurahId(surahDetail.id);
      setCurrentRepeat(1);
      setActiveVerse(tracks[0].verse);
      onActiveVerseChange?.(tracks[0].verse);

      await TrackPlayer.reset();
      await TrackPlayer.add(
        tracks.map((track) => ({
          id: track.id,
          url: track.url,
          title: `${surahDetail.name} ${track.verse.verse_number}`,
          artist: 'Saad Al-Ghamdi',
        }))
      );
      await TrackPlayer.play();

      if (requestId === playbackRequestIdRef.current) {
        pendingPlayTransitionRef.current = false;
        setPlaybackStatus('playing');
      }
    } catch (error) {
      pendingPlayTransitionRef.current = false;
      if (playbackLeaseRef.current === nextLease) {
        await releasePlaybackLease();
      } else {
        await nextLease.release();
      }
      sessionRef.current = null;
      setPlaybackStatus('stopped');
      throw error;
    }
  }, [ensurePlayerSetup, onActiveVerseChange, onError, releasePlaybackLease]);

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

    pendingPlayTransitionRef.current = true;
    await TrackPlayer.play();
    pendingPlayTransitionRef.current = false;
    setPlaybackStatus('playing');
  }, []);

  const stopPlayback = useCallback(async () => {
    const TrackPlayer = getPlayerApi();
    playbackRequestIdRef.current += 1;
    pendingPlayTransitionRef.current = false;
    currentTrackIndexRef.current = 0;
    setCurrentRepeat(1);

    if (!TrackPlayer) {
      sessionRef.current = null;
      await releasePlaybackLease();
      setPlaybackStatus('stopped');
      return;
    }

    await TrackPlayer.stop().catch(() => undefined);
    await TrackPlayer.reset().catch(() => undefined);
    sessionRef.current = null;
    await releasePlaybackLease();
    setPlaybackStatus('stopped');
  }, [releasePlaybackLease]);

  const seekToVerse = useCallback(async (surahDetail: SurahDetail, verseNumber: number, shouldPlay = true) => {
    await startPlayback({
      surahDetail,
      startVerseNumber: verseNumber,
      endVerseNumber: verseNumber,
      repeatCount: 1,
    });

    if (!shouldPlay) {
      await pausePlayback();
    }
  }, [pausePlayback, startPlayback]);

  const state = useMemo(() => ({
    playbackStatus,
    currentRepeat,
    activeVerse,
    loadedSurahId,
    playbackRate,
  }), [activeVerse, currentRepeat, loadedSurahId, playbackStatus, playbackRate]);

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
