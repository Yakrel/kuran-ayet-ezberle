import { useCallback, useEffect, useRef } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS, type AVPlaybackStatus } from 'expo-av';
import * as KeepAwake from 'expo-keep-awake';
import { getOrDownloadVerseAudio } from '../services/audioCache';
import type { Verse } from '../types/quran';

type UseAudioPlayerReturn = {
  soundRef: React.MutableRefObject<Audio.Sound | null>;
  playSingleVerse: (verse: Verse, sessionToken: number) => Promise<void>;
  preloadVerse: (verse: Verse) => Promise<void>;
  stopPlayback: () => Promise<void>;
  unloadCurrentSound: () => Promise<void>;
  playbackTokenRef: React.MutableRefObject<number>;
};

export function useAudioPlayer(
  setErrorMessage: (error: string | null) => void,
  setIsPreparingAudio: (preparing: boolean) => void,
  stoppingAudioError: string,
  playbackError: string,
  audioModeError: string
): UseAudioPlayerReturn {
  const soundRef = useRef<Audio.Sound | null>(null);
  const preloadedSoundRef = useRef<{ sound: Audio.Sound; verseKey: string } | null>(null);
  const playbackTokenRef = useRef(0);
  const pendingVerseResolveRef = useRef<(() => void) | null>(null);

  const resolvePendingVerse = () => {
    pendingVerseResolveRef.current?.();
    pendingVerseResolveRef.current = null;
  };

  const unloadSound = async (sound: Audio.Sound | null) => {
    if (!sound) {
      return;
    }

    try {
      sound.setOnPlaybackStatusUpdate(null);
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
    } catch {
      // Ignore cleanup errors during interruption or teardown.
    }
  };

  const stopPlayback = useCallback(async (): Promise<void> => {
    playbackTokenRef.current += 1;
    resolvePendingVerse();

    try {
      const current = soundRef.current;
      soundRef.current = null;

      const preloaded = preloadedSoundRef.current?.sound;
      preloadedSoundRef.current = null;

      await Promise.all([
        unloadSound(current),
        unloadSound(preloaded ?? null),
      ]);

      await KeepAwake.deactivateKeepAwake();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : stoppingAudioError);
    }

    setIsPreparingAudio(false);
  }, [setErrorMessage, setIsPreparingAudio, stoppingAudioError]);

  const preloadVerse = useCallback(async (verse: Verse): Promise<void> => {
    const verseKey = `${verse.surah_id}:${verse.verse_number}`;
    if (preloadedSoundRef.current?.verseKey === verseKey) {
      return;
    }

    try {
      const audioUri = await getOrDownloadVerseAudio(verse.surah_id, verse.verse_number);
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri: audioUri }, { shouldPlay: false });

      const oldPreloaded = preloadedSoundRef.current?.sound;
      preloadedSoundRef.current = { sound, verseKey };
      if (oldPreloaded) {
        void unloadSound(oldPreloaded);
      }
    } catch {
      // Preloading is opportunistic; playback can still continue without it.
    }
  }, []);

  const waitForVerseToFinish = useCallback(
    async (sound: Audio.Sound, sessionToken: number): Promise<void> =>
      new Promise<void>((resolve) => {
        pendingVerseResolveRef.current = resolve;
        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (sessionToken !== playbackTokenRef.current) {
            sound.setOnPlaybackStatusUpdate(null);
            resolvePendingVerse();
            return;
          }

          if (status.isLoaded && status.didJustFinish) {
            sound.setOnPlaybackStatusUpdate(null);
            resolvePendingVerse();
          }
        });
      }),
    []
  );

  const playSingleVerse = useCallback(
    async (verse: Verse, sessionToken: number): Promise<void> => {
      const verseKey = `${verse.surah_id}:${verse.verse_number}`;
      KeepAwake.activateKeepAwake();

      try {
        let nextSound: Audio.Sound;

        if (preloadedSoundRef.current?.verseKey === verseKey) {
          nextSound = preloadedSoundRef.current.sound;
          preloadedSoundRef.current = null;
        } else {
          setIsPreparingAudio(true);
          const audioUri = await getOrDownloadVerseAudio(verse.surah_id, verse.verse_number);
          if (sessionToken !== playbackTokenRef.current) {
            return;
          }

          nextSound = new Audio.Sound();
          await nextSound.loadAsync({ uri: audioUri }, { shouldPlay: false });
        }

        if (sessionToken !== playbackTokenRef.current) {
          void unloadSound(nextSound);
          return;
        }

        const previousSound = soundRef.current;
        soundRef.current = nextSound;
        setIsPreparingAudio(false);

        await nextSound.playAsync();

        if (previousSound) {
          void unloadSound(previousSound);
        }

        await waitForVerseToFinish(nextSound, sessionToken);
      } catch (error) {
        setIsPreparingAudio(false);
        setErrorMessage(error instanceof Error ? error.message : playbackError);
        void stopPlayback();
      }
    },
    [playbackError, setErrorMessage, setIsPreparingAudio, stopPlayback, waitForVerseToFinish]
  );

  useEffect(() => {
    let isMounted = true;

    void Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch((error) => {
      if (isMounted) {
        setErrorMessage(error instanceof Error ? error.message : audioModeError);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [audioModeError, setErrorMessage]);

  return {
    soundRef,
    playSingleVerse,
    preloadVerse,
    stopPlayback,
    unloadCurrentSound: () => unloadSound(soundRef.current),
    playbackTokenRef,
  };
}
