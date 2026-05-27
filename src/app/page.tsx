'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './page.module.css';
import { agoraConfig } from '@/utils/agoraConfig';

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

  const speechRecognitionRef = useRef<any>(null);
  const voiceFinalTranscriptRef = useRef<string>('');

  const agoraClientRef = useRef<any>(null);
  const agoraAudioTrackRef = useRef<any>(null);
  const agoraUidRef = useRef<number | null>(null);
  const agoraAssistantTrackRef = useRef<any>(null);
  const agoraRtcModuleRef = useRef<any>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const publishAssistantAudioToAgora = async (blob: Blob) => {
    const client = agoraClientRef.current;
    if (!client) return false;

    const AgoraRTC = agoraRtcModuleRef.current;
    if (!AgoraRTC) return false;

    const micTrack = agoraAudioTrackRef.current;

    // Unpublish previous assistant track (if any).
    const previousAssistantTrack = agoraAssistantTrackRef.current;
    if (previousAssistantTrack) {
      try {
        await client.unpublish([previousAssistantTrack]);
      } catch {
        // ignore
      }
      try {
        previousAssistantTrack.close?.();
      } catch {
        // ignore
      }
      agoraAssistantTrackRef.current = null;
    }

    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return false;

    // Decode the ElevenLabs MP3 to PCM so we can stream it through Agora.
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioCtx();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Create a MediaStream from the decoded audio.
    const streamDestination = audioContext.createMediaStreamDestination();
    source.connect(streamDestination);
    // Also play locally so the speaker hears the assistant.
    source.connect(audioContext.destination);

    const mediaStreamTrack = streamDestination.stream.getAudioTracks()[0];
    if (!mediaStreamTrack) {
      try {
        audioContext.close?.();
      } catch {
        // ignore
      }
      return false;
    }

    const createCustomTrack = (AgoraRTC as any).createCustomAudioTrack;
    if (!createCustomTrack) return false;

    // Convert MediaStreamTrack to an Agora audio track and publish it.
    const assistantTrack = await createCustomTrack({ mediaStreamTrack });
    agoraAssistantTrackRef.current = assistantTrack;

    try {
      // Avoid mic echo/feedback for other listeners in the channel.
      if (micTrack) {
        try {
          await client.unpublish([micTrack]);
        } catch {
          // ignore
        }
      }

      await client.publish([assistantTrack]);
    } catch (e) {
      console.error('[Agora] assistant audio publish error:', e);
      try {
        assistantTrack.close?.();
      } catch {
        // ignore
      }
      agoraAssistantTrackRef.current = null;
      try {
        audioContext.close?.();
      } catch {
        // ignore
      }
      return false;
    }

    source.start(0);

    return new Promise<boolean>((resolve) => {
      source.onended = async () => {
        try {
          await client.unpublish([assistantTrack]);
        } catch {
          // ignore
        }
        try {
          assistantTrack.close?.();
        } catch {
          // ignore
        }
        agoraAssistantTrackRef.current = null;

        try {
          // Restore mic publishing after assistant finishes.
          if (micTrack) {
            await client.publish([micTrack]);
          }
        } catch {
          // ignore
        }

        try {
          audioContext.close?.();
        } catch {
          // ignore
        }
        resolve(true);
      };

      source.onerror = async () => {
        try {
          await client.unpublish([assistantTrack]);
        } catch {
          // ignore
        }
        try {
          assistantTrack.close?.();
        } catch {
          // ignore
        }
        agoraAssistantTrackRef.current = null;
        resolve(false);
      };
    });
  };

  const playElevenLabsTts = async (text: string) => {
    if (!text.trim()) return;

    setIsAssistantSpeaking(true);
    try {
      const res = await fetch('/api/tts/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('[TTS] ElevenLabs not available:', err?.error ?? res.statusText);
        setIsAssistantSpeaking(false);
        return;
      }

      const blob = await res.blob();

      const published = await publishAssistantAudioToAgora(blob);
      if (!published) {
        // Fallback: play locally if Agora publish fails.
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        await audio.play();
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setIsAssistantSpeaking(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          setIsAssistantSpeaking(false);
        };
      } else {
        setIsAssistantSpeaking(false);
      }
    } catch (e) {
      console.error('[TTS] error:', e);
      setIsAssistantSpeaking(false);
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
    
    console.log('[Camera] Frame captured:', base64Image.substring(0, 50) + '...');
  };

  // Stop local media
  const stopLocalMedia = () => {
    stopVoiceInput();

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsConnected(false);
    setLastCapturedFrame(null);

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

    const userMessage: Message = {
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Prepare message content (text + optional image)
      let messageContent: any = inputText;
      
      if (lastCapturedFrame && isConnected) {
        // Include image for multimodal analysis
        messageContent = [
          { type: 'text', text: inputText },
          { type: 'image_url', image_url: { url: lastCapturedFrame } }
        ];
      }

      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          messages: [...messages, { role: 'user', content: messageContent } as any].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
          user_id: userId,
          turn_id: messages.length,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${errorText}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  
                  // Update message in real-time
                  setMessages(prev => {
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
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Foundation for ElevenLabs avatar/voice:
      // synthesize the final AI text once streaming ends.
      if (assistantMessage.trim()) {
        await playElevenLabsTts(assistantMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Multi-Persona AI Sales Agent</h1>
        <p>Dynamic persona adaptation • Real-time interaction</p>
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
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                className={isListening ? styles.buttonDanger : styles.button}
                type="button"
              >
                {isListening ? '🛑 Stop Voice Input' : '🎙️ Start Voice Input'}
              </button>
              <span className={styles.statusPill}>{isListening ? 'Listening...' : 'Voice ready'}</span>
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
              placeholder="Type your message..."
              className={styles.input}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputText.trim()}
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
