# 🎭 Multi-Persona AI Sales Agent

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Gemini](https://img.shields.io/badge/Gemini-3.5%20Flash-orange)](https://ai.google.dev/)

An AI sales agent that dynamically adapts its personality based on Filipino sub-culture linguistic patterns. Features real-time video analysis, persistent user profiling, and a sophisticated 3-tier markdown personality system.

## ✨ Key Features

- 🎭 **3 Dynamic Personas**: BGC Conyo, Youngstunna, Beki
- 👁️ **Visual Awareness**: Analyzes camera feed to comment on style and environment
- 🧠 **Persistent Memory**: Remembers users across sessions
- 💬 **Natural Conversations**: Seamlessly guides through sales funnel
- 🔄 **Self-Evolving**: Learns new slang automatically
- ⚡ **Real-time Streaming**: Token-by-token responses

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/joaq-crz/Aora.git
cd Aora
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
# Copy the example file
copy .env.local.example .env.local

# Edit .env.local and add your Gemini API key
GEMINI_API_KEY=your_key_here
```

Get your free Gemini API key: https://aistudio.google.com/app/apikey

### 4. Run Development Server
```bash
npm run dev
```

### 5. Open Browser
Navigate to http://localhost:3000

### 6. Test It!
- Click "🎥 Start Camera & Mic"
- Type: `Hello broskie`
- Watch the AI respond in BGC Conyo style!

## 🎭 The Three Personas

### 🏙️ BGC Conyo
Upper-class Manila youth with seamless Taglish
```
User: "Hello broskie"
AI: "Yo what's up pare, what's going broskie?"
```

### 💪 Youngstunna
Street-smart hustler with heavy Tagalog
```
User: "Ano pre, kumusta?"
AI: "Eto pre, okay naman. Ikaw?"
```

### 💅 Beki
LGBTQ+ expressive personality with gay lingo
```
User: "Hoy baks, kamusta ka na?"
AI: "Hoy ateh! Okay naman, ikaw? Ganda mo today!"
```

## 🏗️ Architecture

```
User Input → Persona Detection → Profile Loading → Prompt Compilation
→ Gemini 3.5 Flash → Streaming Response → Profile Update
```

### 3-Tier Markdown System
1. **Tier 1**: Immutable persona blueprints (`data/persona.md`)
2. **Tier 2**: Evolving slang dictionaries (`data/archetype_type.md`)
3. **Tier 3**: Persistent user profiles (`data/profiles/user_*.md`)

## 📊 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **AI Model**: Google Gemini 3.5 Flash
- **Styling**: CSS Modules
- **Storage**: File-based (Markdown)

## 🎯 Use Cases

- Sales agents with cultural adaptation
- Customer service chatbots
- Language learning applications
- Cultural research tools
- Persona-based marketing

## 📚 Documentation

- [Quick Start Guide](QUICKSTART.md)
- [Setup Instructions](SETUP.md)
- [Project Overview](PROJECT_OVERVIEW.md)
- [Persona Reference](PERSONA_REFERENCE.md)
- [Troubleshooting](TROUBLESHOOTING.md)

## 🔧 Configuration

### Environment Variables
```env
GEMINI_API_KEY=your_gemini_api_key
```

### Customization
- **Add Personas**: Edit `data/persona.md`
- **Modify Slang**: Update `data/archetype_type.md`
- **Change UI**: Edit `src/app/page.tsx`

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

Add `GEMINI_API_KEY` in Vercel dashboard.

### Other Platforms
- Railway
- Render
- AWS/GCP/Azure

## 💰 Cost

- **Gemini API**: FREE tier (15 RPM, 1,500/day)
- **Paid**: $0.075 per 1M tokens (33x cheaper than GPT-4o)

## 🤝 Contributing

Contributions welcome! Feel free to:
- Add new personas
- Improve slang detection
- Enhance UI/UX
- Add features

## 📝 License

MIT License - feel free to use for commercial projects

## 🙏 Acknowledgments

- Google Gemini for the amazing AI model
- Filipino developer community for cultural insights
- Next.js team for the excellent framework

## 📞 Support

- Issues: https://github.com/joaq-crz/Aora/issues
- Discussions: https://github.com/joaq-crz/Aora/discussions

---

**Built with ❤️ for the Filipino developer community**

⭐ Star this repo if you find it useful!
