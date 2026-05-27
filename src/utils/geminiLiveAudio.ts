/** Convert base64 (from Live API) to PCM bytes. */
export function base64ToPcm(base64: string): Uint8Array {
  const binary = atob(base64);
  const pcm = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) pcm[i] = binary.charCodeAt(i);
  return pcm;
}

export type MicStreamer = {
  stop: () => void;
};

/**
 * Stream microphone PCM at 16 kHz to Gemini Live via sendRealtimeInput.
 * Uses a dedicated AudioContext at 16 kHz (Live API input requirement).
 */
export function startMicStreamer(
  mediaStream: MediaStream,
  onPcmChunk: (pcm: Uint8Array) => void,
): MicStreamer {
  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  const audioContext = new AudioCtx({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(mediaStream);
  const processor = audioContext.createScriptProcessor(2048, 1, 1);

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const int16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      int16[i] = s < 0 ? s * 32768 : s * 32767;
    }
    onPcmChunk(new Uint8Array(int16.buffer));
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return {
    stop: () => {
      try {
        processor.disconnect();
        source.disconnect();
        void audioContext.close();
      } catch {
        // ignore
      }
    },
  };
}

export function pcmToLiveAudioBlob(pcm: Uint8Array): Blob {
  const copy = new Uint8Array(pcm.byteLength);
  copy.set(pcm);
  return new Blob([copy], {
    type: 'audio/pcm;rate=16000',
  });
}
