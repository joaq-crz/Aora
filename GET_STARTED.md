# 🚀 Get Started in 3 Minutes

## What You're Building

An AI sales agent that:
- 🎭 Adapts its personality based on how you speak (3 Filipino personas)
- 👁️ Sees you through your camera and comments on your style
- 💬 Has natural conversations that guide toward sales
- 🧠 Remembers you across sessions
- 🔄 Learns new slang automatically

## Quick Setup

### 1️⃣ Install (30 seconds)
```bash
npm install
```

### 2️⃣ Get Free API Keys (2 minutes)

**Gemini API Key** (FREE - no credit card):
1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy it

**Agora App ID** (FREE):
1. Visit: https://console.agora.io/
2. Sign up/login
3. Create new project
4. Copy App ID

### 3️⃣ Configure (30 seconds)
```bash
# Copy the example file
copy .env.local.example .env.local

# Edit .env.local and paste your keys:
GEMINI_API_KEY=paste_your_gemini_key_here
NEXT_PUBLIC_AGORA_APP_ID=paste_your_agora_id_here
```

### 4️⃣ Run (10 seconds)
```bash
npm run dev
```

### 5️⃣ Test (1 minute)
1. Open: http://localhost:3000
2. Click "Start Camera & Mic"
3. Type: `Hello broskie`
4. Watch the AI respond in BGC Conyo style! 🎉

## Test All 3 Personas

### 🏙️ BGC Conyo (Upper-class Manila youth)
```
You: "Hello broskie"
AI: "Yo what's up pare, what's going broskie?"

You: "wala naman bro, like just heading to bgc later"
AI: "Nice pare! BGC vibes, legit. What's the plan?"
```

### 💪 Youngstunna (Street-smart hustler)
```
You: "Ano pre, kumusta?"
AI: "Eto pre, okay naman. Ikaw?"

You: "Raket lang boss, diskarte everyday"
AI: "Solid pre! Yan ang gusto ko, laban lang!"
```

### 💅 Beki (LGBTQ+ expressive)
```
You: "Hoy baks, kamusta ka na?"
AI: "Hoy ateh! Okay naman, ikaw? Ganda mo today!"

You: "Charot lang, kalurks ako"
AI: "Ay nako baks, bakit naman? Chika mo sa akin!"
```

## What Happens Behind the Scenes

```
Your message
    ↓
Persona Detection (analyzes your slang)
    ↓
Profile Loading (remembers you)
    ↓
Prompt Compilation (3-tier markdown system)
    ↓
Gemini 2.0 Flash (processes with vision)
    ↓
Streaming Response (real-time tokens)
    ↓
Profile Update (saves context)
```

## Check Your Profile

After chatting, check:
```
data/profiles/user_[timestamp]_profile.md
```

You'll see:
- Detected persona
- Conversation history
- Visual notes (if camera was on)
- Current sales funnel stage
- Unrecognized slang you used

## The 3-Tier System

### Tier 1: `data/persona.md`
- Immutable persona definitions
- Never changes
- The "DNA" of each personality

### Tier 2: `data/archetype_type.md`
- Evolving slang dictionaries
- Grows as users introduce new terms
- Shared across all users

### Tier 3: `data/profiles/user_*.md`
- Your personal CRM file
- Remembers your context
- Persists across sessions

## Sales Funnel Stages

Watch the AI naturally progress through:

1. **discovery** → Building rapport
2. **context_built** → Understanding your needs
3. **pitch_ready** → Identified opportunity
4. **soft_close** → Natural product mention
5. **converted** → You ask for the link!

Try saying: `"drop the link"` to trigger conversion!

## Visual Awareness

With camera on, the AI will comment on:
- Your clothing ("Clean white polo!")
- Your setting ("Coffee shop vibes?")
- Your style ("Fresh haircut pare?")

## Customization

### Add Your Own Slang
Edit `data/archetype_type.md`:
```markdown
## BGC Conyo Slang Dictionary
- your_new_word
```

### Modify Personas
Edit `data/persona.md` to change:
- Personality traits
- Language patterns
- Sales approach

### Change UI
Edit `src/app/page.tsx` and `page.module.css`

## Troubleshooting

### Camera not working?
- Allow browser permissions
- Use Chrome or Edge
- Check you're on localhost

### No AI response?
- Check browser console (F12)
- Verify API keys in `.env.local`
- Restart server: `npm run dev`

### "API key not valid"?
- Get new key from https://aistudio.google.com/app/apikey
- Make sure it's in `.env.local`
- Restart server

## Next Steps

### Beginner
- ✅ Test all 3 personas
- ✅ Enable camera and see visual comments
- ✅ Check your profile file
- ✅ Try triggering conversion

### Intermediate
- 📝 Add custom slang terms
- 🎨 Customize the UI
- 📊 Track funnel progression
- 🔧 Modify persona definitions

### Advanced
- 🗄️ Replace markdown with database
- 📈 Add analytics dashboard
- 💳 Integrate payment system
- 🚀 Deploy to production

## Documentation

- **README.md** - Complete documentation
- **QUICKSTART.md** - 5-minute guide
- **SETUP.md** - Detailed setup
- **PROJECT_OVERVIEW.md** - Architecture
- **PERSONA_REFERENCE.md** - Testing guide
- **GEMINI_MIGRATION.md** - Why Gemini?
- **CHANGES_SUMMARY.md** - What changed

## Why Gemini?

- ✅ **FREE** - No credit card needed
- ✅ **FAST** - 1-2s response time
- ✅ **CHEAP** - 33x cheaper than GPT-4o
- ✅ **POWERFUL** - 1M token context
- ✅ **MULTIMODAL** - Native vision support

## Deploy to Production

### Vercel (Easiest)
```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard.

### Other Platforms
- Railway
- Render
- AWS/GCP/Azure

## Get Help

1. Check documentation files
2. Review browser console
3. Verify environment variables
4. Check `data/profiles/` for user data

## Success Checklist

- ✅ `npm install` completed
- ✅ API keys configured in `.env.local`
- ✅ Server running on http://localhost:3000
- ✅ Camera/mic permissions granted
- ✅ AI responds in correct persona
- ✅ Profile file created in `data/profiles/`
- ✅ Visual comments when camera is on

## 🎉 You're Ready!

Start building rapport and closing sales with your multi-persona AI agent!

**Pro Tip**: Wear something distinctive and enable the camera to see the AI comment on your style in real-time!

---

**Questions? Check the other documentation files or the code comments!**
