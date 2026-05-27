# Multi-Persona AI Sales Agent - Technical Overview

## 🎯 What Makes This Unique

This is a **standalone, full-stack Next.js application** that implements an AI sales agent with **dynamic persona adaptation** based on Filipino sub-culture linguistic patterns. The system's USP is "Dynamic Mirroring via Cultural Persona Adaptation" - it analyzes how users speak and adapts its personality in real-time to build instant rapport.

## 🏗️ System Architecture

### High-Level Flow
```
User speaks/types → Agora captures video/audio → Next.js API analyzes language
→ Detects persona (BGC Conyo/Youngstunna/Beki) → Compiles custom prompt
→ Gemini 3.5 Flash processes with vision → Streams response → Updates user profile
```

### The 3-Tier Markdown Engine

This is the core innovation - a file-based personality system:

**Tier 1: `data/persona.md`** (Immutable)
- Static blueprint defining the 3 personas
- Core linguistic mechanics and code-switching rules
- Sales funnel framework
- Never modified at runtime

**Tier 2: `data/archetype_type.md`** (Evolving)
- Shared slang dictionaries per persona
- Automatically grows as users introduce new terms
- Updated by the Evolution Engine
- Partitioned by persona type

**Tier 3: `data/profiles/user_{id}_profile.md`** (Persistent CRM)
- Individual user context and history
- Visual notes from camera feed
- Current funnel stage
- Interaction history
- Unrecognized slang candidates

## 🎭 The Three Personas

### 1. BGC Conyo
- **Target**: Upper-middle-class Filipino youth from Bonifacio Global City
- **Language**: Seamless Taglish (English primary with Tagalog insertions)
- **Keywords**: broskie, pare, shawty, gagi, like, legit, bet
- **Style**: Casual, confident, relationship-focused
- **Example**: "Yo what's up pare, what's going broskie?"

### 2. Youngstunna
- **Target**: Street-smart, hustler mentality youth
- **Language**: Heavy Tagalog with English slang
- **Keywords**: pre, idol, boss, solid, petmalu, lodi, werpa
- **Style**: Direct, no-nonsense, action-oriented
- **Example**: "Ano pre, solid ba yan? Keri yan boss!"

### 3. Beki
- **Target**: LGBTQ+ Filipino youth with expressive personality
- **Language**: Theatrical Taglish with gay lingo (swardspeak)
- **Keywords**: charot, mima, baks, ateh, kalurks, werq, ganda
- **Style**: Expressive, dramatic, witty, affirming
- **Example**: "Hoy baks, ganda naman ng outfit mo! Werq it ateh!"

## 🔄 The Sales Funnel

The system guides users through 5 stages:

1. **discovery**: Initial contact, building rapport through mirroring
2. **context_built**: Understanding needs, location, situation
3. **pitch_ready**: Identified opportunity to introduce product
4. **soft_close**: Natural product presentation within conversation
5. **converted**: User expresses buying intent

The AI never explicitly "sells" - it integrates the product naturally into conversation.

## 🧠 Key Technical Components

### 1. Analyzer Service (`src/services/analyzer.ts`)
- **extractText()**: Safely extracts text from multimodal content (handles base64 images)
- **analyzePersona()**: Scans for linguistic markers, scores confidence (0-10)
- **extractLocation()**: Identifies location mentions (BGC, Makati, etc.)
- **detectBuyingIntent()**: Recognizes purchase signals

### 2. Profile Manager (`src/services/profileManager.ts`)
- **getUserProfile()**: Loads or creates user markdown file
- **saveUserProfile()**: Atomic writes (temp file + rename)
- **updateProfile()**: Async updates without blocking response
- **getAllProfiles()**: Aggregates data for evolution engine

### 3. Prompt Compiler (`src/services/promptCompiler.ts`)
- **compileSystemPrompt()**: Merges all 3 tiers into unified prompt
- Extracts persona-specific slang from Tier 2
- Formats user context from Tier 3
- Injects current funnel objective

### 4. Evolution Worker (`src/services/evolutionWorker.ts`)
- **aggregateSlangCandidates()**: Collects unrecognized terms across users
- **classifySlangTerms()**: Uses LLM structured output to categorize
- **updateArchetypeRegistry()**: Atomically updates Tier 2
- Runs periodically (default: every 60 minutes)
- Threshold: ≥3 users must use a term before classification

### 5. API Route Handler (`src/app/api/chat/completions/route.ts`)
- Validates streaming requirement
- Extracts user ID from headers
- Analyzes incoming message for persona/location/intent
- Compiles system prompt from 3 tiers
- Proxies to OpenAI with SSE streaming
- Accumulates response for profile update
- Non-blocking async profile writes

## 🎥 Frontend Integration

### Agora RTC Web SDK
- Captures webcam video at 640x480, 15fps
- Captures microphone audio at 48kHz
- Periodic frame capture every 5 seconds
- Frames sent as base64 in message content

### React UI (`src/app/page.tsx`)
- Real-time video preview
- Chat interface with streaming responses
- SSE client for token-by-token updates
- User ID generation and persistence

## 📊 Data Flow Example

**User Input**: "Hello broskie"

1. **Frontend**: Captures text + video frame → POST to `/api/chat/completions`
2. **API Route**: 
   - Extracts text: "Hello broskie"
   - Analyzes: Detects "broskie" → BGC Conyo persona (confidence: 2)
   - Loads profile: `user_12345_profile.md`
   - Compiles prompt: Tier 1 + BGC Conyo slang + user context
3. **Gemini**: Processes with vision → Generates response
4. **Streaming**: Tokens stream back via SSE
5. **Profile Update**: Async write to markdown file
6. **Frontend**: Displays response in real-time

## 🔐 Security & Best Practices

### Environment Variables
- `GEMINI_API_KEY`: Server-side only, never exposed to client
- `NEXT_PUBLIC_AGORA_APP_ID`: Client-side, safe to expose

### Atomic File Writes
All markdown updates use:
```typescript
await fs.writeFile(tempPath, content);
await fs.rename(tempPath, finalPath);
```
Prevents corruption from concurrent writes.

### Non-Blocking Updates
Profile updates happen asynchronously:
```typescript
updateProfile(userId, updates).catch(console.error);
```
Never blocks the response stream.

### Type Safety
Full TypeScript coverage with strict mode:
- `ChatMessage`, `UserProfile`, `PersonaAnalysis` interfaces
- Multimodal content type unions
- Compile-time validation

## 🚀 Deployment Considerations

### Scaling
- **Stateless API**: Each request is independent
- **File-based storage**: Simple but not ideal for high concurrency
- **For production**: Consider migrating to database (PostgreSQL, MongoDB)

### Performance
- **Streaming**: Reduces perceived latency
- **Async updates**: Profile writes don't block responses
- **Evolution worker**: Runs in background, doesn't impact requests

### Monitoring
Add logging for:
- Persona detection accuracy
- Funnel stage transitions
- Evolution engine classifications
- API latency and errors

## 🎓 Learning Resources

### Key Concepts
- **Server-Sent Events (SSE)**: One-way streaming from server to client
- **Multimodal AI**: Processing text + images simultaneously
- **Code-switching**: Linguistic phenomenon of alternating languages
- **Atomic operations**: Ensuring data consistency

### Technologies Used
- **Next.js 14**: App Router, Route Handlers, Server Components
- **TypeScript**: Type-safe development
- **Agora RTC**: Real-time video/audio streaming
- **Google Gemini 3.5 Flash**: Latest multimodal AI with vision + chat capabilities
- **Node.js fs/promises**: Async file operations

## 📈 Future Enhancements

### Potential Improvements
1. **Voice Recognition**: Transcribe audio directly instead of text input
2. **Emotion Detection**: Analyze facial expressions from video
3. **Multi-language**: Extend beyond Filipino sub-cultures
4. **A/B Testing**: Compare persona effectiveness
5. **Analytics Dashboard**: Track conversion rates per persona
6. **Database Migration**: Replace markdown with PostgreSQL
7. **Webhook Integration**: Connect to CRM/payment systems
8. **Admin Panel**: Manually review/approve slang classifications

## 🧪 Testing Strategy

### Unit Tests
- `analyzer.ts`: Test persona detection accuracy
- `profileManager.ts`: Test CRUD operations
- `promptCompiler.ts`: Test prompt assembly

### Integration Tests
- API route: Test full request/response cycle
- Evolution worker: Test slang classification

### E2E Tests
- User flow: discovery → converted
- Persona switching mid-conversation
- Visual awareness (camera feed processing)

## 📝 Code Quality

### Best Practices Implemented
- ✅ TypeScript strict mode
- ✅ Async/await for all I/O
- ✅ Error handling with try/catch
- ✅ Atomic file operations
- ✅ Non-blocking updates
- ✅ Modular service architecture
- ✅ Type-safe interfaces
- ✅ Environment variable validation

### Code Organization
- **Services**: Business logic (analyzer, profiles, prompts)
- **Types**: Shared TypeScript interfaces
- **Utils**: Configuration and helpers
- **API Routes**: HTTP handlers
- **App**: UI components

## 🎯 Success Metrics

### Key Performance Indicators
1. **Persona Detection Accuracy**: % of correct classifications
2. **Funnel Conversion Rate**: % reaching "converted" stage
3. **Response Latency**: Time to first token
4. **User Engagement**: Average conversation length
5. **Slang Evolution**: New terms added per week

## 🤝 Contribution Guidelines

### Adding New Personas
1. Define in `data/persona.md`
2. Add section in `data/archetype_type.md`
3. Update `PERSONA_KEYWORDS` in `analyzer.ts`
4. Update TypeScript types

### Modifying Funnel
1. Update `funnel_stage` type in `chat.ts`
2. Add objective in `promptCompiler.ts`
3. Update persona instructions in `persona.md`

## 📞 Support & Maintenance

### Common Tasks
- **View user profiles**: Check `data/profiles/` directory
- **Monitor slang evolution**: Check `data/archetype_type.md`
- **Debug API**: Check browser Network tab + server logs
- **Reset user**: Delete their profile markdown file

### Backup Strategy
- Regular backups of `data/` directory
- Version control for `persona.md` and `archetype_type.md`
- Export user profiles periodically

---

**Built with ❤️ for the Filipino developer community**
