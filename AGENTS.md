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
