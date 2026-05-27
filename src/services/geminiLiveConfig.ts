import { getGeminiAuthMode } from '@/services/vertexGemini';

const DEFAULT_LIVE_MODEL = 'gemini-live-2.5-flash-preview';
const FALLBACK_LIVE_MODEL = 'gemini-2.0-flash-live-preview-04-09';

export function getGeminiLiveModel(): string {
  return (
    process.env.GEMINI_LIVE_MODEL?.trim() ||
    process.env.NEXT_PUBLIC_GEMINI_LIVE_MODEL?.trim() ||
    DEFAULT_LIVE_MODEL
  );
}

export function getGeminiLiveVoice(): string {
  return process.env.GEMINI_LIVE_VOICE?.trim() || 'Kore';
}

export function getLiveClientAuth(): {
  authType: 'ephemeral' | 'apiKey';
  apiKey?: string;
  vertexai: boolean;
  httpApiVersion?: string;
} {
  const mode = getGeminiAuthMode();
  if (mode === 'vertex-express') {
    const apiKey =
      process.env.VERTEX_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '';
    return { authType: 'apiKey', apiKey, vertexai: true };
  }
  if (mode === 'vertex-project') {
    return { authType: 'apiKey', vertexai: true };
  }
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '';
  return { authType: 'apiKey', apiKey, vertexai: false };
}

export { FALLBACK_LIVE_MODEL };
