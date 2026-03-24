# Quick Start Guide

## 🎯 For Testing/Running the Application

### 1. Setup Backend (5 minutes)

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Edit .env and add your OpenRouter API key
# OPENROUTER_API_KEY=sk-or-v1-your-key-here

# (Optional) Choose a free model for testing
# LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free

# Start backend
npm run dev
```

Backend will run on `http://localhost:3001`

### 2. Setup Frontend (2 minutes)

In a new terminal:

```bash
# From project root directory
npm install

# Start frontend
npm run dev
```

Frontend will run on `http://localhost:5173`

### 3. Use the App

1. Open `http://localhost:5173` in your browser
2. Navigate to **Upload** page
3. Upload a PDF file (any PDF - test with course materials, papers, etc.)
4. Wait for processing (~30 seconds)
5. Go to **Search** page
6. Ask questions like:
   - "What is this document about?"
   - "Summarize the key points"
   - "What does it say about [topic]?"

## 🔑 Getting an OpenRouter API Key

**Option 1: Use free models (recommended for students)**
1. Go to https://openrouter.ai/
2. Sign in with Google/GitHub
3. Go to https://openrouter.ai/keys
4. Click "Create Key"
5. Copy the key (starts with `sk-or-v1-`)
6. **No credit card needed!**

**Option 2: Use paid models**
1. Same steps as above
2. Add credits at https://openrouter.ai/credits (min $5)
3. Credits never expire

**Cost for testing:**
- **With free models**: $0 for queries + ~$0.04/month for embeddings
- **With paid models**: ~$0.10-0.50 for typical testing

## ⚡ Common Issues

### Backend won't start
- Check `.env` file exists in `server/` folder
- Verify `OPENROUTER_API_KEY` is set correctly
- Run `npm install` in server directory
- Key should start with `sk-or-v1-`

### Frontend shows "Search failed"
- Make sure backend is running on port 3001
- Check browser console for errors
- Verify you uploaded at least one document

### "Invalid API key" error
- Double-check API key in `server/.env`
- Ensure no extra spaces
- Verify key starts with `sk-or-v1-`
- Get a new key from https://openrouter.ai/keys

## 📚 Test Documents

Good documents for testing:
- Course syllabus
- Research papers (PDF)
- Policy documents
- Textbooks chapters
- Any structured PDF content

**Size limit:** 10MB per file

## 🎓 For Demonstration

**Impressive features to show:**
1. Upload multiple documents at once
2. Real-time processing progress
3. Ask complex questions
4. Show source citations (page numbers)
5. Demonstrate chat history
6. Show confidence levels (high/partial/low)

**Sample questions:**
- "What are the main topics covered?"
- "Explain [specific concept] mentioned in the document"
- "What is the conclusion or summary?"
- "What does it say about [keyword]?"

## 📞 Need Help?

See full documentation:
- [API Key Setup Guide](./API_KEY_SETUP.md)
- [Backend README](./server/README.md)
- [Main README](./README.md)
