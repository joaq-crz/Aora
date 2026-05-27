// Agora RTC Web SDK configuration

export const agoraConfig = {
  appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || '',
  
  // RTC configuration
  rtcConfig: {
    mode: 'rtc' as const,
    codec: 'vp8' as const,
  },
  
  // Video configuration
  videoConfig: {
    width: 640,
    height: 480,
    frameRate: 15,
    bitrateMin: 400,
    bitrateMax: 1000,
  },
  
  // Audio configuration
  audioConfig: {
    sampleRate: 48000,
    sampleSize: 16,
    stereo: true,
  },
  
  // Screen capture interval for vision analysis (ms)
  captureInterval: 5000,
};

export function validateAgoraConfig(): boolean {
  if (!agoraConfig.appId) {
    console.error('Agora App ID is not configured');
    return false;
  }
  return true;
}
