import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTrackPlayerModule, getTrackPlayerUnavailableReason } from '../services/trackPlayer';
import { getVerseAudioForPlayback, prefetchVerseRange } from '../services/audioCache';
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

function findWordLocationAtOffset(verse: Verse | null, offsetMs: number) {
  if (!verse?.timing) {
    return null;
  }

  const absoluteTimeMs = verse.timing.time_from_ms + Math.max(0, offsetMs);
  const textWords = verse.words.filter((word) => !word.is_ayah_marker);
  const segment = verse.timing.segments.find((item) => absoluteTimeMs >= item[1] && absoluteTimeMs <= item[2]);
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

  const verseAudio = await Promise.all(
    selectedVerses.map(async (verse) => ({
      verse,
      audio: await getVerseAudioForPlayback(verse.surah_id, verse.verse_number),
    }))
  );

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

export function useSegmentedPlayer({ onError, onActiveVerseChange }: UseSegmentedPlayerOptions) {
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [currentRepeat, setCurrentRepeat] = useState(1);
  const [activeVerse, setActiveVerse] = useState<Verse | null>(null);
  const [activeWordLocation, setActiveWordLocation] = useState<string | null>(null);
  const [loadedSurahId, setLoadedSurahId] = useState<number | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(1.0);

  const sessionRef = useRef<PlaybackSession | null>(null);
  const currentTrackIndexRef = useRef(0);
  const playbackRateRef = useRef(1.0);
  const setupPromiseRef = useRef<Promise<void> | null>(null);

  const syncActiveState = useCallback((positionMs: number, activeTrackDurationMs: number) => {
    const session = sessionRef.current;
    const activeTrack = session?.tracks[currentTrackIndexRef.current] ?? null;
    const completedDurationMs = session?.tracks
      .slice(0, currentTrackIndexRef.current)
      .reduce((sum, track) => sum + track.durationMs, 0) ?? 0;
    const sessionDurationMs = session?.totalDurationMs ?? activeTrackDurationMs;

    setCurrentTimeMs(completedDurationMs + Math.max(0, positionMs));
    setDurationMs(sessionDurationMs);

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
    setActiveWordLocation(findWordLocationAtOffset(nextActiveVerse, positionMs));
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
            const progress = payload as { position?: number; duration?: number };
            syncActiveState(
              Math.max(0, Math.round((progress.position ?? 0) * 1000)),
              Math.max(0, Math.round((progress.duration ?? 0) * 1000))
            );
          }
        );

        const stateSubscription = TrackPlayer.addEventListener(
          playerModule.Event.PlaybackState,
          (payload: unknown) => {
            const nextState = payload as { state?: string };
            setPlaybackStatus(toPlaybackStatus(nextState.state));
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
              setCurrentRepeat(activeTrack.repeatIndex);
              setActiveVerse(activeTrack.verse);
              setActiveWordLocation(null);
              onActiveVerseChange?.(activeTrack.verse);
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
            setPlaybackStatus('stopped');
            setCurrentTimeMs(session.totalDurationMs);
            setDurationMs(session.totalDurationMs);
            setActiveWordLocation(null);
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
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [ensurePlayerSetup, onActiveVerseChange, onError, syncActiveState]);

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

    const { TrackPlayer } = await ensurePlayerSetup();
    const { selectedVerses, tracks, totalDurationMs } = await buildPlaybackTracks(
      surahDetail,
      startVerseNumber,
      endVerseNumber,
      repeatCount
    );

    if (tracks.length === 0) {
      throw new Error('No playable ayahs found in the selected range.');
    }

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
    setActiveWordLocation(null);
    setCurrentTimeMs(0);
    setDurationMs(totalDurationMs);
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
    setPlaybackStatus('playing');

    void prefetchVerseRange(
      selectedVerses.map((verse) => ({
        surahId: verse.surah_id,
        verseNumber: verse.verse_number,
      }))
    );
  }, [ensurePlayerSetup, onActiveVerseChange, onError]);

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
    currentTrackIndexRef.current = 0;
    setCurrentRepeat(1);
    setActiveWordLocation(null);

    if (!TrackPlayer) {
      sessionRef.current = null;
      setPlaybackStatus('stopped');
      return;
    }

    await TrackPlayer.stop().catch(() => undefined);
    await TrackPlayer.reset().catch(() => undefined);
    sessionRef.current = null;
    setPlaybackStatus('stopped');
  }, []);

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
