// Type definitions for chat completion API

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export type MessageContent = string | (TextContent | ImageContent)[];

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: MessageContent;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
  turn_id?: number;
  timestamp?: number;
  user_id?: string;
  /** When true (default), chat SSE also streams Gemini TTS PCM chunks. */
  enable_tts?: boolean;
}

export interface PersonaAnalysis {
  detected_persona: 'BGC Conyo' | 'Youngstunna' | 'Beki' | 'Unknown';
  confidence_score: number;
  matched_keywords: string[];
  unrecognized_slang: string[];
}

export interface UserProfile {
  user_id: string;
  name?: string;
  detected_persona: string;
  funnel_stage: 'discovery' | 'context_built' | 'pitch_ready' | 'soft_close' | 'converted';
  interaction_history: string[];
  visual_notes: string[];
  location_context?: string;
  interests: string[];
  unrecognized_slang_candidates: string[];
  last_updated: string;
  created_at: string;
}
