'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './page.module.css';

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
  const [transcript, setTranscript] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Can also use 'tl-PH' for Tagalog
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            setInputText(prev => prev + finalTranscript);
            setTranscript('');
          } else {
            setTranscript(interimTranscript);
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'no-speech') {
            console.log('No speech detected, continuing...');
          }
        };
        
        recognition.onend = () => {
          if (isListening) {
            recognition.start(); // Restart if still supposed to be listening
          }
        };
        
        recognitionRef.current = recognition;
      } else {
        console.warn('Speech recognition not supported in this browser');
      }
    }
  }, [isListening]);

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
    } catch (error) {
      console.error('Error starting media:', error);
      alert('Failed to access camera/microphone. Please check permissions and use HTTPS or localhost.');
    }
  };

  // Toggle voice recognition
  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setTranscript('');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
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
    
    console.log('[Camera] Frame captured');
  };

  // Stop local media
  const stopLocalMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    
    setIsConnected(false);
    setLastCapturedFrame(null);

    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
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
          model: 'gemini-3.5-flash',
          messages: messages.concat({
            role: 'user',
            content: messageContent
          }).map(m => ({
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
              <>
                <button onClick={stopLocalMedia} className={styles.buttonDanger}>
                  ⏹️ Stop Camera & Mic
                </button>
                <button 
                  onClick={toggleVoiceRecognition} 
                  className={isListening ? styles.buttonDanger : styles.button}
                >
                  {isListening ? '🔴 Stop Listening' : '🎤 Start Voice Input'}
                </button>
              </>
            )}
          </div>
          
          {isConnected && lastCapturedFrame && (
            <p className={styles.statusText}>✅ Camera active • Capturing frames</p>
          )}
          
          {isListening && (
            <div className={styles.listeningIndicator}>
              <span className={styles.pulse}>🎤</span>
              <span>Listening... {transcript && `"${transcript}"`}</span>
            </div>
          )}
        </div>

        <div className={styles.chatSection}>
          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.emptyState}>
                <p>Start a conversation with the AI agent</p>
                <p className={styles.hint}>Type or speak: "Hello broskie"</p>
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
              placeholder={isListening ? "Listening... or type here" : "Type your message..."}
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
