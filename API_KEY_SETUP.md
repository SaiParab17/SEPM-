# 🔑 API Key Configuration Guide - OpenRouter

This guide will walk you through setting up OpenRouter API for DocuMind Insight's LLM-powered document Q&A system.

## Overview

DocuMind Insight uses **OpenRouter** - a unified API gateway that gives you access to:
- **Multiple LLM providers**: OpenAI, Anthropic, Google, Meta, and more
- **Better pricing**: Often cheaper than direct API access
- **Free models**: Some models are completely free!
- **One API key**: Access all providers with a single key

OpenRouter provides:
- **Embeddings**: Converting text into vector representations (OpenAI models)
- **LLM Responses**: Generating intelligent answers (multiple providers to choose from)

## Why OpenRouter?

✅ **Cheaper** - Better pricing than direct API access  
✅ **More choice** - 100+ models from different providers  
✅ **Free options** - Several free models available  
✅ **One API key** - No need to manage multiple provider keys  
✅ **Easy switching** - Change models without changing code  

## Step 1: Create OpenRouter Account

1. Visit [OpenRouter](https://openrouter.ai/)
2. Click **Sign In** (top right)
3. Sign up with:
   - Google account (easiest)
   - GitHub account
   - Or email/password

**No credit card required for free models!**

## Step 2: Generate API Key

1. After signing in, go to [Keys page](https://openrouter.ai/keys)
2. Click **Create Key**
3. Give it a name (e.g., "DocuMind Insight")
4. Copy the key immediately
   - Format: `sk-or-v1-xxxxxxxxxxxxxxxxxxxx`

⚠️ **Important**: Store this key securely! Never commit it to version control.

## Step 3: Add Credits (Optional)

### For Free Models
Skip this step! You can use free models immediately.

### For Paid Models
1. Go to [Credits page](https://openrouter.ai/credits)
2. Add credits (minimum $5)
3. Credits never expire!

💡 **Tip**: Start with $5 - it goes a long way!

## Step 4: Configure Backend

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Copy 5: Verify Configuration

Start the backend server:
```bash
npm run dev
```

You should see:
```
🚀 DocuMind Insight Backend Server
═══════════════════════════════════
📡 Server running on: http://localhost:3001
🤖 LLM Model: openai/gpt-4o-mini
🔢 Embedding Model: openai/text-embedding-3-small
```

If you see errors about invalid API key, double-check:
- Key is correctly copied (no extra spaces)
- Key starts with `sk-or-v1-`
- You have credits (if using paid models)
   # For budget-friendly (paid):
   LLM_MODEL=openai/gpt-4o-mini
   EMBEDDING_MODEL=openai/text-embedding-3-small
   ```

5. Save the file

## Step 4: Verify Configuration

Start the backend server:
```bash
npm run dev
```

You should see:
```
🚀 DocuMind Insight Backend Server
═══════════════════════════════════
📡 Server running on: http://localhost:3001
🤖 LLM Model: gpt-4o-mini
🔢 Embedding Model: text-embedding-3-small
```

If you see errors about invalid API key, double-check:
- Key is correctly copied (no extra spaces)
- Key starts with `sk-`
- Your OpenAI account has available credits

## Pricing & Costs via OpenRouter

### 🆓 FREE Models (No credit card needed!)

**Meta Llama 3.1 8B** (FREE):
- Input: **$0.000** / 1M tokens
- Output: **$0.000** / 1M tokens
- Quality: Good for most tasks
- Perfect for: Testing, development, student projects

**Other free options:**
- `mistralai/mistral-7b-instruct:free`
- `google/gemma-2-9b-it:free`

### 💰 Paid Models (Better quality)

**OpenAI GPT-4o-mini** (recommended budget option):
- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens
- **~75% cheaper** than direct OpenAI pricing!
vailable Models via OpenRouter

You can switch models by changing `LLM_MODEL` in `server/.env`.  
All models use the same API key - no code changes needed!

### 🆓 Free Models

```env
# Meta's Llama models (excellent, free)
LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free
LLM_MODEL=meta-llama/llama-3.1-70b-instruct:free

# Google's Gemini (free tier)
LLM_MODEL=google/gemini-flash-1.5

# Mistral (free)
LLM_MODEL=mistralai/mistral-7b-instruct:free
```

### 💰 Budget Models (< $0.50/1M tokens)

```env
# OpenAI (fast, cheap)
LLM_MODEL=openai/gpt-4o-mini
LLM_MODEL=openai/gpt-3.5-turbo

# Google (good quality)
LLM_MODEL=google/gemini-pro-1Router dashboard

### ❌ DON'T:
- Commit API keys to Git
- Share API keys publicly
- Hardcode keys in source code
- Use the same key for multiple projects

## Monitoring Usage

Track your API usage:
1. Visit [OpenRouter Activity](https://openrouter.ai/activity)
2. View real-time costs per request
3. See which models you're using
4. Set up spending limits:
   - Go to [Credits page](https://openrouter.ai/credits)
   - Set budget alerts
   - Get notifications when low on credit

# Google (multimodal)
LLM_MODEL=google/gemini-pro-1.5
```
ROUTER_API_KEY: String must contain at least 1 character(s)
```

**Solution:**
- Check `.env` file exists in `server/` directory
- Verify `OPENROUTER_API_KEY=sk-or-v1-...` line exists
- Ensure no spaces around `=`
- Key should start with `sk-or-v1-`
- Restart the server after editing `.env`

### "Insufficient Credits" Error
**Solution:**
- Using a paid model without credits
- Either: Add credits via [Credits page](https://openrouter.ai/credits)
- Or: Switch to a free model in `.env`:
  ```env
  LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free
  ```

### "Model Not Found" Error
**Solution:**
- Model name format must be `provider/model-name`
- Check available models: [OpenRouter Models](https://openrouter.ai/models)
- Example: `openai/gpt-4o-mini` not `gpt-4o-mini`

### "Rate Limit Exceeded" Error
**Solution:**
- Free models have rate limits
- Wait a few minutes
- Or switch to a paid model
- Or add credits for higher limnai`

### Local LLMs (Ollama)
- Free and runs locally
- Install [Ollama](https://ollama.ai/)
- Modify to use `@langchain/community` with Ollama
- No API key needed!

## Security Best Practices

### ✅ DO:
- Store API keys in `.env` file
- Add `.env` to `.gitignore`
- Use environment variables for secrets
- Rotate API keys periodically
- Set spending licredit card?**
A: No! You can use free models without any payment method.

**Q: How much will this cost me?**
A: With free models: $0 for queries, ~$0.04/month for embeddings.  
With paid models: $1-5/month for moderate use.

**Q: Which model should I use?**
A: 
- **Students/Testing**: `meta-llama/llama-3.1-8b-instruct:free` (FREE!)
- **Best value**: `openai/gpt-4o-mini` (~$1/month)
- **Best quality**: `anthropic/claude-3.5-sonnet` (~$3-5/month)

**Q: Can I switch models anytime?**
A: Yes! Just edit `LLM_MODEL` in `.env` and restart the server.
Recommended Configurations

### 🎓 For Students / Free Tier
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free
EMBEDDING_MODEL=openai/text-embedding-3-small
```
**Cost**: ~$0.04/month (embeddings only)

### 💼 For Small Projects / Testing  
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
LLM_MODEL=openai/gpt-4o-mini
EMBEDDING_MODEL=openai/text-embedding-3-small
```
**Cost**: ~$1-2/month

### 🚀 For Production / Best Quality
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
LLM_MODEL=anthropic/claude-3.5-sonnet
EMBEDDING_MODEL=openai/text-embedding-3-small
```
**Cost**: ~$3-5/month

## Next Steps

Once configured:
1. Start the backend: `cd server && npm run dev`
2. Start the frontend: `npm run dev` (from root)
3. Upload a PDF document
4. Ask questions about your documents!

## Support

Having issues? Check:
- [OpenRouter Status](https://status.openrouter.ai/)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Available Models](https://openrouter.ai/models

### "Invalid API Key" Error
```
❌ Invalid environment variables:
  OPENAI_API_KEY: String must contain at least 1 character(s)
```

**Solution:**
- Check `.env` file exists in `server/` directory
- Verify `OPENAI_API_KEY=sk-...` line exists
- Ensure no spaces around `=`
- Restart the server after editing `.env`

### "Rate Limit Exceeded" Error
**Solution:**
- You've hit OpenAI's rate limit
- Wait a few minutes and try again
- Upgrade to paid tier for higher limits

### "Insufficient Quota" Error
**Solution:**
- Your OpenAI account has no credits
- Add payment method or purchase credits

## FAQ

**Q: Do I need a paid OpenAI account?**
A: Yes, OpenAI requires a payment method for API access, even if you have free credits.

**Q: How much will this cost me?**
A: For moderate use (testing + small projects), expect $1-5/month. Heavy use may be more.

**Q: Can I use this without OpenAI?**
A: Yes! You can modify the code to use local LLMs (Ollama) or other providers.

**Q: Is my API key safe?**
A: As long as you don't commit `.env` to Git or share it publicly, yes. The backend runs on your machine/server.

**Q: Can multiple users share one API key?**
A: Yes, but monitor usage. Consider implementing API key rotation or user quotas for production.

## Next Steps

Once configured:
1. Start the backend: `cd server && npm run dev`
2. Start the frontend: `npm run dev` (from root)
3. Upload a PDF document
4. Ask questions about your documents!

## Support

Having issues? Check:
- [OpenAI Platform Status](https://status.openai.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- Server logs for error messages
- Backend README for troubleshooting guide
