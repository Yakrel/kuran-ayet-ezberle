import type { NavigationAction, NavigationStateType } from './types';

export const initialNavigationState: NavigationStateType = {
  currentPage: 0,
  visibleVerseLocation: null,
};

export function navigationReducer(state: NavigationStateType, action: NavigationAction): NavigationStateType {
  switch (action.type) {
    case 'SET_PAGE':
      return {
        ...state,
        currentPage: action.page,
      };
    
    case 'SET_VISIBLE_VERSE':
      return {
        ...state,
        visibleVerseLocation: action.location,
      };
    
    case 'SET_PAGE_AND_VERSE':
      return {
        ...state,
        currentPage: action.page,
        visibleVerseLocation: action.location,
      };
    
    default:
      return state;
  }
}
