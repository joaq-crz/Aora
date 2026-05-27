import {
  GoogleGenAI,
  Modality,
  type LiveConnectConfig,
  type LiveSendRealtimeInputParameters,
  type LiveServerMessage,
  type Session,
} from '@google/genai';
import {
  base64ToPcm,
  pcmToLiveAudioBlob,
  startMicStreamer,
  type MicStreamer,
} from '@/utils/geminiLiveAudio';
import { GEMINI_PCM_SAMPLE_RATE } from '@/utils/geminiTtsConstants';

export type LiveBootstrap = {
  authType: 'ephemeral' | 'apiKey';
  token?: string;
  apiKey?: string;
  vertexai?: boolean;
  model: string;
  fallbackModel?: string;
  systemInstruction?: string;
  liveConfig?: LiveConnectConfig;
  voice?: string;
};

export type GeminiLiveCallbacks = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (message: string) => void;
  onUserTranscript?: (text: string, finished: boolean) => void;
  onAssistantTranscript?: (text: string, finished: boolean) => void;
  onAssistantPcm?: (pcm: Uint8Array, sampleRate: number) => void;
  onSpeakingChange?: (speaking: boolean) => void;
};

export class GeminiLiveSession {
  private session: Session | null = null;
  private micStreamer: MicStreamer | null = null;
  private visionTimer: ReturnType<typeof setInterval> | null = null;
  private assistantTextBuffer = '';

  constructor(private readonly callbacks: GeminiLiveCallbacks) {}

  async connect(bootstrap: LiveBootstrap, mediaStream: MediaStream) {
    await this.disconnect();

    const genAiOptions =
      bootstrap.authType === 'ephemeral'
        ? {
            apiKey: bootstrap.token!,
            httpOptions: { apiVersion: 'v1alpha' as const },
          }
        : bootstrap.vertexai
          ? { vertexai: true, apiKey: bootstrap.apiKey! }
          : { apiKey: bootstrap.apiKey! };

    const ai = new GoogleGenAI(genAiOptions);

    const config: LiveConnectConfig =
      bootstrap.liveConfig ?? {
        responseModalities: [Modality.AUDIO],
        systemInstruction: {
          parts: [{ text: bootstrap.systemInstruction ?? 'You are a helpful assistant.' }],
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      };

    const tryConnect = async (model: string) =>
      ai.live.connect({
        model,
        config,
        callbacks: {
          onopen: () => {
            this.callbacks.onOpen?.();
            this.startMic(mediaStream);
          },
          onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
          onerror: (e: ErrorEvent) => {
            this.callbacks.onError?.(String(e?.message ?? e));
          },
          onclose: () => {
            this.callbacks.onClose?.();
            this.callbacks.onSpeakingChange?.(false);
          },
        },
      });

    try {
      this.session = await tryConnect(bootstrap.model);
    } catch (primaryErr) {
      if (bootstrap.fallbackModel && bootstrap.fallbackModel !== bootstrap.model) {
        console.warn('[Live] primary model failed, trying fallback:', primaryErr);
        this.session = await tryConnect(bootstrap.fallbackModel);
      } else {
        throw primaryErr;
      }
    }
  }

  private startMic(mediaStream: MediaStream) {
    this.micStreamer?.stop();
    this.micStreamer = startMicStreamer(mediaStream, (pcm) => {
      if (!this.session) return;
      try {
        this.session.sendRealtimeInput({
          audio: pcmToLiveAudioBlob(pcm),
        } as LiveSendRealtimeInputParameters);
      } catch (e) {
        console.warn('[Live] sendRealtimeInput:', e);
      }
    });
  }

  startVisionFrames(getJpegBase64: () => string | null, intervalMs = 5000) {
    this.stopVisionFrames();
    this.visionTimer = setInterval(() => {
      const dataUrl = getJpegBase64();
      if (!dataUrl || !this.session) return;

      const base64 = dataUrl.split(',')[1];
      if (!base64) return;

      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        this.session.sendRealtimeInput({
          video: new Blob([bytes], { type: 'image/jpeg' }),
        } as LiveSendRealtimeInputParameters);
      } catch (e) {
        console.warn('[Live] vision frame:', e);
      }
    }, intervalMs);
  }

  stopVisionFrames() {
    if (this.visionTimer) {
      clearInterval(this.visionTimer);
      this.visionTimer = null;
    }
  }

  sendText(text: string) {
    if (!this.session || !text.trim()) return;
    this.session.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: text.trim() }] }],
      turnComplete: true,
    });
  }

  private handleMessage(msg: LiveServerMessage) {
    const sc = msg.serverContent;
    if (!sc) return;

    if (sc.inputTranscription?.text) {
      this.callbacks.onUserTranscript?.(
        sc.inputTranscription.text,
        Boolean(sc.inputTranscription.finished),
      );
    }

    if (sc.outputTranscription?.text) {
      this.assistantTextBuffer += sc.outputTranscription.text;
      this.callbacks.onAssistantTranscript?.(
        this.assistantTextBuffer,
        Boolean(sc.outputTranscription.finished),
      );
      if (sc.outputTranscription.finished) {
        this.assistantTextBuffer = '';
      }
    }

    if (sc.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        const raw = part.inlineData?.data;
        if (!raw) continue;
        const pcm =
          typeof raw === 'string' ? base64ToPcm(raw) : new Uint8Array(raw as ArrayBuffer);
        this.callbacks.onSpeakingChange?.(true);
        this.callbacks.onAssistantPcm?.(pcm, GEMINI_PCM_SAMPLE_RATE);
      }
    }

    const inline = msg.data;
    if (inline) {
      this.callbacks.onSpeakingChange?.(true);
      this.callbacks.onAssistantPcm?.(base64ToPcm(inline), GEMINI_PCM_SAMPLE_RATE);
    }

    if (sc.generationComplete || sc.turnComplete) {
      this.callbacks.onSpeakingChange?.(false);
    }
  }

  async disconnect() {
    this.stopVisionFrames();
    this.micStreamer?.stop();
    this.micStreamer = null;
    this.assistantTextBuffer = '';

    if (this.session) {
      try {
        this.session.close();
      } catch {
        // ignore
      }
      this.session = null;
    }
  }
}
