import { useCallback, useEffect, useRef, useState } from 'react';
import type { Verse } from '../types/quran';
import {
  getPlaybackSnapshot,
  pauseContinuousPlayback,
  resumeContinuousPlayback,
  setContinuousPlaybackRate,
  startContinuousPlayback,
  stopContinuousPlayback,
  subscribeToPlaybackErrors,
  subscribeToPlaybackSnapshot,
  type PlaybackStatus,
  type StartPlaybackArgs,
} from '../services/continuousPlaybackController';

type UseContinuousPlayerOptions = {
  onError: (message: string | null) => void;
  onActiveVerseChange?: (verse: Verse | null) => void;
};

export type { PlaybackStatus };

export function useContinuousPlayer({ onError, onActiveVerseChange }: UseContinuousPlayerOptions) {
  const [playerState, setPlayerState] = useState(getPlaybackSnapshot);
  const notifiedActiveVerseRef = useRef<Verse | null>(null);

  useEffect(() => {
    const unsubscribeSnapshot = subscribeToPlaybackSnapshot((nextSnapshot) => {
      const previousActiveVerse = notifiedActiveVerseRef.current;
      if (
        previousActiveVerse?.surah_id !== nextSnapshot.activeVerse?.surah_id ||
        previousActiveVerse?.verse_number !== nextSnapshot.activeVerse?.verse_number
      ) {
        notifiedActiveVerseRef.current = nextSnapshot.activeVerse;
        if (
          nextSnapshot.activeVerse ||
          previousActiveVerse
        ) {
          onActiveVerseChange?.(nextSnapshot.activeVerse);
        }
      }

      setPlayerState(nextSnapshot);
    });
    const unsubscribeErrors = subscribeToPlaybackErrors(onError);

    return () => {
      unsubscribeSnapshot();
      unsubscribeErrors();
    };
  }, [onActiveVerseChange, onError]);

  const startPlayback = useCallback(async (args: StartPlaybackArgs) => {
    await startContinuousPlayback(args);
  }, []);

  const pausePlayback = useCallback(async () => {
    await pauseContinuousPlayback();
  }, []);

  const resumePlayback = useCallback(async () => {
    await resumeContinuousPlayback();
  }, []);

  const stopPlayback = useCallback(async () => {
    await stopContinuousPlayback();
  }, []);

  const setPlaybackRate = useCallback(async (rate: number) => {
    await setContinuousPlaybackRate(rate);
  }, []);

  return {
    ...playerState,
    startPlayback,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    setPlaybackRate,
  };
}
