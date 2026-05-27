import { streamGeminiTtsPcm } from '@/services/geminiTts';
import { extractSpeakableChunks } from '@/utils/speakableChunks';
import { GEMINI_PCM_SAMPLE_RATE } from '@/utils/geminiTtsConstants';

export type TtsPcmHandler = (pcm: Uint8Array, sampleRate: number) => void;

/**
 * Queues Gemini TTS jobs in order while starting the next request as soon as
 * the previous phrase begins streaming (prefetch).
 */
export class TtsPipeline {
  private buffer = '';
  private chain: Promise<void> = Promise.resolve();
  private cancelled = false;

  constructor(private readonly onPcm: TtsPcmHandler) {}

  push(delta: string) {
    if (this.cancelled || !delta) return;

    this.buffer += delta;
    const { chunks, remaining } = extractSpeakableChunks(this.buffer, 4, 18);
    this.buffer = remaining;

    for (const text of chunks) {
      this.enqueuePhrase(text);
    }
  }

  private enqueuePhrase(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Start the async generator now so the HTTP request begins during the prior phrase.
    const pcmStream = streamGeminiTtsPcm(trimmed);

    this.chain = this.chain.then(async () => {
      if (this.cancelled) return;
      try {
        for await (const pcm of pcmStream) {
          if (this.cancelled) return;
          this.onPcm(pcm, GEMINI_PCM_SAMPLE_RATE);
        }
      } catch (err) {
        console.error('[TTS pipeline] phrase error:', err);
      }
    });
  }

  async finish() {
    const tail = this.buffer.trim();
    this.buffer = '';
    if (tail) this.enqueuePhrase(tail);
    await this.chain;
  }

  cancel() {
    this.cancelled = true;
    this.buffer = '';
    this.chain = Promise.resolve();
  }
}
