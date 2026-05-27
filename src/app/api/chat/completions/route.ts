// Core API route handler for chat completions with persona injection

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatCompletionRequest, ChatMessage } from '@/types/chat';
import { extractText, analyzePersona, extractLocation, detectBuyingIntent } from '@/services/analyzer';
import { getUserProfile, updateProfile } from '@/services/profileManager';
import { compileSystemPrompt } from '@/services/promptCompiler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file.' },
        { status: 500 }
      );
    }
    
    const body: ChatCompletionRequest = await req.json();
    
    // Validate streaming requirement
    if (!body.stream) {
      return NextResponse.json(
        { error: 'Streaming must be enabled (stream: true)' },
        { status: 400 }
      );
    }
    
    // Extract user ID from request
    const userId = body.user_id || req.headers.get('x-user-id') || 'default_user';
    
    // Get or create user profile
    const userProfile = await getUserProfile(userId);
    
    // Extract and analyze the latest user message
    const userMessages = body.messages.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      const latestMessage = userMessages[userMessages.length - 1];
      const messageText = extractText(latestMessage.content);
      
      // Analyze persona
      const analysis = analyzePersona(messageText);
      
      // Update profile with analysis
      const updates: any = {
        interactionText: messageText
      };
      
      if (analysis.detected_persona !== 'Unknown' && analysis.confidence_score >= 3) {
        updates.persona = analysis.detected_persona;
      }
      
      // Extract location
      const location = extractLocation(messageText);
      if (location) {
        updates.location = location;
      }
      
      // Track unrecognized slang
      if (analysis.unrecognized_slang.length > 0) {
        updates.unrecognizedSlang = analysis.unrecognized_slang;
      }
      
      // Detect buying intent
      if (detectBuyingIntent(messageText)) {
        updates.funnelStage = 'converted';
      }
      
      // Update profile asynchronously (non-blocking)
      updateProfile(userId, updates).catch(console.error);
    }
    
    // Compile system prompt from 3-tier markdown
    const systemPrompt = await compileSystemPrompt(userProfile);
    
    // Convert messages to Gemini format
    const geminiMessages = body.messages
      .filter(m => m.role !== 'system')
      .map(msg => {
        const text = extractText(msg.content);
        
        // Handle multimodal content (text + images)
        if (Array.isArray(msg.content)) {
          const parts: any[] = [];
          
          for (const block of msg.content) {
            if (block.type === 'text') {
              parts.push({ text: block.text });
            } else if (block.type === 'image_url') {
              // Extract base64 data from data URL
              const base64Match = block.image_url.url.match(/^data:image\/(\w+);base64,(.+)$/);
              if (base64Match) {
                parts.push({
                  inlineData: {
                    mimeType: `image/${base64Match[1]}`,
                    data: base64Match[2]
                  }
                });
              }
            }
          }
          
          return {
            role: msg.role === 'user' ? 'user' : 'model',
            parts
          };
        }
        
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text }]
        };
      });
    
    const requestedModel = body.model || 'gemini-3.5-flash';
    const fallbackModel = requestedModel === 'gemini-3.5-flash' ? 'gemini-2.0-flash' : 'gemini-2.0-flash-lite';
    
    console.log('[API] Requested model:', requestedModel);
    console.log('[API] Fallback model:', fallbackModel);
    console.log('[API] Message count:', geminiMessages.length);
    
    // Create SSE stream
    const encoder = new TextEncoder();
    let accumulatedResponse = '';
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendStreamWithModel = async (modelName: string) => {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt,
            generationConfig: {
              temperature: body.temperature || 0.8,
              maxOutputTokens: body.max_tokens || 500,
            }
          });

          const chat = model.startChat({
            history: geminiMessages.slice(0, -1), // All but last message
          });
          
          const lastMessage = geminiMessages[geminiMessages.length - 1];
          console.log(`[API] Sending message to Gemini (${modelName}):`, lastMessage.parts[0]);
          return await chat.sendMessageStream(lastMessage.parts);
        };

        try {
          console.log('[API] Starting Gemini stream...');

          let result;
          let activeModel = requestedModel;
          try {
            result = await sendStreamWithModel(requestedModel);
          } catch (primaryError: any) {
            const msg = String(primaryError?.message || primaryError || '');
            const isCapacityError = msg.includes('503') || msg.toLowerCase().includes('high demand');
            if (!isCapacityError) {
              throw primaryError;
            }

            console.warn(`[API] Model ${requestedModel} unavailable, retrying with ${fallbackModel}`);
            activeModel = fallbackModel;
            result = await sendStreamWithModel(fallbackModel);
          }
          
          // Stream chunks
          for await (const chunk of result.stream) {
            const text = chunk.text();
            
            if (text) {
              accumulatedResponse += text;
              
              // Format as OpenAI-compatible SSE
              const sseData = {
                choices: [{
                  delta: { content: text },
                  index: 0,
                  finish_reason: null
                }]
              };
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
            }
          }
          console.log('[API] Stream complete using model:', activeModel);
          
          // Send completion
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          
          // Update profile with AI response
          if (accumulatedResponse) {
            updateProfile(userId, {
              interactionText: `[AI] ${accumulatedResponse}`
            }).catch(console.error);
          }
          
          controller.close();
        } catch (error: any) {
          console.error('Gemini stream error:', error);
          
          // Send error as SSE
          const errorMessage = error?.message || 'Unknown error occurred';
          const errorData = {
            choices: [{
              delta: { content: `\n\n[Error: ${errorMessage}]` },
              index: 0,
              finish_reason: 'error'
            }]
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });
    
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
    
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error?.message || 'Unknown error',
        hint: 'Check server logs for more details'
      },
      { status: 500 }
    );
  }
}
