# Repository Rules

- Never run local builds in this repository. Do not run commands such as `expo run:*`, `npx expo prebuild`, `./gradlew`, `assemble*`, `bundle*`, or any other local build/install pipeline, because they crash the terminal and destabilize the system.
- This restriction applies to AI agents and automation. The user may still run manual Android Studio builds outside the agent session.
- CI/CD builds are allowed and should be used for verification instead of local builds.
