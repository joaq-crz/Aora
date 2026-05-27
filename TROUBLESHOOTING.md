# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### ❌ Error: "Failed to fetch" or "ERR_EMPTY_RESPONSE"

**Cause**: The API route is crashing or the Gemini API key is not configured.

**Solution**:

1. **Check if `.env.local` exists**:
   ```bash
   # Windows
   dir .env.local
   
   # Should show the file
   ```

2. **Verify API key is set**:
   Open `.env.local` and ensure it has:
   ```env
   GEMINI_API_KEY=your_actual_key_here
   NEXT_PUBLIC_AGORA_APP_ID=your_agora_id_here
   ```

3. **Get a Gemini API key** (if you don't have one):
   - Visit: https://aistudio.google.com/app/apikey
   - Sign in with Google
   - Click "Create API Key"
   - Copy the key and paste it in `.env.local`

4. **Restart the dev server**:
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

5. **Check server logs**:
   Look at your terminal where `npm run dev` is running. You should see error messages there.

---

### ❌ Error: "Gemini API key is not configured"

**Cause**: The `.env.local` file doesn't exist or doesn't have the API key.

**Solution**:

1. **Create `.env.local`** from the example:
   ```bash
   copy .env.local.example .env.local
   ```

2. **Edit `.env.local`** and add your keys:
   ```env
   GEMINI_API_KEY=AIza...your_key_here
   NEXT_PUBLIC_AGORA_APP_ID=your_agora_id
   ```

3. **Restart the server**:
   ```bash
   npm run dev
   ```

---

### ❌ Camera/Microphone Not Working

**Cause**: Browser permissions not granted or Agora App ID missing.

**Solution**:

1. **Check browser permissions**:
   - Click the lock icon in the address bar
   - Ensure Camera and Microphone are set to "Allow"

2. **Use a supported browser**:
   - Chrome (recommended)
   - Edge
   - Firefox (may have issues)

3. **Check Agora App ID**:
   - Verify `NEXT_PUBLIC_AGORA_APP_ID` is set in `.env.local`
   - Get one from: https://console.agora.io/

4. **Restart browser** after granting permissions

---

### ❌ Error: "API key not valid" or 400 Error

**Cause**: Invalid Gemini API key or API key doesn't have access.

**Solution**:

1. **Verify your API key**:
   - Go to: https://aistudio.google.com/app/apikey
   - Check if the key is active
   - Copy it again if needed

2. **Check for extra spaces**:
   ```env
   # ❌ Bad (has spaces)
   GEMINI_API_KEY= AIza...
   
   # ✅ Good (no spaces)
   GEMINI_API_KEY=AIza...
   ```

3. **Create a new API key**:
   - Sometimes keys get disabled
   - Create a fresh one from Google AI Studio

---

### ❌ Error: "Rate limit exceeded"

**Cause**: You've hit the free tier limit (15 requests/minute).

**Solution**:

1. **Wait 1 minute** and try again

2. **Check your usage**:
   - Go to: https://aistudio.google.com/
   - Check your quota usage

3. **Upgrade to paid tier** (if needed):
   - Much higher limits
   - Still very cheap ($0.075/1M tokens)

---

### ❌ No Response from AI

**Cause**: Multiple possible issues.

**Solution**:

1. **Open browser console** (F12):
   - Look for red error messages
   - Check the Network tab for failed requests

2. **Check server terminal**:
   - Look for error messages where `npm run dev` is running
   - Common errors:
     - "GEMINI_API_KEY is not configured"
     - "Failed to fetch"
     - Module import errors

3. **Verify message format**:
   - Ensure you're typing text (not empty)
   - Check that streaming is enabled

4. **Test with simple message**:
   - Type: "hello"
   - Should get a response

---

### ❌ Error: "Module not found"

**Cause**: Dependencies not installed.

**Solution**:

```bash
# Delete node_modules and reinstall
rmdir /s /q node_modules
npm install
```

---

### ❌ TypeScript Errors

**Cause**: Type mismatches or missing types.

**Solution**:

1. **Check for errors**:
   ```bash
   npx tsc --noEmit
   ```

2. **Restart VS Code**:
   - Close and reopen VS Code
   - TypeScript server sometimes needs restart

3. **Clear Next.js cache**:
   ```bash
   rmdir /s /q .next
   npm run dev
   ```

---

### ❌ Persona Not Detected

**Cause**: Not enough keywords or wrong keywords.

**Solution**:

1. **Use more keywords**:
   ```
   # ❌ Not enough
   "Hello"
   
   # ✅ Better
   "Hello broskie, what's up pare?"
   ```

2. **Check keyword list**:
   - See `PERSONA_REFERENCE.md` for all keywords
   - Use 2-3 keywords for reliable detection

3. **Check profile file**:
   - Look in `data/profiles/user_*_profile.md`
   - See what persona was detected

---

### ❌ Profile Not Persisting

**Cause**: File system permissions or user ID changing.

**Solution**:

1. **Check profiles directory**:
   ```bash
   dir data\profiles
   ```

2. **Verify file permissions**:
   - Ensure the app can write to `data/profiles/`

3. **Check user ID**:
   - User ID is generated from timestamp
   - Clearing browser data creates new user

---

### ❌ Visual Comments Not Working

**Cause**: Camera not enabled or images not being sent.

**Solution**:

1. **Enable camera**:
   - Click "Start Camera & Mic"
   - Grant permissions

2. **Check camera preview**:
   - You should see yourself in the video box

3. **Wait for capture**:
   - Frames are captured every 5 seconds
   - Send a message after camera is on

---

## Debugging Checklist

Run through this checklist:

- [ ] `.env.local` file exists
- [ ] `GEMINI_API_KEY` is set in `.env.local`
- [ ] `NEXT_PUBLIC_AGORA_APP_ID` is set in `.env.local`
- [ ] `node_modules` folder exists
- [ ] Server is running (`npm run dev`)
- [ ] Browser console shows no errors (F12)
- [ ] Camera/mic permissions granted
- [ ] Using Chrome or Edge browser
- [ ] On `localhost:3000`

---

## Getting Help

### 1. Check Server Logs
Look at the terminal where `npm run dev` is running. Error messages will appear there.

### 2. Check Browser Console
Press F12 and look at:
- **Console tab**: JavaScript errors
- **Network tab**: Failed API requests

### 3. Verify Environment
```bash
# Check if API key is set (Windows)
echo %GEMINI_API_KEY%

# Should show your key (or nothing if not set)
```

### 4. Test API Key Manually
Visit: https://aistudio.google.com/
- Try the Gemini playground
- If it works there, your key is valid

### 5. Check File Structure
```bash
dir /s /b data
```

Should show:
- `data\persona.md`
- `data\archetype_type.md`
- `data\profiles\`

---

## Quick Fixes

### Reset Everything
```bash
# Stop server (Ctrl+C)

# Delete cache
rmdir /s /q .next
rmdir /s /q node_modules

# Reinstall
npm install

# Restart
npm run dev
```

### Fresh Start
```bash
# Delete user profiles
del data\profiles\*.md

# Restart server
npm run dev
```

### Verify Setup
```bash
npm run verify
```

This will check:
- Required files exist
- Environment variables configured
- Dependencies installed

---

## Still Having Issues?

1. **Read the error message carefully**
   - Most errors tell you exactly what's wrong

2. **Check documentation**:
   - `README.md` - Complete docs
   - `SETUP.md` - Setup guide
   - `GEMINI_MIGRATION.md` - Gemini specifics

3. **Verify API keys**:
   - Gemini: https://aistudio.google.com/app/apikey
   - Agora: https://console.agora.io/

4. **Check system requirements**:
   - Node.js 18+
   - Modern browser (Chrome/Edge)
   - Internet connection

---

**Most issues are solved by:**
1. Setting the `GEMINI_API_KEY` in `.env.local`
2. Restarting the dev server
3. Clearing browser cache
