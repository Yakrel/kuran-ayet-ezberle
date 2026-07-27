# Kur'an - Ayet Ezberle

Native Android ayah repeat trainer for Quran memorization. The first official app release is `v0.0.1`.

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

External media play commands are accepted only when an active session was paused by the user. Idle, stopped, completed, and error states do not start playback from lock screen, headset, or remote controls. Full-surah repeat boundaries are scheduled on ExoPlayer's playback timeline, so screen-off UI throttling cannot delay or skip repetitions.

## Releases and Updates

The manually triggered `Release Android App` GitHub Actions workflow builds the signed APK with the repository's existing Android signing secrets. Versions use semantic `x.y.z` input and Android `versionCode` is calculated automatically.

The app checks the public `app-update` release channel at startup. When a newer version is available, it can download the release APK, verify its SHA-256 digest, and open Android's installer. Android still requires user confirmation and may require enabling installs from this app once. Never replace the release signing key after publishing `v0.0.1`; Android accepts updates only when their signing certificate matches the installed app.

Audio downloads use a four-connection bounded queue, retain partial files for HTTP Range resume, verify completed file sizes, and reserve free storage before writing. The all-surahs operation runs as unique foreground WorkManager work, so it continues independently of the screen/ViewModel and resumes cached or partial files after process recreation.

## Verification

Do not run local builds in this repository. Use GitHub Actions for Gradle unit tests, lint, and APK artifacts.
