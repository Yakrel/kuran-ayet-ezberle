import type { PlaybackAction, PlaybackStateType } from './types';

export const initialPlaybackState: PlaybackStateType = {
  selectedVerses: [],
  currentVerseIndex: null,
  configuredRepeatCount: 1,
  currentRepeat: 1,
  activeRangeText: '',
  playbackState: 'idle',
};

export function playbackReducer(state: PlaybackStateType, action: PlaybackAction): PlaybackStateType {
  switch (action.type) {
    case 'START_PLAYBACK':
      return {
        ...state,
        selectedVerses: action.verses,
        configuredRepeatCount: action.repeatCount,
        currentRepeat: 1,
        currentVerseIndex: 0,
        activeRangeText: action.rangeText,
        playbackState: 'playing',
      };
    
    case 'STOP_PLAYBACK':
      return {
        ...state,
        playbackState: 'stopped',
        currentVerseIndex: null,
        currentRepeat: 1,
      };
    
    case 'SET_VERSE_INDEX':
      return {
        ...state,
        currentVerseIndex: action.index,
      };
    
    case 'SET_REPEAT':
      return {
        ...state,
        currentRepeat: action.repeat,
      };
    
    case 'SET_STATE':
      return {
        ...state,
        playbackState: action.state,
      };
    
    case 'RESET':
      return initialPlaybackState;
    
    default:
      return state;
  }
}
