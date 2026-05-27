# 🚀 Quick Start Guide

Get your Multi-Persona AI Sales Agent running in 5 minutes!

## Prerequisites
- Node.js 18 or higher
- Google Gemini API key (free tier available)
- Agora App ID (free tier available)

## Installation Steps

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Configure Environment
Copy the example environment file:
```bash
copy .env.local.example .env.local
```

Edit `.env.local` and add your keys:
```env
GEMINI_API_KEY=your-gemini-key-here
NEXT_PUBLIC_AGORA_APP_ID=your-agora-app-id-here
```

### 3️⃣ Verify Setup
```bash
npm run verify
```

This will check:
- ✅ All required files exist
- ✅ Directories are properly structured
- ✅ Environment variables are configured
- ✅ Dependencies are installed

### 4️⃣ Start Development Server
```bash
npm run dev
```

### 5️⃣ Open Browser
Navigate to: **http://localhost:3000**

## First Test

### Test the BGC Conyo Persona
1. Click **"Start Camera & Mic"**
2. Type: `Hello broskie`
3. Expected response: `"Yo what's up pare, what's going broskie?"`
4. Continue: `wala naman bro, like just heading to bgc later`
5. AI should comment on your plans and possibly your appearance

### Test Persona Switching
1. Type: `Hoy baks, kamusta ka na?`
2. AI should switch to Beki persona
3. Expected style: Expressive, uses "ateh", "charot", "ganda"

## 📚 Documentation

- **README.md** - Complete project documentation
- **SETUP.md** - Detailed setup instructions
- **PROJECT_OVERVIEW.md** - Technical architecture deep-dive
- **PERSONA_REFERENCE.md** - Persona testing guide

## 🆘 Troubleshooting

### "Module not found" errors
```bash
npm install
```

### Camera not working
- Check browser permissions (allow camera/mic)
- Use Chrome or Edge (best compatibility)
- Ensure you're on localhost (HTTPS not required)

### No AI response
- Check browser console (F12) for errors
- Verify `.env.local` has correct API keys
- Restart dev server after changing env vars
- Check Gemini API key is valid and enabled

### TypeScript errors
```bash
npx tsc --noEmit
```

## 🎯 What to Test

### Core Features
- ✅ Persona detection (BGC Conyo, Youngstunna, Beki)
- ✅ Visual awareness (comments on clothing/setting)
- ✅ Sales funnel progression
- ✅ Profile persistence (refresh page, continue conversation)
- ✅ Streaming responses (real-time token display)

### Advanced Features
- ✅ Persona switching mid-conversation
- ✅ Location detection (mention "BGC", "Makati")
- ✅ Buying intent detection (say "drop the link")
- ✅ Unrecognized slang tracking (check profile files)

## 📁 Key Files to Explore

### Data Files
- `data/persona.md` - Persona definitions (read-only)
- `data/archetype_type.md` - Slang dictionaries (evolving)
- `data/profiles/user_*_profile.md` - User CRM data (created on first interaction)

### Code Files
- `src/app/api/chat/completions/route.ts` - Main API handler
- `src/services/analyzer.ts` - Persona detection logic
- `src/services/promptCompiler.ts` - Prompt assembly
- `src/app/page.tsx` - Frontend UI

## 🎓 Learning Path

### Beginner
1. Read README.md
2. Test all 3 personas
3. Check generated profile files
4. Modify slang keywords in `data/archetype_type.md`

### Intermediate
1. Read PROJECT_OVERVIEW.md
2. Explore service files in `src/services/`
3. Modify persona definitions in `data/persona.md`
4. Add custom funnel stages

### Advanced
1. Implement evolution worker in API route
2. Add database instead of markdown files
3. Integrate payment system
4. Add analytics dashboard
5. Deploy to production

## 🚢 Deployment

### Quick Deploy to Vercel
```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard:
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_AGORA_APP_ID`

### Other Platforms
- **Railway**: Connect GitHub repo, add env vars
- **Render**: Deploy as Web Service
- **AWS/GCP/Azure**: Use Docker or direct deployment

## 📊 Monitoring

### Check User Profiles
```bash
Get-ChildItem data/profiles/
```

### View Slang Evolution
```bash
Get-Content data/archetype_type.md
```

### Check Logs
Browser console (F12) shows:
- API requests/responses
- Persona detection results
- Streaming chunks
- Errors

## 🎉 Success Indicators

You'll know it's working when:
- ✅ AI responds in detected persona style
- ✅ Comments on your appearance from camera
- ✅ Naturally progresses through sales funnel
- ✅ Profile file created in `data/profiles/`
- ✅ Conversation feels natural and engaging

## 🔗 Useful Commands

```bash
# Install dependencies
npm install

# Verify setup
npm run verify

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check TypeScript
npx tsc --noEmit

# Format code (if prettier installed)
npx prettier --write .
```

## 💡 Pro Tips

1. **Use Chrome DevTools**: Network tab shows SSE streaming
2. **Check Profile Files**: See how AI tracks your context
3. **Test Visual Awareness**: Wear something distinctive
4. **Try Location Mentions**: Say "BGC", "Makati", etc.
5. **Test Buying Intent**: Say "drop the link" to trigger conversion

## 🎯 Next Steps

After getting it running:
1. ⭐ Customize personas in `data/persona.md`
2. 🎨 Modify UI in `src/app/page.tsx`
3. 🧠 Add more slang terms to `data/archetype_type.md`
4. 📊 Implement analytics tracking
5. 🚀 Deploy to production

## 📞 Need Help?

1. Check **SETUP.md** for detailed instructions
2. Read **PROJECT_OVERVIEW.md** for architecture
3. Review **PERSONA_REFERENCE.md** for testing
4. Check browser console for errors
5. Verify environment variables are set

---

**Ready to build rapport and close sales! 🎉**
