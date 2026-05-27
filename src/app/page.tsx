'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './page.module.css';
import { agoraConfig } from '@/utils/agoraConfig';
import { GEMINI_PCM_SAMPLE_RATE } from '@/utils/geminiTtsConstants';
import { base64ToPcm } from '@/utils/geminiLiveAudio';
import { GeminiLiveSession, type LiveBootstrap } from '@/lib/geminiLiveSession';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function Home() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId] = useState(() => `user_${Date.now()}`);
  const [lastCapturedFrame, setLastCapturedFrame] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [isLiveAgent, setIsLiveAgent] = useState(false);
  const [liveStatus, setLiveStatus] = useState('');

  const liveSessionRef = useRef<GeminiLiveSession | null>(null);

  const speechRecognitionRef = useRef<any>(null);
  const voiceFinalTranscriptRef = useRef<string>('');

  const agoraClientRef = useRef<any>(null);
  const agoraAudioTrackRef = useRef<any>(null);
  const agoraUidRef = useRef<number | null>(null);
  const agoraAssistantTrackRef = useRef<any>(null);
  const agoraRtcModuleRef = useRef<any>(null);
  const agoraTtsSessionRef = useRef<{
    audioContext: AudioContext;
    destination: MediaStreamAudioDestinationNode;
    nextTime: number;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCapturedFrameRef = useRef<string | null>(null);

  const agoraChannelName = 'hackathon-persona';
  const voiceRecognitionLang = 'en-PH'; // Taglish-friendly default

  const getAgoraUid = () => {
    const numeric = parseInt(userId.replace(/\D/g, ''), 10);
    const safe = Number.isFinite(numeric) ? numeric : Date.now();
    // Keep it in 32-bit unsigned range.
    return safe % 2147483647;
  };

  const startVoiceInput = () => {
    if (isListening) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    voiceFinalTranscriptRef.current = '';
    setInputText('');

    const recognition = new SpeechRecognition();
    recognition.lang = voiceRecognitionLang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res?.[0]?.transcript ?? '';
        if (res.isFinal) {
          voiceFinalTranscriptRef.current += text;
        } else {
          interim += text;
        }
      }

      const combined = `${voiceFinalTranscriptRef.current}${interim}`.trim();
      setInputText(combined);
    };

    recognition.onerror = (event: any) => {
      console.error('[STT] error:', event);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopVoiceInput = () => {
    try {
      speechRecognitionRef.current?.stop?.();
    } catch (e) {
      console.error('[STT] stop error:', e);
    } finally {
      speechRecognitionRef.current = null;
      setIsListening(false);
    }
  };

  const getAudioContextCtor = () =>
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  const schedulePcmChunk = async (pcm: Uint8Array, sampleRate = GEMINI_PCM_SAMPLE_RATE) => {
    const session = agoraTtsSessionRef.current;
    if (!session) return;

    if (session.audioContext.state === 'suspended') {
      try {
        await session.audioContext.resume();
      } catch {
        // ignore
      }
    }

    const int16 = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 2);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const audioBuffer = session.audioContext.createBuffer(1, float32.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32);

    const source = session.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(session.destination);
    source.connect(session.audioContext.destination);

    const startAt = Math.max(session.nextTime, session.audioContext.currentTime);
    source.start(startAt);
    session.nextTime = startAt + audioBuffer.duration;
  };

  const beginAgoraTtsSession = async () => {
    const client = agoraClientRef.current;
    const AgoraRTC = agoraRtcModuleRef.current;
    if (!client || !AgoraRTC || agoraTtsSessionRef.current) return;

    const AudioCtx = getAudioContextCtor();
    if (!AudioCtx) return;

    const audioContext = new AudioCtx();
    const destination = audioContext.createMediaStreamDestination();
    agoraTtsSessionRef.current = {
      audioContext,
      destination,
      nextTime: audioContext.currentTime,
    };

    const createCustomTrack = (AgoraRTC as { createCustomAudioTrack?: Function }).createCustomAudioTrack;
    if (!createCustomTrack) return;

    const assistantTrack = await createCustomTrack({
      mediaStreamTrack: destination.stream.getAudioTracks()[0],
    });
    agoraAssistantTrackRef.current = assistantTrack;

    const micTrack = agoraAudioTrackRef.current;
    try {
      if (micTrack) await client.unpublish([micTrack]);
      await client.publish([assistantTrack]);
    } catch (e) {
      console.error('[Agora] TTS session publish error:', e);
    }
  };

  const ensureLocalTtsSession = () => {
    if (agoraTtsSessionRef.current) return;

    const AudioCtx = getAudioContextCtor();
    if (!AudioCtx) return;

    const audioContext = new AudioCtx();
    const destination = audioContext.createMediaStreamDestination();
    agoraTtsSessionRef.current = {
      audioContext,
      destination,
      nextTime: audioContext.currentTime,
    };
  };

  const endAgoraTtsSession = async () => {
    const session = agoraTtsSessionRef.current;
    if (!session) return;

    const waitMs = Math.max(0, (session.nextTime - session.audioContext.currentTime) * 1000) + 80;
    await new Promise((r) => setTimeout(r, waitMs));

    const client = agoraClientRef.current;
    const assistantTrack = agoraAssistantTrackRef.current;
    const micTrack = agoraAudioTrackRef.current;

    if (client && assistantTrack) {
      try {
        await client.unpublish([assistantTrack]);
      } catch {
        // ignore
      }
    }
    try {
      assistantTrack?.close?.();
    } catch {
      // ignore
    }
    agoraAssistantTrackRef.current = null;

    try {
      await session.audioContext.close();
    } catch {
      // ignore
    }
    agoraTtsSessionRef.current = null;

    if (client && micTrack) {
      try {
        await client.publish([micTrack]);
      } catch {
        // ignore
      }
    }
  };

  const appendMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === role) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, content };
        return updated;
      }
      return [...prev, { role, content, timestamp: Date.now() }];
    });
  };

  const stopLiveAgent = async () => {
    setLiveStatus('Stopping…');
    await liveSessionRef.current?.disconnect();
    liveSessionRef.current = null;
    await endAgoraTtsSession();
    setIsLiveAgent(false);
    setIsAssistantSpeaking(false);
    setLiveStatus('');
  };

  const startLiveAgent = async () => {
    if (!localStream || !isConnected) {
      alert('Start camera & mic first.');
      return;
    }
    if (isLiveAgent) return;

    setLiveStatus('Connecting…');
    try {
      const bootRes = await fetch('/api/live/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!bootRes.ok) {
        const err = await bootRes.json().catch(() => ({}));
        throw new Error(err?.error ?? `Bootstrap failed: ${bootRes.status}`);
      }

      const bootstrap = (await bootRes.json()) as LiveBootstrap;

      ensureLocalTtsSession();
      if (agoraClientRef.current) {
        await beginAgoraTtsSession();
      }

      const live = new GeminiLiveSession({
        onOpen: () => setLiveStatus('Live — speak anytime'),
        onClose: () => {
          setIsLiveAgent(false);
          setLiveStatus('');
        },
        onError: (msg) => {
          console.error('[Live]', msg);
          setLiveStatus(`Error: ${msg}`);
        },
        onUserTranscript: (text, finished) => {
          if (text.trim()) appendMessage('user', text.trim());
          if (finished) setInputText('');
        },
        onAssistantTranscript: (text) => {
          if (text.trim()) appendMessage('assistant', text.trim());
        },
        onAssistantPcm: (pcm, rate) => {
          void schedulePcmChunk(pcm, rate);
        },
        onSpeakingChange: setIsAssistantSpeaking,
      });

      await live.connect(bootstrap, localStream);
      live.startVisionFrames(() => lastCapturedFrameRef.current);
      liveSessionRef.current = live;
      setIsLiveAgent(true);
      stopVoiceInput();
    } catch (e) {
      console.error('[Live] start failed:', e);
      await endAgoraTtsSession();
      setLiveStatus('');
      alert(e instanceof Error ? e.message : 'Failed to start live agent');
    }
  };

  const joinAgora = async () => {
    // Only join once per page load / session.
    if (agoraClientRef.current) return;
    if (!agoraConfig.appId) {
      throw new Error('NEXT_PUBLIC_AGORA_APP_ID missing');
    }

    const AgoraRTC =
      agoraRtcModuleRef.current ??
      (await import('agora-rtc-sdk-ng')).default;
    agoraRtcModuleRef.current = AgoraRTC;

    const uid = getAgoraUid();
    agoraUidRef.current = uid;

    const tokenRes = await fetch('/api/agora/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelName: agoraChannelName, uid, role: 'publisher' }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      throw new Error(err?.error ?? `Token request failed: ${tokenRes.status}`);
    }

    const { token } = (await tokenRes.json()) as { token: string };

    const client = AgoraRTC.createClient(agoraConfig.rtcConfig);
    agoraClientRef.current = client;

    await client.join(agoraConfig.appId, agoraChannelName, token, uid);

    // Publish microphone audio so Agora is actually used live.
    const micAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    agoraAudioTrackRef.current = micAudioTrack;

    await client.publish([micAudioTrack]);
  };

  const stopAgora = async () => {
    const client = agoraClientRef.current;
    const audioTrack = agoraAudioTrackRef.current;

    try {
      if (client && audioTrack) {
        try {
          await client.unpublish([audioTrack]);
        } catch (e) {
          // ignore unpublish errors on shutdown
        }
      }
    } finally {
      try {
        audioTrack?.close?.();
      } catch (e) {
        console.error('[Agora] audioTrack close error:', e);
      }
    }

    try {
      await client?.leave?.();
    } catch (e) {
      console.error('[Agora] leave error:', e);
    } finally {
      agoraClientRef.current = null;
      agoraAudioTrackRef.current = null;
      agoraUidRef.current = null;
    }
  };

  // Start local video/audio using native browser APIs
  const startLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });

      setLocalStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsConnected(true);

      // Start periodic frame capture for vision analysis
      startFrameCapture();

      // Agora hackathon requirement: join channel + publish mic audio.
      joinAgora().catch((e) => {
        console.error('[Agora] join/publish failed:', e);
      });
    } catch (error) {
      console.error('Error starting media:', error);
      alert('Failed to access camera/microphone. Please check permissions and use HTTPS or localhost.');
    }
  };

  // Capture video frames periodically
  const startFrameCapture = () => {
    captureIntervalRef.current = setInterval(() => {
      captureFrame();
    }, 5000); // Capture every 5 seconds
  };

  // Capture single frame as base64
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    setLastCapturedFrame(base64Image);
    lastCapturedFrameRef.current = base64Image;
    
    console.log('[Camera] Frame captured:', base64Image.substring(0, 50) + '...');
  };

  // Stop local media
  const stopLocalMedia = () => {
    stopVoiceInput();
    void stopLiveAgent();

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsConnected(false);
    setLastCapturedFrame(null);
    lastCapturedFrameRef.current = null;

    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }

    stopAgora().catch((e) => {
      console.error('[Agora] stop error:', e);
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocalMedia();
    };
  }, []);

  // Send message to AI
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const text = inputText.trim();
    setInputText('');

    if (isLiveAgent && liveSessionRef.current) {
      appendMessage('user', text);
      liveSessionRef.current.sendText(text);
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setIsAssistantSpeaking(true);

    ensureLocalTtsSession();
    if (agoraClientRef.current) {
      await beginAgoraTtsSession();
    }

    try {
      // Prepare message content (text + optional image)
      let messageContent: any = text;

      if (lastCapturedFrame && isConnected) {
        messageContent = [
          { type: 'text', text },
          { type: 'image_url', image_url: { url: lastCapturedFrame } },
        ];
      }

      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          model: 'gemini-3.1-flash-lite',
          messages: [...messages, { role: 'user', content: messageContent } as any].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
          enable_tts: true,
          user_id: userId,
          turn_id: messages.length,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${errorText}`);
      }

      // LLM + TTS multiplexed on one SSE (no per-phrase HTTP round trips)
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let sseBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
                audio?: { pcm?: string; sampleRate?: number };
              };

              if (parsed.audio?.pcm) {
                void schedulePcmChunk(
                  base64ToPcm(parsed.audio.pcm),
                  parsed.audio.sampleRate ?? GEMINI_PCM_SAMPLE_RATE,
                );
              }

              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;

                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];

                  if (lastMessage?.role === 'assistant') {
                    lastMessage.content = assistantMessage;
                  } else {
                    newMessages.push({
                      role: 'assistant',
                      content: assistantMessage,
                      timestamp: Date.now(),
                    });
                  }

                  return newMessages;
                });
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      await endAgoraTtsSession();
      setIsAssistantSpeaking(false);
    } catch (error) {
      console.error('Error sending message:', error);
      await endAgoraTtsSession();
      setIsAssistantSpeaking(false);
      alert('Failed to send message. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Multi-Persona AI Sales Agent</h1>
        <p>Persona-aware • Gemini Live voice • Agora RTC</p>
      </header>

      <main className={styles.main}>
        <div className={styles.videoSection}>
          <div className={styles.videoContainer}>
            <video 
              ref={videoRef} 
              className={styles.video}
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {isAssistantSpeaking && (
              <div className={styles.avatarOverlay} aria-hidden="true">
                <div className={styles.avatarBubble}>Assistant speaking</div>
              </div>
            )}

            {!isConnected && (
              <div className={styles.videoPlaceholder}>
                <p>📷 Camera Off</p>
                <p className={styles.hint}>Enable camera for visual awareness</p>
              </div>
            )}
          </div>
          
          <div className={styles.controls}>
            {!isConnected ? (
              <button onClick={startLocalMedia} className={styles.button}>
                🎥 Start Camera & Mic
              </button>
            ) : (
              <button onClick={stopLocalMedia} className={styles.buttonDanger}>
                ⏹️ Stop Camera & Mic
              </button>
            )}
            {isConnected && lastCapturedFrame && (
              <p className={styles.statusText}>✅ Camera active • Capturing frames</p>
            )}
          </div>

          {isConnected && (
            <div className={styles.micControls}>
              <button
                onClick={isLiveAgent ? stopLiveAgent : startLiveAgent}
                className={isLiveAgent ? styles.buttonDanger : styles.button}
                type="button"
              >
                {isLiveAgent ? '🛑 Stop Realtime Agent' : '⚡ Start Realtime Agent'}
              </button>
              {!isLiveAgent && (
                <button
                  onClick={isListening ? stopVoiceInput : startVoiceInput}
                  className={isListening ? styles.buttonDanger : styles.button}
                  type="button"
                >
                  {isListening ? '🛑 Stop STT' : '🎙️ Dictate (text)'}
                </button>
              )}
              <span className={styles.statusPill}>
                {liveStatus || (isLiveAgent ? 'Realtime voice active' : isListening ? 'Dictating…' : 'Use Realtime for low latency')}
              </span>
            </div>
          )}
        </div>

        <div className={styles.chatSection}>
          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.emptyState}>
                <p>Start a conversation with the AI agent</p>
                <p className={styles.hint}>Try: "Hello broskie"</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`${styles.message} ${
                  msg.role === 'user' ? styles.userMessage : styles.assistantMessage
                }`}
              >
                <div className={styles.messageRole}>
                  {msg.role === 'user' ? 'You' : 'AI Agent'}
                </div>
                <div className={styles.messageContent}>{msg.content}</div>
              </div>
            ))}
            
            {isLoading && (
              <div className={styles.loadingIndicator}>
                <span>●</span>
                <span>●</span>
                <span>●</span>
              </div>
            )}
          </div>

          <div className={styles.inputSection}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={
                isLiveAgent ? 'Type to interrupt / add context…' : 'Type your message…'
              }
              className={styles.input}
              disabled={isLoading && !isLiveAgent}
            />
            <button
              onClick={sendMessage}
              disabled={(!isLiveAgent && isLoading) || !inputText.trim()}
              className={styles.sendButton}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
