# Android Device Acceptance

Use CI-generated APK artifacts for device checks. Do not run local Gradle, Expo, prebuild, install, assemble, or bundle commands from this repository.

## Checks

1. Install the CI debug or release APK on a physical Android device.
2. Start a session for a clear range such as `Bakara 100-105`, repeat count `3`.
3. Confirm only that selected ayah range repeats and the active ayah highlight advances with audio timing.
4. Press Pause, lock the screen, then press headset or lock-screen Play. Playback may resume only from this paused-by-user state.
5. Press Stop, complete a session, and force close from recents. Lock-screen/headset Play must not start a new session.
6. Deny notification permission on Android 13+. Starting background-capable playback should show an explicit unsupported/error state.
7. Download one surah, enable airplane mode, and confirm that cached playback works for that surah.
8. Clear cache, keep airplane mode enabled, and confirm playback fails clearly without switching reciter or source.

Useful log filters:

```bash
adb logcat MediaSessionService:D ExoPlayer:D AndroidRuntime:E *:S
```
