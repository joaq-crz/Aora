# ⚡ Quick Push to GitHub

## 🚀 Fastest Way

### Option 1: Use the Batch Script
Just double-click:
```
push.bat
```

### Option 2: Copy-Paste These Commands
```bash
git init
git add .
git commit -m "feat: Multi-Persona AI Sales Agent with Gemini 3.5 Flash"
git remote add origin https://github.com/joaq-crz/Aora.git
git branch -M main
git push -u origin main
```

## 🔐 Authentication

When it asks for credentials:
- **Username**: `joaq-crz`
- **Password**: Use a Personal Access Token

### Get Token:
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Check `repo` scope
4. Copy token
5. Use as password

## ✅ What Gets Pushed

✅ All source code
✅ Documentation files
✅ package.json
✅ .gitignore
✅ README.md

❌ .env.local (your API key - stays private!)
❌ node_modules (too large)
❌ .next (build files)

## 🎯 After Pushing

Visit: https://github.com/joaq-crz/Aora

You should see:
- All your files
- README displayed
- No .env.local (good!)

## 🔄 Future Updates

```bash
git add .
git commit -m "Your update message"
git push
```

That's it! 🎉
