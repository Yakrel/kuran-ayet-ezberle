# Repository Rules

- Never run local builds in this repository. Do not run commands such as `expo run:*`, `npx expo prebuild`, `./gradlew`, `assemble*`, `bundle*`, or any other local build/install pipeline, because they crash the terminal and destabilize the system.
- CI/CD builds are allowed and should be used for verification instead of local builds.
- Do not add silent fallback behavior for core features or data sources. If the primary implementation is unavailable, surface a clear unsupported/error state instead of substituting another reciter, dataset, endpoint, or legacy path behind the scenes.

# Product Direction Notes

- The app should be designed primarily as an `ayah repeat trainer`, not as a mushaf reading app.
- The core UX should emphasize `range selection + repeat count + active repeat session`.
- The most important user action is: choose a surah, set a start ayah and end ayah, set repeat count, then start repetition.
- The UI should favor explicit ayah ranges like `100-105 repeated 20 times` over indirect controls like verse-count-first workflows.
- Verse reading should stay visible on the main screen and should get generous space by default; users should not have to open an extra section just to see the ayahs.
- The top area should stay compact. Large hero sections, oversized controls, and stacked summary panels are discouraged because they steal space from the ayahs.
- Avoid repeating the selected surah name or the same playback context across multiple panels.
- Avoid explanatory UI copy when layout and labels can communicate the state more intuitively.
- The page selector should exist, but it should be visually compact and secondary.
- The `Repeat Builder` section should not be a large standalone hero block. Range/repeat controls should be integrated into a compact playback control area.
- The `Active Session` area should be minimal and compact; if possible, session status should converge toward a smaller playback surface instead of multiple stacked playback panels.
- Avoid duplicated page/range/status information across multiple surfaces.
- Preset repeat packs are not a current priority; flexible manual range control is the main value proposition.

# Audio Cache & Playback Architecture Decisions

## Cache Layer (`AudioCacheRepository`, `AudioCachePolicy`)
- `AudioCachePolicy.isValidCachedAudio()` enforces a **50 KB minimum size** in addition to exact-size matching. This guards against accepting empty, zero-byte, or severely truncated download artifacts as valid cache entries.
- Use `AudioCacheRepository.isCached(audio)` to check cache status for UI display. This must be surfaced in the UI — cache status is **never** implicitly assumed.
- Use `AudioCacheRepository.resolvePlaybackUri(audio)` to get the playback URI. It returns the local file URI when cached, or the remote URL for network streaming when not. **The caller must display the streaming vs. cached state to the user** (via `isSelectedSurahCached` in `PracticeUiState`); this function is not a silent fallback.
- `AudioCacheRepository.downloadAll()` uses per-item `runCatching` isolation. A failure for one surah does **not** cancel remaining downloads. The result is a `DownloadAllResult(successCount, failureCount)` — partial success must be surfaced to the user.
- Downloads run as app-lifetime coroutines (`viewModelScope`). WorkManager is not required because the download UI is tightly coupled to the active session; background-only downloads are not a current use case.

## Playback Layer (`PlaybackCoordinator`)
- Position tracking is done **exclusively** by the 150 ms `positionTicker`. The `Player.Listener.onEvents` override must **not** call `updatePosition()` — this eliminates double-firing of `finishRangeRepeat()` at ayah range boundaries.
- The `playbackStateListener` is re-registered on every `start()` call via `removeListener` + `addListener`. No boolean `listenerAttached` flag should be used, as it creates stale state when the same Singleton coordinator is reused across sessions.
- `updatePosition()` uses a `handlingBoundary` boolean guard to prevent re-entrant calls from the ticker when `seekTo()` triggers `onIsPlayingChanged` mid-boundary handling.

## Speed Control
- Playback speed is controlled via discrete chip buttons (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`) displayed inline in the active session controls. This replaces the settings-sheet slider for session-time adjustments. A finer slider may be kept in Settings if desired but is not the primary control.
- Speed chips are only shown during an active or paused session, not on the idle screen.

## Download UX
- The per-surah download button (cloud icon) lives in the **header**, next to the surah selector. It must not be buried in the Settings sheet.
- The icon changes state: `CloudDownload` (not cached, idle) → `CircularProgressIndicator` (in progress) → `CheckCircle` (cached or just completed).
- `DownloadState.Done` auto-clears after **2 seconds** via a `LaunchedEffect` in `PracticeScreen`, returning the UI to `Idle`.
- Download errors go to the `error` field in `PracticeUiState` and are displayed in the `ErrorStrip` — not in a separate download-specific component.
- "Download all" (`downloadAllSurahs`) remains in the **Settings sheet** as a bulk operation. It is disabled while another download is in progress.
