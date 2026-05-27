# 🚀 Push to GitHub Guide

## Your Repository
https://github.com/joaq-crz/Aora.git

## Quick Commands

### 1. Initialize Git (if not already done)
```bash
git init
```

### 2. Add Remote Repository
```bash
git remote add origin https://github.com/joaq-crz/Aora.git
```

### 3. Check What Will Be Committed
```bash
git status
```

### 4. Add All Files
```bash
git add .
```

### 5. Commit Your Changes
```bash
git commit -m "Initial commit: Multi-Persona AI Sales Agent with Gemini 3.5 Flash"
```

### 6. Push to GitHub
```bash
git push -u origin main
```

If it asks for `master` instead of `main`:
```bash
git branch -M main
git push -u origin main
```

## 🔐 Authentication

### If Using HTTPS (Recommended)
GitHub will ask for credentials:
- **Username**: joaq-crz
- **Password**: Use a Personal Access Token (not your GitHub password)

### Get Personal Access Token:
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full control)
4. Copy the token
5. Use it as password when pushing

### Or Use GitHub CLI (Easier):
```bash
# Install GitHub CLI first
winget install GitHub.cli

# Login
gh auth login

# Push
git push -u origin main
```

## 📋 Complete Step-by-Step

### Step 1: Check Git Status
```bash
git status
```

### Step 2: Stage All Files
```bash
git add .
```

### Step 3: Verify What's Staged
```bash
git status
```

You should see:
- ✅ All source files
- ✅ Documentation files
- ✅ package.json
- ✅ .gitignore
- ❌ .env.local (should be ignored)
- ❌ node_modules (should be ignored)

### Step 4: Commit
```bash
git commit -m "feat: Multi-Persona AI Sales Agent

- Implemented 3 Filipino personas (BGC Conyo, Youngstunna, Beki)
- Integrated Gemini 3.5 Flash for multimodal AI
- Added native camera/mic support for visual awareness
- Built 3-tier markdown personality system
- Created persistent user profiles
- Implemented sales funnel tracking
- Added real-time streaming responses"
```

### Step 5: Add Remote (if not already added)
```bash
git remote add origin https://github.com/joaq-crz/Aora.git
```

If you get "remote origin already exists":
```bash
git remote set-url origin https://github.com/joaq-crz/Aora.git
```

### Step 6: Push
```bash
git push -u origin main
```

## ⚠️ Important: Verify .gitignore

Make sure `.env.local` is NOT pushed (it contains your API key):

```bash
git status
```

Should show:
```
Untracked files:
  .env.local
```

If `.env.local` is staged (bad!):
```bash
git reset .env.local
```

## 🔍 Verify .gitignore Contents

Your `.gitignore` should include:
```
# Local env files
.env*.local
.env

# Dependencies
node_modules/

# Next.js
/.next/
/out/

# User profiles (optional)
data/profiles/*.md
!data/profiles/.gitkeep
```

## 📝 Good Commit Messages

### For Initial Push:
```bash
git commit -m "Initial commit: Multi-Persona AI Sales Agent"
```

### For Future Updates:
```bash
# New feature
git commit -m "feat: Add new persona detection algorithm"

# Bug fix
git commit -m "fix: Resolve camera permission issue"

# Documentation
git commit -m "docs: Update README with setup instructions"

# Refactor
git commit -m "refactor: Simplify prompt compilation logic"
```

## 🌿 Branch Strategy (Optional)

### Create Development Branch:
```bash
git checkout -b develop
git push -u origin develop
```

### Create Feature Branch:
```bash
git checkout -b feature/new-persona
# Make changes
git add .
git commit -m "feat: Add new persona"
git push -u origin feature/new-persona
```

## 🔄 Future Updates

### After Making Changes:
```bash
# Check what changed
git status

# Stage changes
git add .

# Commit
git commit -m "Your commit message"

# Push
git push
```

## 🆘 Common Issues

### Issue: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/joaq-crz/Aora.git
```

### Issue: "failed to push some refs"
```bash
# Pull first
git pull origin main --rebase

# Then push
git push -u origin main
```

### Issue: "Authentication failed"
- Use Personal Access Token, not password
- Or use GitHub CLI: `gh auth login`

### Issue: ".env.local was pushed by mistake"
```bash
# Remove from git but keep locally
git rm --cached .env.local
git commit -m "Remove .env.local from tracking"
git push
```

## 📊 Verify on GitHub

After pushing, check:
1. Go to: https://github.com/joaq-crz/Aora
2. Verify all files are there
3. Check that `.env.local` is NOT visible
4. README.md should display nicely

## 🎯 Recommended GitHub Settings

### Add Repository Description:
"Multi-Persona AI Sales Agent with dynamic Filipino persona adaptation using Gemini 3.5 Flash"

### Add Topics:
- ai
- chatbot
- gemini
- nextjs
- typescript
- sales-agent
- filipino
- multimodal
- persona

### Add README Badge:
```markdown
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Gemini](https://img.shields.io/badge/Gemini-3.5%20Flash-orange)
```

## ✅ Checklist Before Pushing

- [ ] `.env.local` is in `.gitignore`
- [ ] `node_modules/` is in `.gitignore`
- [ ] All documentation files are included
- [ ] README.md is complete
- [ ] No sensitive data in code
- [ ] Code is tested and working
- [ ] Commit message is descriptive

## 🎉 You're Ready!

Run these commands in order:
```bash
git init
git add .
git commit -m "Initial commit: Multi-Persona AI Sales Agent"
git remote add origin https://github.com/joaq-crz/Aora.git
git push -u origin main
```

**Your code will be on GitHub! 🚀**
