# Multi-Persona AI Sales Agent

A standalone Next.js application featuring an AI sales agent with dynamic persona adaptation based on Filipino sub-culture linguistic patterns. The system uses real-time video/audio streaming via Agora RTC and a sophisticated 3-tier markdown-based personality system.

## 🎯 Core Features

### Dynamic Mirroring via Cultural Persona Adaptation
- **Real-time Persona Detection**: Analyzes user language patterns to identify sub-culture archetype
- **Three Personas**: BGC Conyo, Youngstunna, and Beki
- **Adaptive Communication**: Dynamically adjusts vocabulary, tone, and style to mirror the user
- **Visual Awareness**: Processes camera feed to comment on style, clothing, and environment

### 3-Tier Markdown Data Model
1. **Tier 1 - `data/persona.md`**: Immutable persona blueprints and core mechanics
2. **Tier 2 - `data/archetype_type.md`**: Self-evolving slang dictionaries per persona
3. **Tier 3 - `data/profiles/user_{id}_profile.md`**: Persistent user CRM data

### Intelligent Sales Funnel
- **discovery**: Initial rapport building
- **context_built**: Understanding user needs and situation
- **pitch_ready**: Identified opportunity for product introduction
- **soft_close**: Natural product presentation within conversation
- **converted**: User expresses buying intent

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Next.js Frontend (Agora RTC Web SDK)  │
│  - Video/Audio Capture                  │
│  - Real-time Streaming                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  API Route: /api/chat/completions       │
│  - Persona Analysis                     │
│  - Profile Management                   │
│  - Prompt Compilation                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  OpenAI GPT-4o (Vision + Chat)         │
│  - Multimodal Processing                │
│  - SSE Streaming Response               │
└─────────────────────────────────────────┘
```

## 📁 Project Structure

```
/
├── data/
│   ├── persona.md              # Tier 1: Static persona definitions
│   ├── archetype_type.md       # Tier 2: Evolving slang registry
│   └── profiles/               # Tier 3: User-specific CRM files
│       └── user_{id}_profile.md
│
├── src/
│   ├── app/
│   │   ├── api/chat/completions/
│   │   │   └── route.ts        # Core API handler
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Main UI with Agora integration
│   │   └── globals.css
│   │
│   ├── services/
│   │   ├── analyzer.ts         # Text extraction & persona detection
│   │   ├── profileManager.ts   # User profile CRUD operations
│   │   ├── promptCompiler.ts   # 3-tier prompt assembly
│   │   └── evolutionWorker.ts  # Autonomous slang evolution
│   │
│   ├── types/
│   │   └── chat.ts             # TypeScript interfaces
│   │
│   └── utils/
│       └── agoraConfig.ts      # Agora SDK configuration
│
├── package.json
├── tsconfig.json
└── next.config.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Google Gemini API key
- Agora App ID (for video/audio streaming)

### Installation

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:
Create a `.env.local` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id_here
```

3. **Run development server**:
```bash
npm run dev
```

4. **Open browser**:
Navigate to `http://localhost:3000`

## 🎮 Usage

### Starting a Conversation

1. Click "Start Camera & Mic" to enable video/audio
2. Type a message in the chat input
3. The AI will analyze your language and adapt its persona
4. Continue the conversation naturally

### Example Interaction (BGC Conyo Persona)

```
User: "Hello broskie"
AI: "Yo what's up pare, what's going broskie?"

User: "wala naman bro, like just heading to bgc later pare hbu"
AI: "gagi pare you're going to BGC? Clean fit by the way, white polo looks clean. 
     Bet you're gonna hit up some shawtys later?"

User: "syempre naman pare, marami nga naman talagang shawty sa bgc"
AI: "legit pare, dami ngang shawty sa bgc, bet you should grab their number, noh? 
     But like, syempre you need a solid pen broskie, para malist down names ng 
     shawty line up manually. Classic moves."
```

## 🧠 How It Works

### 1. Persona Detection
The `analyzer.ts` service scans incoming messages for linguistic markers:
- **BGC Conyo**: broskie, pare, shawty, gagi, like, legit, bet
- **Youngstunna**: pre, idol, boss, solid, petmalu, lodi
- **Beki**: charot, mima, baks, ateh, kalurks, werq

### 2. Profile Management
Each user gets a persistent markdown file tracking:
- Detected persona and confidence score
- Interaction history
- Visual notes from camera feed
- Current funnel stage
- Unrecognized slang candidates

### 3. Prompt Compilation
Before each LLM call, the system:
1. Reads the immutable persona blueprint
2. Extracts persona-specific slang from the evolving registry
3. Loads user's historical context
4. Compiles into a unified system prompt

### 4. Evolution Engine
Runs periodically to:
1. Aggregate unrecognized slang across all users
2. Identify terms meeting frequency threshold (≥3 users)
3. Classify terms using LLM structured output
4. Update `archetype_type.md` atomically

## 🔧 Configuration

### Agora Settings
Edit `src/utils/agoraConfig.ts`:
```typescript
export const agoraConfig = {
  videoConfig: {
    width: 640,
    height: 480,
    frameRate: 15,
  },
  captureInterval: 5000, // Frame capture frequency (ms)
};
```

### Evolution Worker
Start the autonomous evolution engine:
```typescript
import { startEvolutionWorker } from '@/services/evolutionWorker';

// Run every 60 minutes
startEvolutionWorker(60);
```

## 📊 Data Persistence

All data is stored locally in markdown files:
- **Profiles**: `data/profiles/user_{id}_profile.md`
- **Slang Registry**: `data/archetype_type.md`
- **Persona Blueprint**: `data/persona.md` (read-only)

Files use atomic writes (temp file + rename) to prevent corruption.

## 🎨 Customization

### Adding New Personas
1. Edit `data/persona.md` to add persona definition
2. Add section in `data/archetype_type.md` for slang dictionary
3. Update `PERSONA_KEYWORDS` in `src/services/analyzer.ts`

### Modifying Sales Funnel
Edit funnel stages in `src/types/chat.ts`:
```typescript
funnel_stage: 'discovery' | 'context_built' | 'pitch_ready' | 'soft_close' | 'converted'
```

## 🔒 Security Notes

- Never commit `.env.local` to version control
- API keys are server-side only (not exposed to client)
- User profiles contain PII - handle according to privacy regulations
- Implement rate limiting for production deployments

## 📝 License

MIT License - feel free to use for commercial projects

## 🤝 Contributing

This is a standalone project. Feel free to fork and customize for your needs.

## 🐛 Troubleshooting

### Camera/Mic not working
- Check browser permissions
- Ensure HTTPS (required for WebRTC)
- Verify Agora App ID is configured

### API errors
- Confirm Gemini API key is valid
- Check API key is enabled for Gemini 2.0 Flash
- Verify network connectivity

### Profile not persisting
- Ensure `data/profiles/` directory exists
- Check file system permissions
- Verify user_id is being passed correctly

## 📚 Resources

- [Agora RTC Web SDK Docs](https://docs.agora.io/en/video-calling/get-started/get-started-sdk)
- [Google Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
