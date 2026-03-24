# DocuMind Insight Backend

Backend server for DocuMind Insight - an AI-powered document Q&A system using RAG (Retrieval Augmented Generation).

## Features

- 📄 **PDF Upload & Processing**: Extract text from PDF documents
- 🔍 **Semantic Search**: Vector-based similarity search using embeddings
- 🤖 **AI-Powered Answers**: Generate intelligent responses using LLM
- 💾 **Vector Database**: Store and retrieve document embeddings efficiently
- 🎯 **Source Attribution**: Track which documents and pages were used to answer queries

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **LLM Provider**: OpenRouter (access to 100+ models)
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector DB**: ChromaDB
- **PDF Processing**: pdf-parse
- **AI Framework**: LangChain

## Prerequisites

- Node.js 18+ or Bun
- OpenRouter API key ([Get one FREE here](https://openrouter.ai/keys))

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
# or
bun install
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenRouter API key:

```env
OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key-here

# Optional: Choose your preferred model
# FREE option:
LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free

# Paid options:
# LLM_MODEL=openai/gpt-4o-mini
# LLM_MODEL=anthropic/claude-3.5-sonnet
```

See [API Configuration Guide](#api-configuration-guide) below for detailed setup instructions.

### 3. Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### POST /api/upload
Upload and process a PDF document.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `file` (PDF file)

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "filename": "document.pdf",
    "originalName": "My Document.pdf",
    "size": 1024000,
    "pageCount": 10,
    "uploadedAt": "2026-03-10T..."
  }
}
```

### POST /api/search
Search documents and get AI-generated answers.

**Request:**
```json
{
  "query": "What is the refund policy?",
  "maxResults": 5
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "answer": "According to the documents...",
    "sources": [
      { "filename": "policy.pdf", "page": 5, "score": 0.92 }
    ],
    "confidence": "high",
    "responseTime": 2.3
  }
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-10T...",
  "documentChunks": 150,
  "environment": "development"
}
```

### GET /api/stats
Get statistics about indexed documents.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalChunks": 150
  }
}
```

## How It Works

1. **Document Upload**: PDFs are uploaded and text is extracted
2. **Text Splitting**: Documents are split into chunks (~1000 chars with overlap)
3. **Embedding Generation**: Each chunk is converted to a vector embedding
4. **Vector Storage**: Embeddings are stored in ChromaDB with metadata
5. **Query Processing**: User queries are converted to embeddings
6. **Similarity Search**: Find most relevant document chunks
7. **Answer Generation**: LLM generates answer based on retrieved context

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── env.ts           # Environment configuration
│   ├── services/
│   │   ├── pdf.service.ts   # PDF text extraction & chunking
│   │   ├── vectordb.service.ts  # Vector database operations
│   │   └── llm.service.ts   # LLM integration for RAG
│   ├── routes/
│   │   └── api.routes.ts    # API route handlers
│   ├── types/
│   │   └── index.ts         # TypeScript type definitions
│   └── server.ts            # Express server setup
├── uploads/                 # Uploaded PDF storage
├── chroma_db/              # ChromaDB vector storage
├── package.json
├── tsconfig.json
└── .env
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `OPENROUTER_API_KEY` | OpenRouter API key | **Required** |
| `APP_NAME` | Your app name | `DocuMind-Insight` |
| `APP_URL` | Your app URL | `http://localhost:5173` |
| `EMBEDDING_MODEL` | Embedding model | `openai/text-embedding-3-small` |
| `EMBEDDING_DIMENSIONS` | Embedding vector dimensions | `1536` |
| `LLM_MODEL` | LLM model for answers | `openai/gpt-4o-mini` |
| `LLM_TEMPERATURE` | Response creativity (0-2) | `0.7` |
| `MAX_TOKENS` | Max response length | `2000` |
| `CHROMA_PATH` | Vector DB storage path | `./chroma_db` |
| `COLLECTION_NAME` | Vector collection name | `documind_docs` |
| `UPLOAD_DIR` | PDF upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `10485760` (10MB) |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:5173` |

## Troubleshooting

### "Invalid API key" error
- Make sure your OpenRouter API key is correctly set in `.env`
- Verify the key starts with `sk-or-v1-`
- Get a new key at https://openrouter.ai/keys

### "Insufficient credits" error
- You're using a paid model without credits
- Add credits at https://openrouter.ai/credits
- Or switch to a free model in `.env`:
  ```env
  LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free
  ```

### "Model not found" error
- Model name must be in format: `provider/model-name`
- Check available models: https://openrouter.ai/models
- Examples: `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`

### "Rate limit exceeded" error
- Free models have rate limits
- Wait a few minutes
- Switch to a paid model or add credits

### "Failed to initialize vector database"
- Ensure the `chroma_db` directory is writable
- Try deleting `chroma_db/` and restarting the server

### "Upload failed"
- Check file size is under 10MB
- Verify file is a valid PDF
- Ensure `uploads/` directory exists and is writable

### CORS errors
- Verify `FRONTEND_URL` in `.env` matches your frontend URL
- Check the frontend is running on the expected port

## Development

### Running Tests
```bash
npm test
```

### Type Checking
```bash
npm run typecheck
```

### Building for Production
```bash
npm run build
```

## License

MIT
