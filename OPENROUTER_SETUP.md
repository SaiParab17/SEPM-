# OpenRouter Setup for DocuMind Insight

## ✅ Quick Setup Steps

### 1. Get OpenRouter API Key (2 minutes)

1. Go to **[OpenRouter](https://openrouter.ai/)**
2. Click **Sign In** (top right)
3. Sign in with Google or GitHub (easiest)
4. Go to **[Keys page](https://openrouter.ai/keys)**
5. Click **Create Key**
6. Name it: "DocuMind Insight"
7. Copy the key (starts with `sk-or-v1-`)

**No credit card required for free models!**

### 2. Configure Backend

```bash
cd server
cp .env.example .env
```

Edit `server/.env` file:

```env
OPENROUTER_API_KEY=sk-or-v1-paste-your-key-here

# Choose your model:
# FREE option (recommended for students/testing):
LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free

# Or paid options (better quality):
# LLM_MODEL=openai/gpt-4o-mini
# LLM_MODEL=anthropic/claude-3.5-sonnet
```

### 3. Start the Server

```bash
npm install
npm run dev
```

Done! Your backend is now running with OpenRouter.

## 💰 Cost Comparison

| Configuration | Monthly Cost | Use Case |
|--------------|-------------|-----------|
| **Free Model** (Llama 3.1) | ~$0.04 | Students, testing, demos |
| **Budget** (GPT-4o-mini) | ~$1-2 | Small projects |
| **Premium** (Claude 3.5) | ~$3-5 | Production, best quality |

## 🆓 Free Models Available

No credit card needed! Use these in your `.env`:

```env
# Meta Llama (best free option)
LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free
LLM_MODEL=meta-llama/llama-3.1-70b-instruct:free

# Google Gemini
LLM_MODEL=google/gemini-flash-1.5

# Mistral
LLM_MODEL=mistralai/mistral-7b-instruct:free
```

## 💳 Paid Models (Optional)

If you want better quality, add credits at [openrouter.ai/credits](https://openrouter.ai/credits):

```env
# Best value (cheap, fast)
LLM_MODEL=openai/gpt-4o-mini

# Best quality
LLM_MODEL=anthropic/claude-3.5-sonnet

# Good balance
LLM_MODEL=google/gemini-pro-1.5
```

See all models: [openrouter.ai/models](https://openrouter.ai/models)

## 🔄 Switching Models

Change models anytime by editing `LLM_MODEL` in `.env` and restarting:

```bash
# Edit .env file
# Change LLM_MODEL=...

# Restart server
npm run dev
```

No code changes needed!

## ❓ Common Issues

### "Invalid API key"
- Check key starts with `sk-or-v1-`
- No spaces in `.env` file
- Get new key at https://openrouter.ai/keys

### "Insufficient credits"
- Using paid model without credits
- Switch to free model OR add credits

### "Model not found"
- Format must be: `provider/model-name`
- Example: `openai/gpt-4o-mini` not `gpt-4o-mini`

## 📊 Monitor Usage

Track costs in real-time:
- **Activity**: https://openrouter.ai/activity
- **Credits**: https://openrouter.ai/credits

## Why OpenRouter?

✅ **100+ models** from OpenAI, Anthropic, Google, Meta  
✅ **Free options** available - no credit card needed  
✅ **Better pricing** - often 75% cheaper than direct APIs  
✅ **One API key** - access all providers  
✅ **Easy switching** - change models without code changes  

## Next Steps

1. ✅ Get API key from [openrouter.ai/keys](https://openrouter.ai/keys)
2. ✅ Add to `server/.env`
3. ✅ Choose free or paid model
4. ✅ Run `npm run dev`
5. ✅ Start uploading documents!

Full documentation: [API_KEY_SETUP.md](../API_KEY_SETUP.md)
