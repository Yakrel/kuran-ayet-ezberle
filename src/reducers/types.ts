import type { Verse } from '../types/quran';

export type PlaybackState = 'idle' | 'playing' | 'stopped';

export type PlaybackStateType = {
  selectedVerses: Verse[];
  currentVerseIndex: number | null;
  configuredRepeatCount: number;
  currentRepeat: number;
  activeRangeText: string;
  playbackState: PlaybackState;
};

export type PlaybackAction =
  | { type: 'START_PLAYBACK'; verses: Verse[]; repeatCount: number; rangeText: string }
  | { type: 'STOP_PLAYBACK' }
  | { type: 'SET_VERSE_INDEX'; index: number | null }
  | { type: 'SET_REPEAT'; repeat: number }
  | { type: 'SET_STATE'; state: PlaybackState }
  | { type: 'RESET' };

export type NavigationStateType = {
  currentPage: number;
  visibleVerseLocation: VerseLocation | null;
};

export type VerseLocation = {
  readonly surah_id: number;
  readonly verse_number: number;
  readonly page: number;
};

export type NavigationAction =
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_VISIBLE_VERSE'; location: VerseLocation | null }
  | { type: 'SET_PAGE_AND_VERSE'; page: number; location: VerseLocation | null };
