import type { GenerateContentResponse } from '@google/genai';
import { getGenAIClient, validateVertexConfig } from '@/services/vertexGemini';
import { pcmToWav } from '@/utils/pcmToWav';
import { GEMINI_PCM_SAMPLE_RATE } from '@/utils/geminiTtsConstants';

export { GEMINI_PCM_SAMPLE_RATE };

const DEFAULT_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const DEFAULT_VOICE = 'Kore';

export function getGeminiTtsModel(): string {
  return process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
}

export function getGeminiTtsVoice(): string {
  return process.env.GEMINI_TTS_VOICE?.trim() || DEFAULT_VOICE;
}

function getTtsConfig() {
  return {
    responseModalities: ['AUDIO'],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: getGeminiTtsVoice(),
        },
      },
    },
  };
}

function partToBuffer(data: string | Uint8Array): Buffer {
  if (typeof data === 'string') return Buffer.from(data, 'base64');
  return Buffer.from(data);
}

export function extractPcmFromResponse(response: GenerateContentResponse): Buffer {
  const chunks: Buffer[] = [];

  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const raw = part.inlineData?.data;
      if (!raw) continue;
      chunks.push(partToBuffer(raw));
    }
  }

  if (!chunks.length) {
    throw new Error('Gemini TTS returned no audio data');
  }

  return Buffer.concat(chunks);
}

/** Single-shot synthesis → WAV bytes (24 kHz mono PCM in container). */
export async function synthesizeGeminiTtsWav(text: string): Promise<Buffer> {
  const auth = validateVertexConfig();
  if (!auth.ok) throw new Error(auth.error);

  const client = getGenAIClient();
  const response = await client.models.generateContent({
    model: getGeminiTtsModel(),
    contents: text,
    config: getTtsConfig(),
  });

  const pcm = extractPcmFromResponse(response);
  return Buffer.from(pcmToWav(pcm));
}

/** Stream PCM chunks as they arrive from Vertex Gemini TTS. */
export async function* streamGeminiTtsPcm(
  text: string,
): AsyncGenerator<Uint8Array, void, unknown> {
  const auth = validateVertexConfig();
  if (!auth.ok) throw new Error(auth.error);

  const client = getGenAIClient();
  const stream = await client.models.generateContentStream({
    model: getGeminiTtsModel(),
    contents: text,
    config: getTtsConfig(),
  });

  for await (const chunk of stream) {
    for (const candidate of chunk.candidates ?? []) {
      for (const part of candidate.content?.parts ?? []) {
        const raw = part.inlineData?.data;
        if (!raw) continue;
        yield new Uint8Array(partToBuffer(raw));
      }
    }
  }
}
