/**
 * Speaks LLM stream incrementally by sending phrase chunks to TTS as they arrive.
 */

export type StreamingTtsPlayerOptions = {
  /** Fetch + play one phrase (e.g. Vertex Gemini TTS stream). */
  synthesize: (text: string) => Promise<void>;
  onSpeakingChange?: (speaking: boolean) => void;
  minChunkChars?: number;
  maxBufferChars?: number;
};

import { extractSpeakableChunks } from '@/utils/speakableChunks';

export { extractSpeakableChunks };

export class StreamingTtsPlayer {
  private textBuffer = '';
  private fetchPipeline: Promise<void> = Promise.resolve();
  private playPipeline: Promise<void> = Promise.resolve();
  private active = false;

  constructor(private readonly options: StreamingTtsPlayerOptions) {}

  start() {
    this.active = true;
    this.textBuffer = '';
    this.fetchPipeline = Promise.resolve();
    this.playPipeline = Promise.resolve();
    this.options.onSpeakingChange?.(true);
  }

  push(delta: string) {
    if (!this.active || !delta) return;

    this.textBuffer += delta;
    const { chunks, remaining } = extractSpeakableChunks(
      this.textBuffer,
      this.options.minChunkChars ?? 12,
      this.options.maxBufferChars ?? 72,
    );
    this.textBuffer = remaining;

    for (const chunk of chunks) {
      this.enqueue(chunk);
    }
  }

  private enqueue(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Prefetch: start the next phrase while the previous one is still playing.
    const synthPromise = this.active
      ? this.options.synthesize(trimmed)
      : Promise.resolve();

    this.fetchPipeline = this.fetchPipeline.then(async () => {
      if (!this.active) return;
      await synthPromise;
    });

    this.playPipeline = this.playPipeline.then(() => synthPromise);
  }

  async finish() {
    const tail = this.textBuffer.trim();
    this.textBuffer = '';
    if (tail) this.enqueue(tail);
    await this.fetchPipeline;
    await this.playPipeline;
    this.active = false;
    this.options.onSpeakingChange?.(false);
  }

  cancel() {
    this.active = false;
    this.textBuffer = '';
    this.fetchPipeline = Promise.resolve();
    this.playPipeline = Promise.resolve();
    this.options.onSpeakingChange?.(false);
  }
}
