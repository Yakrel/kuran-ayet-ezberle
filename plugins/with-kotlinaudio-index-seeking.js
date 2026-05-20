const { withSettingsGradle } = require("expo/config-plugins");

const KOTLINAUDIO_INCLUDE = "include ':kotlinaudio'";
const KOTLINAUDIO_PROJECT_DIR =
  "project(':kotlinaudio').projectDir = new File(rootProject.projectDir, '../vendor/kotlinaudio')";

function appendKotlinAudioProject(settingsGradle) {
  const normalized = settingsGradle.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const additions = [];

  if (!lines.some((line) => line.trim() === KOTLINAUDIO_INCLUDE)) {
    additions.push(KOTLINAUDIO_INCLUDE);
  }

  if (!lines.some((line) => line.trim() === KOTLINAUDIO_PROJECT_DIR)) {
    additions.push(KOTLINAUDIO_PROJECT_DIR);
  }

  if (additions.length === 0) {
    return settingsGradle;
  }

  return `${normalized.trim()}\n\n${additions.join("\n")}\n`;
}

module.exports = function withKotlinAudioIndexSeeking(config) {
  return withSettingsGradle(config, (config) => {
    const { modResults } = config;

    if (modResults.language !== "groovy") {
      throw new Error("KotlinAudio index seeking plugin only supports Groovy settings.gradle files.");
    }

    modResults.contents = appendKotlinAudioProject(modResults.contents);
    return config;
  });
};
