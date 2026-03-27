# Implementation Plan: Redesign for Memorization Focus

## Objective
Transform the app from a basic Quran reader into a professional-grade memorization assistant. This involves a complete UI overhaul to reduce clutter, improving typography (Uthmani font), adding professional icons, and implementing specialized memorization features (Focus Mode, Ghost Mode).

## Key Files & Context
- `App.tsx`: Main layout and state coordination.
- `src/components/VerseList.tsx` & `src/components/VerseCard.tsx`: Core content display.
- `src/components/StatusDisplay.tsx` & `src/components/PlaybackControls.tsx`: Control UI to be refactored into a floating bar/bottom sheet.
- `src/styles/theme.ts`: Visual tokens (colors, shadows, fonts).
- `src/hooks/useAudioPlayer.ts`: To be integrated with visual focus effects.

## Implementation Steps

### 1. Visual Infrastructure & Assets
- **Professional Icons**: Install `@expo/vector-icons` and replace all emojis (⚙️, ◀, ▶) with vector icons (e.g., `MaterialCommunityIcons` or `Feather`).
- **Uthmani Font**: Download and integrate a professional Quranic font (e.g., `Amiri` or `Scheherazade New`) for Arabic text.
- **Theme Refresh**: Update `theme.ts` with smoother shadows, a refined color palette (subtle greens/golds), and more generous spacing.

### 2. UI Refactoring: From Dashboard to Immersive Content
- **The "Floating Player Bar"**: Create a sticky bottom bar for active playback (Start/Stop, Progress, Current Verse).
- **The "Settings Bottom Sheet"**: Move complex configuration (Surah picker, Translation choice, Range settings) into an expandable bottom drawer.
- **Clean Header**: Replace the heavy top bar with a minimal, elegant header showing only the current Surah name and Page number.

### 3. Specialized Memorization Features
- **Focus Mode**: When a verse is playing, use a conditional style to "dim" (reduce opacity) all other verses and "highlight" (glow or border) the current one.
- **Ghost Mode (Incremental Opacity)**: Add an optional setting where the Arabic text's opacity decreases with each repeat cycle, forcing the user to rely on memory.
- **Auto-Scroll to Verse**: Ensure the list smoothly scrolls to keep the active verse centered during playback.

### 4. Component Polish
- **VerseCard Refinement**: Use better line-height, larger Arabic text, and a more subtle translation display.
- **Feedback Animations**: Use `LayoutAnimation` or simple `Animated` transitions when the player bar appears or verses change status.

## Verification & Testing
- **Visual Audit**: Verify the new font loads correctly on Android/iOS.
- **Performance**: Ensure `FlatList` remains smooth with the new highlight/dimming effects.
- **Functional Check**: Test that "Ghost Mode" correctly calculates opacity based on `currentRepeat / configuredRepeatCount`.
- **Navigation**: Ensure the floating bar and bottom sheet don't overlap with important content or the OS navigation bar.
