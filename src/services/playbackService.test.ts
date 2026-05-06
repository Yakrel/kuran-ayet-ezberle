import { afterEach, describe, expect, it, vi } from 'vitest';

const EVENTS = {
  RemotePlay: 'remote-play',
  RemotePause: 'remote-pause',
  RemoteStop: 'remote-stop',
} as const;

function makeTrackPlayer() {
  const listeners = new Map<string, Array<() => void>>();

  return {
    setupPlayer: vi.fn(async () => undefined),
    addEventListener: vi.fn((event: string, listener: () => void) => {
      const current = listeners.get(event) ?? [];
      current.push(listener);
      listeners.set(event, current);
      return {
        remove: vi.fn(),
      };
    }),
    emit(event: string) {
      for (const listener of listeners.get(event) ?? []) {
        listener();
      }
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.doUnmock('./trackPlayer');
  vi.doUnmock('./continuousPlaybackController');
});

describe('playbackService', () => {
  it('registers remote controls without setting up the player in the background service', async () => {
    const player = makeTrackPlayer();
    const resumeContinuousPlayback = vi.fn(async () => undefined);
    const pauseContinuousPlayback = vi.fn(async () => undefined);
    const stopContinuousPlayback = vi.fn(async () => undefined);

    vi.doMock('./trackPlayer', () => ({
      getTrackPlayerModule: () => ({
        default: player,
        Event: EVENTS,
      }),
    }));
    vi.doMock('./continuousPlaybackController', () => ({
      pauseContinuousPlayback,
      resumeContinuousPlayback,
      stopContinuousPlayback,
    }));

    const { playbackService } = await import('./playbackService');

    await playbackService();

    expect(player.setupPlayer).not.toHaveBeenCalled();

    player.emit(EVENTS.RemotePlay);
    player.emit(EVENTS.RemotePause);
    player.emit(EVENTS.RemoteStop);

    expect(resumeContinuousPlayback).toHaveBeenCalledTimes(1);
    expect(pauseContinuousPlayback).toHaveBeenCalledTimes(1);
    expect(stopContinuousPlayback).toHaveBeenCalledTimes(1);
  });
});
