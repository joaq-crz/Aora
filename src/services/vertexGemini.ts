import { GoogleGenAI, type Content, type Part } from '@google/genai';

let genaiClient: GoogleGenAI | null = null;

export type GeminiAuthMode = 'vertex-express' | 'ai-studio' | 'vertex-project' | 'none';

const MODEL_ALIASES: Record<string, string> = {
  'gemini-3.5-flash': 'gemini-2.0-flash',
  'gemini-2.0-flash': 'gemini-2.0-flash',
  'gemini-2.0-flash-lite': 'gemini-2.0-flash-lite',
  'gemini-2.0-flash-001': 'gemini-2.0-flash',
  'gemini-2.0-flash-lite-001': 'gemini-2.0-flash-lite',
  'gemini-1.5-flash': 'gemini-1.5-flash',
  'gemini-1.5-pro': 'gemini-1.5-pro',
};

export function getVertexProjectId(): string {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.VERTEX_PROJECT ||
    ''
  );
}

export function getVertexLocation(): string {
  return (
    process.env.GOOGLE_CLOUD_LOCATION ||
    process.env.VERTEX_LOCATION ||
    'us-central1'
  );
}

/** Detect how we authenticate (Express API key vs AI Studio vs full Vertex project). */
export function getGeminiAuthMode(): GeminiAuthMode {
  const vertexKey = process.env.VERTEX_API_KEY?.trim();
  const googleKey = process.env.GOOGLE_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (vertexKey?.startsWith('AQ.')) return 'vertex-express';
  if (googleKey?.startsWith('AQ.')) return 'vertex-express';
  if (vertexKey) return 'vertex-express';

  if (geminiKey?.startsWith('AIza')) return 'ai-studio';
  if (googleKey?.startsWith('AIza')) return 'ai-studio';
  if (geminiKey) return 'ai-studio';

  if (getVertexProjectId()) return 'vertex-project';

  return 'none';
}

export function validateVertexConfig(): { ok: true; mode: GeminiAuthMode } | { ok: false; error: string } {
  const mode = getGeminiAuthMode();
  if (mode === 'none') {
    return {
      ok: false,
      error:
        'No Gemini credentials found. Set VERTEX_API_KEY (Vertex express, starts with AQ.), ' +
        'or GEMINI_API_KEY (Google AI Studio, starts with AIza.), ' +
        'or GOOGLE_CLOUD_PROJECT + gcloud auth for full Vertex.',
    };
  }
  return { ok: true, mode };
}

export function resolveVertexModelId(requested?: string): string {
  const name = requested?.trim() || 'gemini-2.0-flash';
  return MODEL_ALIASES[name] ?? name;
}

export function getGenAIClient(): GoogleGenAI {
  if (genaiClient) return genaiClient;

  const mode = getGeminiAuthMode();

  if (mode === 'vertex-express') {
    const apiKey =
      process.env.VERTEX_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      '';

    if (!apiKey) {
      throw new Error('VERTEX_API_KEY is empty.');
    }

    // Express mode: API key only — no GOOGLE_CLOUD_PROJECT or service account required.
    genaiClient = new GoogleGenAI({
      vertexai: true,
      apiKey,
    });
    return genaiClient;
  }

  if (mode === 'ai-studio') {
    const apiKey =
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      '';

    genaiClient = new GoogleGenAI({ apiKey });
    return genaiClient;
  }

  if (mode === 'vertex-project') {
    const project = getVertexProjectId();
    genaiClient = new GoogleGenAI({
      vertexai: true,
      project,
      location: getVertexLocation(),
    });
    return genaiClient;
  }

  const check = validateVertexConfig();
  throw new Error(!check.ok ? check.error : 'Unknown auth error');
}

export type VertexChatMessage = {
  role: 'user' | 'model';
  parts: Part[];
};

export function toVertexChatMessages(
  messages: Array<{ role: string; content: unknown }>,
): { history: Content[]; lastParts: Part[] } {
  const converted: VertexChatMessage[] = messages
    .filter((m) => m.role !== 'system')
    .map((msg) => {
      const parts: Part[] = [];

      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content as Array<{
          type: string;
          text?: string;
          image_url?: { url: string };
        }>) {
          if (block.type === 'text' && block.text) {
            parts.push({ text: block.text });
          } else if (block.type === 'image_url' && block.image_url?.url) {
            const base64Match = block.image_url.url.match(
              /^data:image\/(\w+);base64,(.+)$/,
            );
            if (base64Match) {
              parts.push({
                inlineData: {
                  mimeType: `image/${base64Match[1]}`,
                  data: base64Match[2],
                },
              });
            }
          }
        }
      }

      return {
        role: msg.role === 'user' ? ('user' as const) : ('model' as const),
        parts: parts.length ? parts : [{ text: '' }],
      };
    });

  if (converted.length === 0) {
    return { history: [], lastParts: [{ text: '' }] };
  }

  const last = converted[converted.length - 1];
  const history = converted.slice(0, -1).map((m) => ({
    role: m.role,
    parts: m.parts,
  }));

  return { history, lastParts: last.parts };
}

/** @deprecated Use getGenAIClient — kept for imports during migration */
export const getVertexAIClient = getGenAIClient;
