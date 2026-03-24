# DocuMind Insight 🧠📄

An intelligent document Q&A system powered by AI. Upload your PDF documents and ask questions in natural language - get accurate answers with source citations.

## 🎯 Features

- **📤 PDF Upload**: Upload multiple PDF documents with drag-and-drop
- **🔍 Semantic Search**: Find relevant information using natural language queries
- **🤖 AI-Powered Answers**: Get intelligent responses powered by GPT-4o-mini
- **📚 Source Attribution**: See exactly which document and page number was used
- **💬 Chat History**: Keep track of all your previous queries
- **⚡ Real-time Processing**: Watch your documents get processed in real-time

## 🏗️ Architecture

**Frontend:**
- React + TypeScript
- Vite
- shadcn/ui components
- Tailwind CSS

**Backend:**
- Node.js + Express
- OpenRouter API (Access to 100+ LLMs)
- ChromaDB (Vector Database)
- LangChain (RAG Framework)
- PDF parsing and text extraction

**AI Stack:**
- **Embeddings**: text-embedding-3-small (1536 dimensions)
- **LLM**: GPT-4o-mini, Claude, Llama, or any OpenRouter model
- **Technique**: RAG (Retrieval Augmented Generation)
- **Vector DB**: ChromaDB with cosine similarity

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- OpenRouter API key ([Get one FREE here](https://openrouter.ai/keys))

### 1. Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd documind-insight
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

### 4. Configure API Keys

**Important:** You need an OpenRouter API key to run this application.

1. Read the [API Key Setup Guide](./API_KEY_SETUP.md) for detailed instructions
2. Create `server/.env` file:
   ```bash
   cd server
   cp .env.example .env
   ```
3. Edit `server/.env` and add your OpenRouter API key:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
   # Optional: Use a FREE model
   LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free
   ```

### 5. Start the Backend Server

```bash
cd server
npm run dev
```

The backend will start on `http://localhost:3001`

### 6. Start the Frontend (in a new terminal)

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

### 7. Use the Application

1. Navigate to `http://localhost:5173`
2. Go to the **Upload** page
3. Upload a PDF document (max 10MB)
4. Wait for processing to complete
5. Go to **Search** page
6. Ask questions about your documents!

## 📖 Documentation

- **[API Key Setup Guide](./API_KEY_SETUP.md)** - Detailed guide for configuring LLM API keys
- **[Backend README](./server/README.md)** - Backend architecture and API documentation

## 🔑 API Configuration

This application uses **OpenRouter** - a unified gateway to 100+ LLMs!

**Why OpenRouter?**
✅ **Free models available** - No credit card needed
✅ **Access multiple providers** - OpenAI, Anthropic, Google, Meta, etc.
✅ **Better pricing** - Often 75% cheaper than direct APIs
✅ **One API key** - Manage everything in one place

See [API_KEY_SETUP.md](./API_KEY_SETUP.md) for:
- Step-by-step setup instructions
- Free vs paid model options
- Pricing information (free options available!)
- Alternative model recommendations
- Security best practices
- Troubleshooting guide

**Quick start**: Get your free API key at [openrouter.ai/keys](https://openrouter.ai/keys)

## 🛠️ Development

### Project Structure

```
documind-insight/
├── src/                    # Frontend source
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── lib/              # Utilities and API client
│   └── hooks/            # Custom React hooks
├── server/                # Backend source
│   ├── src/
│   │   ├── config/       # Environment configuration
│   │   ├── services/     # Business logic
│   │   │   ├── pdf.service.ts      # PDF processing
│   │   │   ├── vectordb.service.ts # Vector database
│   │   │   └── llm.service.ts      # LLM integration
│   │   ├── routes/       # API endpoints
│   │   └── types/        # TypeScript types
│   ├── uploads/          # Uploaded PDFs (gitignored)
│   └── chroma_db/        # Vector database storage (gitignored)
└── public/               # Static assets
```

### Available Scripts

**Frontend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint code
npm test             # Run tests
```

**Backend:**
```bash
cd server
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm start            # Run production build
npm run typecheck    # Type checking
```

## 🧪 How It Works

### Document Processing Pipeline

1. **Upload**: User uploads PDF file
2. **Text Extraction**: Extract text from PDF using pdf-parse
3. **Chunking**: Split text into ~1000 character chunks with overlap
4. **Embedding**: Convert each chunk to 1536-dimensional vector
5. **Storage**: Store vectors in ChromaDB with metadata

### Query Processing Pipeline

1. **User Query**: User asks a question
2. **Query Embedding**: Convert question to vector embedding
3. **Similarity Search**: Find top-k most similar document chunks
4. **Context Building**: Compile relevant chunks with metadata
5. **LLM Generation**: GPT-4o-mini generates answer using context
6. **Response**: Return answer with source citations

## 🎨 Technologies

**Frontend:**
- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [React Router](https://reactrouter.com/) - Routing
- [TanStack Query](https://tanstack.com/query) - Data fetching

**Backend:**
- [Express.js](https://expressjs.com/) - Web framework
- [OpenRouter](https://openrouter.ai/) - Unified LLM API gateway
- [LangChain](https://js.langchain.com/) - LLM framework
- [ChromaDB](https://www.trychroma.com/) - Vector database
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF extraction
- [Multer](https://www.npmjs.com/package/multer) - File uploads

## 📊 API Endpoints

### POST /api/upload
Upload and process a PDF document

### POST /api/search
Search documents with natural language query

### GET /api/health
Check server health and document count

### GET /api/stats
Get indexing statistics

See [server/README.md](./server/README.md) for detailed API documentation.

## 🔒 Security

- API keys stored in `.env` (not committed to Git)
- File upload validation (PDF only, max 10MB)
- CORS configured for frontend origin
- Input sanitization and validation
- Environment variable validation with Zod

## 🚀 Deployment

### Frontend Deployment

Deploy to platforms like:
- Vercel
- Netlify
- Cloudflare Pages

### Backend Deployment

Deploy to:
- Railway
- Render
- Fly.io
- Digital Ocean

**Environment Variables Required:**
- `OPENROUTER_API_KEY`
- `FRONTEND_URL` (for CORS)
- Optional: `LLM_MODEL`, `EMBEDDING_MODEL`
- Other config from `.env.example`

## 🤝 Contributing

This is a student project for SEPM (Software Engineering and Project Management) course.

## 📝 License

MIT

## 🆘 Support

Facing issues? Check:
1. [API Key Setup Guide](./API_KEY_SETUP.md)
2. [Backend README](./server/README.md) - Troubleshooting section
3. Server logs for error messages
4. [OpenAI Platform Status](https://status.openai.com/)

## 🎓 Educational Purpose

This project demonstrates:
- **RAG (Retrieval Augmented Generation)** implementation
- Vector database usage
- LLM integration
- Full-stack TypeScript development
- Modern React patterns
- API design and documentation
