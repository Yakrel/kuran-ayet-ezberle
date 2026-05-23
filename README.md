# Kur'an - Ayet Ezberle

Native Android ayah repeat trainer for Quran memorization.

The app is intentionally centered on the core practice flow: choose a surah, set a start ayah and end ayah, set repeat count, then start an active repetition session. Verse text stays visible on the main screen.

## Stack

- Kotlin
- Jetpack Compose and Material 3
- Media3/ExoPlayer
- Room
- DataStore Preferences
- Hilt
- Coroutines/Flow

## Data and Playback Policy

Bundled Quran text and Saad Al-Ghamdi timing/audio metadata live in `android/app/src/main/assets/data`. Missing translation, timing, or audio metadata is treated as unsupported data and surfaces an error; the app does not silently switch to another reciter, dataset, endpoint, or legacy playback path.

External media play commands are accepted only when an active session was paused by the user. Idle, stopped, completed, and error states do not start playback from lock screen, headset, or remote controls.

## Verification

Do not run local builds in this repository. Use GitHub Actions for Gradle unit tests, lint, and APK artifacts.
