# Gemini Integration Guide

This project uses **Google Gemini 2.0 Flash Experimental** instead of OpenAI's GPT-4o for several advantages:

## 🎯 Why Gemini?

### 1. **Free Tier**
- Generous free quota (15 requests per minute)
- No credit card required to start
- Perfect for development and testing

### 2. **Multimodal Native**
- Built-in vision capabilities
- Seamless text + image processing
- No separate API calls needed

### 3. **Fast & Efficient**
- Gemini 2.0 Flash is optimized for speed
- Lower latency than GPT-4o
- Better for real-time chat applications

### 4. **JSON Mode**
- Native structured output support
- Perfect for slang classification
- No prompt engineering needed

## 🔧 Implementation Details

### Model Used
```typescript
model: 'gemini-3.5-flash'
```

The latest Gemini model with improved performance and capabilities.

### Key Features
- **System Instructions**: Replaces OpenAI's system messages
- **Streaming**: Native streaming support via `sendMessageStream()`
- **Multimodal**: Handles text + base64 images in single request
- **Chat History**: Maintains conversation context

### API Differences

#### OpenAI Format (Old)
```typescript
{
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are...' },
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi!' }
  ],
  stream: true
}
```

#### Gemini Format (New)
```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  systemInstruction: 'You are...',
  generationConfig: {
    temperature: 0.8,
    maxOutputTokens: 500
  }
});

const chat = model.startChat({
  history: [
    { role: 'user', parts: [{ text: 'Hello' }] },
    { role: 'model', parts: [{ text: 'Hi!' }] }
  ]
});
```

## 📸 Multimodal Support

### Sending Images
```typescript
{
  role: 'user',
  parts: [
    { text: 'What do you see?' },
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64ImageData
      }
    }
  ]
}
```

### Automatic Conversion
The API route automatically converts:
- `data:image/jpeg;base64,xxx` → Gemini inline data format
- Text blocks → `{ text: '...' }`
- Mixed content → Array of parts

## 🔄 Streaming Implementation

### Gemini Streaming
```typescript
const result = await chat.sendMessageStream(message);

for await (const chunk of result.stream) {
  const text = chunk.text();
  // Process chunk
}
```

### SSE Compatibility
The API route converts Gemini chunks to OpenAI-compatible SSE format:
```typescript
data: {"choices":[{"delta":{"content":"text"},"index":0}]}
```

This means the frontend doesn't need changes!

## 🧠 Evolution Engine

### Slang Classification
Uses Gemini's JSON mode for structured output:

```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    temperature: 0.3,
    responseMimeType: 'application/json'
  }
});

const result = await model.generateContent(
  'Classify these Filipino slang terms: ...'
);

const classifications = JSON.parse(result.response.text());
```

## 🚀 Getting Your API Key

### Step 1: Go to Google AI Studio
Visit: https://aistudio.google.com/app/apikey

### Step 2: Create API Key
1. Sign in with Google account
2. Click "Create API Key"
3. Choose "Create API key in new project" or select existing project
4. Copy the generated key

### Step 3: Add to Environment
```env
GEMINI_API_KEY=your_key_here
```

## 💰 Pricing & Limits

### Free Tier
- **Rate Limit**: 15 requests per minute
- **Daily Limit**: 1,500 requests per day
- **Token Limit**: 1 million tokens per minute
- **Cost**: $0 (completely free)

### Paid Tier (if needed)
- **Rate Limit**: 1,000 requests per minute
- **Cost**: $0.075 per 1M input tokens
- **Cost**: $0.30 per 1M output tokens

For comparison, GPT-4o costs:
- $2.50 per 1M input tokens
- $10.00 per 1M output tokens

**Gemini is ~33x cheaper!**

## 🔒 Security

### API Key Storage
- Stored in `.env.local` (server-side only)
- Never exposed to client
- Not committed to git

### Best Practices
```typescript
// ✅ Good - Server-side only
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ❌ Bad - Never do this
const genAI = new GoogleGenerativeAI('hardcoded-key');
```

## 🧪 Testing

### Test Multimodal
```bash
# Send message with image
POST /api/chat/completions
{
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "What am I wearing?" },
      { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
    ]
  }],
  "stream": true
}
```

### Test Streaming
```javascript
const response = await fetch('/api/chat/completions', {
  method: 'POST',
  body: JSON.stringify({ messages, stream: true })
});

const reader = response.body.getReader();
// Chunks arrive in real-time
```

## 📊 Performance Comparison

| Feature | Gemini 3.5 Flash | GPT-4o |
|---------|------------------|--------|
| **Speed** | ~1-2s first token | ~2-3s first token |
| **Cost** | $0.075/1M tokens | $2.50/1M tokens |
| **Free Tier** | ✅ Yes (generous) | ❌ No |
| **Vision** | ✅ Native | ✅ Native |
| **Streaming** | ✅ Yes | ✅ Yes |
| **JSON Mode** | ✅ Native | ✅ Via function calling |
| **Context** | 1M tokens | 128K tokens |
| **Latest** | ✅ 3.5 Generation | ✅ GPT-4o |

## 🔄 Migration from OpenAI

If you want to switch back to OpenAI:

1. Install OpenAI SDK:
```bash
npm install openai
```

2. Update environment:
```env
OPENAI_API_KEY=sk-your-key
```

3. Modify `route.ts`:
```typescript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

4. Use OpenAI streaming:
```typescript
const stream = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages,
  stream: true
});
```

## 🎓 Resources

- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Gemini Pricing](https://ai.google.dev/pricing)
- [Google AI Studio](https://aistudio.google.com/)
- [Gemini Cookbook](https://github.com/google-gemini/cookbook)

## 💡 Pro Tips

1. **Use Flash for Speed**: Gemini 2.0 Flash is faster than Pro
2. **Batch Requests**: Combine multiple operations when possible
3. **Cache System Instructions**: Reduces token usage
4. **Monitor Quota**: Check usage in Google Cloud Console
5. **Test Locally First**: Free tier is perfect for development

---

**Gemini 2.0 Flash provides excellent performance at zero cost! 🚀**
