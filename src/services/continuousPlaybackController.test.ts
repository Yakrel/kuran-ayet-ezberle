import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SurahDetail, Verse } from '../types/quran';

const EVENTS = {
  RemotePlay: 'remote-play',
  RemotePause: 'remote-pause',
  RemoteStop: 'remote-stop',
  PlaybackState: 'playback-state',
  PlaybackQueueEnded: 'playback-queue-ended',
  PlaybackProgressUpdated: 'playback-progress-updated',
  PlaybackError: 'playback-error',
} as const;

function makeVerse(verseNumber: number): Verse {
  return {
    surah_id: 1,
    verse_number: verseNumber,
    page: 1,
    verse: `verse ${verseNumber}`,
    transcription: `transcription ${verseNumber}`,
    translation: {
      text: `translation ${verseNumber}`,
    },
    timing: {
      time_from_ms: verseNumber * 1000,
      time_to_ms: verseNumber * 1000 + 500,
      duration_ms: 500,
    },
  };
}

function makeSurahDetail(): SurahDetail {
  return {
    id: 1,
    name: 'Al-Fatiha',
    verse_count: 7,
    audio: {
      url: 'https://example.test/001.mp3',
      duration_seconds: 100,
      size_bytes: 1024,
    },
    recitation_id: 13,
    verses: [makeVerse(1), makeVerse(2)],
  };
}

function makeTrackPlayer() {
  const listeners = new Map<string, Array<(payload: unknown) => void>>();

  const player = {
    setupPlayer: vi.fn(async () => undefined),
    updateOptions: vi.fn(async () => undefined),
    setRepeatMode: vi.fn(async () => undefined),
    reset: vi.fn(async () => undefined),
    add: vi.fn(async () => undefined),
    play: vi.fn(async () => undefined),
    pause: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    seekTo: vi.fn(async (_positionSeconds: number) => undefined),
    getProgress: vi.fn(async () => ({ position: 1, duration: 10, buffered: 10 })),
    setRate: vi.fn(async (_rate: number) => undefined),
    addEventListener: vi.fn((event: string, listener: (payload: unknown) => void) => {
      const current = listeners.get(event) ?? [];
      current.push(listener);
      listeners.set(event, current);
      return {
        remove: vi.fn(),
      };
    }),
    emit(event: string, payload: unknown) {
      for (const listener of listeners.get(event) ?? []) {
        listener(payload);
      }
    },
    listenerCount(event: string) {
      return listeners.get(event)?.length ?? 0;
    },
  };

  return player;
}

async function flushAsyncHandlers() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function loadController() {
  vi.resetModules();
  const player = makeTrackPlayer();
  const firstVerse = makeVerse(1);
  const secondVerse = makeVerse(2);

  vi.doMock('./trackPlayer', () => ({
    getTrackPlayerModule: () => ({
      default: player,
      Event: EVENTS,
      Capability: {
        Play: 'play',
        Pause: 'pause',
        Stop: 'stop',
        SeekTo: 'seek-to',
      },
      RepeatMode: {
        Off: 'off',
      },
      AppKilledPlaybackBehavior: {
        ContinuePlayback: 'continue-playback',
        StopPlaybackAndRemoveNotification: 'stop-playback-and-remove-notification',
      },
    }),
    getTrackPlayerUnavailableReason: () => null,
  }));

  vi.doMock('../utils/continuousPlaybackSession', () => ({
    buildContinuousPlaybackSession: vi.fn(async () => ({
      surahId: 1,
      startVerseNumber: 1,
      endVerseNumber: 2,
      repeatCount: 2,
      trackId: 'surah-1-continuous',
      surahAudioUrl: 'cached:https://example.test/001.mp3',
      boundaries: [
        { verse: firstVerse, startTimeMs: 1000, endTimeMs: 1500 },
        { verse: secondVerse, startTimeMs: 2000, endTimeMs: 3000 },
      ],
      rangeStartMs: 1000,
      rangeEndMs: 3000,
      rangeDurationMs: 2000,
      totalDurationMs: 4000,
    })),
  }));

  const controller = await import('./continuousPlaybackController');
  return { controller, player };
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.resetModules();
  vi.doUnmock('./trackPlayer');
  vi.doUnmock('../utils/continuousPlaybackSession');
});

describe('continuousPlaybackController', () => {
  it('registers native playback listeners once', async () => {
    const { controller, player } = await loadController();

    await controller.initializeContinuousPlayback();
    await controller.initializeContinuousPlayback();

    expect(player.listenerCount(EVENTS.PlaybackProgressUpdated)).toBe(1);
    expect(player.listenerCount(EVENTS.PlaybackQueueEnded)).toBe(1);
    expect(player.listenerCount(EVENTS.PlaybackState)).toBe(1);
    expect(player.listenerCount(EVENTS.PlaybackError)).toBe(1);
  });

  it('configures a lower-frequency progress event for background stability', async () => {
    const { controller, player } = await loadController();

    await controller.initializeContinuousPlayback();

    expect(player.updateOptions).toHaveBeenCalledWith(expect.objectContaining({
      progressUpdateEventInterval: 0.5,
    }));
  });

  it('enables a bounded Android stream cache for repeated range playback', async () => {
    const { controller, player } = await loadController();

    await controller.initializeContinuousPlayback();

    expect(player.setupPlayer).toHaveBeenCalledWith({
      maxCacheSize: 512 * 1024 * 1024,
    });
  });

  it('does not call native stop/reset when there is no active session', async () => {
    const { controller, player } = await loadController();

    await controller.stopContinuousPlayback();

    expect(player.stop).not.toHaveBeenCalled();
    expect(player.reset).not.toHaveBeenCalled();
    expect(controller.getPlaybackSnapshot().playbackStatus).toBe('stopped');
  });

  it('continues the selected range from native progress events', async () => {
    vi.useFakeTimers();
    const { controller, player } = await loadController();

    await controller.startContinuousPlayback({
      surahDetail: makeSurahDetail(),
      startVerseNumber: 1,
      endVerseNumber: 2,
      repeatCount: 2,
    });

    player.emit(EVENTS.PlaybackProgressUpdated, { position: 3, duration: 10, buffered: 10 });
    await flushAsyncHandlers();

    expect(player.seekTo).toHaveBeenNthCalledWith(1, 1);
    expect(player.seekTo).toHaveBeenNthCalledWith(2, 1);
    expect(player.play).toHaveBeenCalledTimes(2);
    expect(controller.getPlaybackSnapshot().currentRepeat).toBe(2);

    player.emit(EVENTS.PlaybackProgressUpdated, { position: 3, duration: 10, buffered: 10 });
    await flushAsyncHandlers();

    expect(player.seekTo).toHaveBeenCalledTimes(2);
    expect(player.play).toHaveBeenCalledTimes(2);
    expect(player.stop).not.toHaveBeenCalled();
    expect(controller.getPlaybackSnapshot().currentRepeat).toBe(2);

    player.emit(EVENTS.PlaybackProgressUpdated, { position: 1.1, duration: 10, buffered: 10 });
    await flushAsyncHandlers();

    player.emit(EVENTS.PlaybackProgressUpdated, { position: 3, duration: 10, buffered: 10 });
    await flushAsyncHandlers();

    expect(player.stop).toHaveBeenCalledTimes(1);
    expect(player.reset).toHaveBeenCalledTimes(2);
    expect(controller.getPlaybackSnapshot().playbackStatus).toBe('stopped');
  });

  it('does not shorten the next repeat when playback-state progress is stale after a seek', async () => {
    vi.useFakeTimers();
    const { controller, player } = await loadController();

    await controller.startContinuousPlayback({
      surahDetail: makeSurahDetail(),
      startVerseNumber: 1,
      endVerseNumber: 2,
      repeatCount: 2,
    });

    player.emit(EVENTS.PlaybackProgressUpdated, { position: 3, duration: 10, buffered: 10 });
    await flushAsyncHandlers();

    player.getProgress.mockResolvedValueOnce({ position: 3, duration: 10, buffered: 10 });
    player.emit(EVENTS.PlaybackState, { state: 'playing' });
    await flushAsyncHandlers();

    expect(player.seekTo).toHaveBeenCalledTimes(2);
    expect(player.stop).not.toHaveBeenCalled();
    expect(controller.getPlaybackSnapshot().currentRepeat).toBe(2);

    vi.advanceTimersByTime(1999);
    await flushAsyncHandlers();

    expect(player.stop).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flushAsyncHandlers();

    expect(player.stop).toHaveBeenCalledTimes(1);
    expect(controller.getPlaybackSnapshot().playbackStatus).toBe('stopped');
  });

  it('turns background progress failures into a stopped session error', async () => {
    const { controller, player } = await loadController();
    const errors: Array<string | null> = [];
    controller.subscribeToPlaybackErrors((message) => errors.push(message));

    await controller.startContinuousPlayback({
      surahDetail: makeSurahDetail(),
      startVerseNumber: 1,
      endVerseNumber: 2,
      repeatCount: 2,
    });

    player.getProgress.mockRejectedValueOnce(new Error('Native progress unavailable'));
    player.emit(EVENTS.PlaybackState, { state: 'playing' });
    await flushAsyncHandlers();

    expect(controller.getPlaybackSnapshot().playbackStatus).toBe('stopped');
    expect(controller.getPlaybackSnapshot().activeVerse).toBeNull();
    expect(errors).toContain('Native progress unavailable');
  });
});
