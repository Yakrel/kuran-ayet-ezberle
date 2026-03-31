import AsyncStorage from '@react-native-async-storage/async-storage';

const AUDIO_DIAGNOSTIC_KEY = '@audio_diagnostic_log';
const MAX_LOG_LINES = 150;

function toLogLine(step: string, payload?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  if (!payload) {
    return `${timestamp} ${step}`;
  }

  return `${timestamp} ${step} ${JSON.stringify(payload)}`;
}

export async function appendAudioDiagnosticLog(step: string, payload?: Record<string, unknown>): Promise<void> {
  try {
    const line = toLogLine(step, payload);
    const existing = await AsyncStorage.getItem(AUDIO_DIAGNOSTIC_KEY);
    const lines = existing ? existing.split('\n').filter(Boolean) : [];
    lines.push(line);

    const nextLines = lines.slice(-MAX_LOG_LINES);
    await AsyncStorage.setItem(AUDIO_DIAGNOSTIC_KEY, nextLines.join('\n'));
  } catch {
    // Best-effort diagnostics; avoid crashing app if storage is unavailable.
  }
}

export async function getAudioDiagnosticLog(): Promise<string> {
  return (await AsyncStorage.getItem(AUDIO_DIAGNOSTIC_KEY)) ?? '';
}

export async function clearAudioDiagnosticLog(): Promise<void> {
  await AsyncStorage.removeItem(AUDIO_DIAGNOSTIC_KEY);
}
