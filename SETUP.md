# Quick Setup Guide

## Step-by-Step Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Get Your API Keys

#### Google Gemini API Key
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy the key

#### Agora App ID
1. Go to https://console.agora.io/
2. Create a new project
3. Copy the App ID from project settings

### 3. Configure Environment
Create `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your-gemini-key-here
NEXT_PUBLIC_AGORA_APP_ID=your-agora-app-id-here
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Open Browser
Navigate to: http://localhost:3000

## Testing the System

### Test Scenario 1: BGC Conyo Persona
```
1. Start camera/mic
2. Type: "Hello broskie"
3. Expected: AI responds in BGC Conyo style
4. Type: "wala naman bro, like just heading to bgc later"
5. Expected: AI comments on location, asks about plans
```

### Test Scenario 2: Beki Persona
```
1. Type: "Hoy baks, kamusta ka na?"
2. Expected: AI switches to Beki persona
3. Type: "Ganda ng outfit mo charot"
4. Expected: AI responds with gay lingo
```

### Test Scenario 3: Visual Awareness
```
1. Ensure camera is on
2. Wear something distinctive (bright color, logo, etc.)
3. Type a message
4. Expected: AI may comment on what it sees
```

## Verifying Installation

### Check 1: Dependencies Installed
```bash
npm list next react agora-rtc-sdk-ng openai
```

### Check 2: Environment Variables
```bash
# On Windows
echo %OPENAI_API_KEY%

# Should show your API key
```

### Check 3: Data Directory Structure
Verify these folders exist:
- `data/`
- `data/profiles/`
- Files: `data/persona.md`, `data/archetype_type.md`

### Check 4: TypeScript Compilation
```bash
npx tsc --noEmit
```
Should show no errors.

## Common Issues

### Issue: "Module not found" errors
**Solution**: Run `npm install` again

### Issue: Camera not working
**Solution**: 
- Use HTTPS (localhost is OK)
- Check browser permissions
- Try different browser (Chrome recommended)

### Issue: API returns 401 Unauthorized
**Solution**: 
- Verify Gemini API key is correct
- Check key is enabled in Google AI Studio
- Ensure API key has proper permissions

### Issue: No response from AI
**Solution**:
- Check browser console for errors
- Verify `.env.local` file exists
- Restart dev server after changing env vars

## Production Deployment

### Environment Variables
Set these in your hosting platform:
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_AGORA_APP_ID`

### Build Command
```bash
npm run build
```

### Start Command
```bash
npm start
```

### Recommended Platforms
- Vercel (easiest for Next.js)
- Railway
- Render
- AWS/GCP/Azure

## Next Steps

1. **Customize Personas**: Edit `data/persona.md`
2. **Add Slang Terms**: Update `data/archetype_type.md`
3. **Modify UI**: Edit `src/app/page.tsx` and `page.module.css`
4. **Enable Evolution**: Add evolution worker to API route
5. **Add Analytics**: Track funnel conversions

## Support

For issues or questions:
1. Check the main README.md
2. Review TypeScript errors in console
3. Check Network tab for API errors
4. Verify file permissions for `data/` directory
