# 🧠 DocuMind Insight

**An AI-powered Document & Video Intelligence Platform**

DocuMind Insight is a full-stack web application that lets users upload PDF documents and videos, then ask natural language questions to get AI-generated answers with source citations. It combines Retrieval-Augmented Generation (RAG) for document Q&A with multimodal vision-language models for video understanding.

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Usage Guide](#-usage-guide)
- [API Reference](#-api-reference)
- [Video Q&A — Kaggle Setup](#-video-qa--kaggle-setup)
- [Screenshots](#-screenshots)
- [Team](#-team)

---

## ✨ Features

### 📄 Document Q&A (RAG Pipeline)
- **PDF Upload & Processing** — Upload single or multiple PDFs (up to 10 MB each)
- **Text Extraction** — Extracts text using `pdf-parse` with automatic OCR fallback (Tesseract.js) for scanned/image-based PDFs
- **Chunking & Embedding** — Splits documents into 1000-character overlapping chunks and generates vector embeddings via OpenAI's `text-embedding-3-small` model
- **Semantic Search** — Finds the most relevant document chunks using cosine similarity over stored embeddings
- **AI-Powered Answers** — Generates context-aware answers using GPT-4o-mini through OpenRouter, with exact source citations (filename + page number)
- **Confidence Scoring** — Every answer is tagged with a confidence level (High / Partial / Low) based on retrieval relevance scores
- **Query History** — Persistent search history stored in browser localStorage

### 🎬 Video Q&A (Multimodal AI)
- **Video Upload** — Supports MP4, WebM, MOV, AVI formats up to 100 MB
- **Frame Extraction** — Three quality modes for comprehensive video analysis:
  - **Fast** — 16 uniformly sampled frames (~10s)
  - **Balanced** — 32 scene-change-aware keyframes using frame differencing (~20s)
  - **Thorough** — Multi-segment dense processing: splits the video into up to 6 segments of 32 frames each, analyzes each segment independently, then synthesizes a combined answer (~45-90s)
- **LLaVA-NeXT Vision Model** — Uses the LLaVA-NeXT-Video-7B multimodal model (4-bit quantized) running on Kaggle GPU, exposed via ngrok tunnel
- **Chat Interface** — Conversational UI with response metadata (frames extracted, response time, model, video resolution)

### 🔐 Authentication
- **Firebase Authentication** — Email/password sign-in and Google OAuth
- **Protected Routes** — All app pages require authentication
- **Session Persistence** — Stays logged in across browser sessions

### 🎨 UI/UX
- **Dark Glassmorphism Theme** — Midnight blue palette with cyan/violet gradients, blur effects, and glow animations
- **Responsive Design** — Fully responsive from mobile to desktop
- **Micro-Animations** — Framer Motion transitions, floating elements, hover lifts, and pulse effects
- **Real-time Feedback** — Processing progress bars, animated loading states, and toast notifications

---

## 🏗 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vite + React)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Landing  │ │  Search  │ │  Upload  │ │ Video QA │            │
│  │  Page    │ │  (RAG)   │ │  (PDF)   │ │ (LLaVA)  │            │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│       │             │            │             │                  │
│       └─────────────┼────────────┘             │                  │
│                     │                          │                  │
│             Firebase Auth                      │                  │
└─────────────────────┼──────────────────────────┼──────────────────┘
                      │                          │
                      ▼                          ▼
┌─────────────────────────────┐   ┌──────────────────────────────┐
│   BACKEND (Express + Node)  │   │  KAGGLE NOTEBOOK (FastAPI)   │
│                             │   │                              │
│  ┌─────────────────────┐    │   │  ┌────────────────────────┐  │
│  │   PDF Service       │    │   │  │  LLaVA-NeXT-Video-7B   │  │
│  │  (pdf-parse + OCR)  │    │   │  │  (4-bit quantized)     │  │
│  └─────────┬───────────┘    │   │  └────────────┬───────────┘  │
│            ▼                │   │               │              │
│  ┌─────────────────────┐    │   │  ┌────────────▼───────────┐  │
│  │  Vector DB Service  │    │   │  │  Frame Extraction      │  │
│  │  (Cosine Similarity)│    │   │  │  (OpenCV + Keyframes)  │  │
│  │  JSON file storage  │    │   │  └────────────────────────┘  │
│  └─────────┬───────────┘    │   │                              │
│            ▼                │   │  Exposed via ngrok tunnel    │
│  ┌─────────────────────┐    │   └──────────────────────────────┘
│  │   LLM Service       │    │
│  │  (OpenRouter API)   │    │
│  │  GPT-4o-mini        │    │
│  └─────────────────────┘    │
│                             │
│  OpenAI Embeddings via      │
│  OpenRouter API             │
└─────────────────────────────┘
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite 5** | Build tool & dev server |
| **React Router 6** | Client-side routing |
| **TailwindCSS 3** | Utility-first CSS |
| **shadcn/ui** (Radix) | Accessible component primitives |
| **Framer Motion** | Animations & transitions |
| **Lucide React** | Icon library |
| **TanStack Query** | Server state management |
| **Firebase SDK** | Authentication (email + Google OAuth) |
| **Zod** | Schema validation |

### Backend (Node.js Server)
| Technology | Purpose |
|------------|---------|
| **Express 4** | HTTP server framework |
| **TypeScript + tsx** | Runtime & hot-reload |
| **LangChain** | LLM orchestration & text splitting |
| **OpenAI SDK** | Embedding generation via OpenRouter |
| **pdf-parse** | PDF text extraction |
| **Tesseract.js 7** | OCR fallback for scanned PDFs |
| **pdfjs-dist** | PDF rendering for OCR pipeline |
| **@napi-rs/canvas** | Server-side canvas for PDF-to-image |
| **Multer** | Multipart file upload handling |
| **Zod** | Environment variable validation |

### Video Q&A (Kaggle Notebook)
| Technology | Purpose |
|------------|---------|
| **FastAPI** | Python REST API framework |
| **LLaVA-NeXT-Video-7B** | Multimodal vision-language model |
| **Transformers (HuggingFace)** | Model loading & inference |
| **BitsAndBytes** | 4-bit quantization (NF4) for GPU efficiency |
| **OpenCV (cv2)** | Video frame extraction & processing |
| **ngrok / pyngrok** | Public tunnel to expose Kaggle GPU |
| **Uvicorn** | ASGI server |

### External Services
| Service | Purpose |
|---------|---------|
| **OpenRouter** | Unified API gateway for LLMs (GPT-4o-mini) and embeddings (text-embedding-3-small) |
| **Firebase** | Authentication provider (email/password + Google) |
| **Kaggle** | Free GPU runtime (T4/P100) for LLaVA model |
| **ngrok** | Tunnel Kaggle's private GPU to a public HTTPS endpoint |

---

## 📁 Project Structure

```
SEPM/
├── public/                          # Static assets
│   ├── placeholder.svg
│   └── robots.txt
│
├── server/                          # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts               # Environment config with Zod validation
│   │   ├── routes/
│   │   │   └── api.routes.ts         # REST API endpoints
│   │   ├── services/
│   │   │   ├── llm.service.ts        # LLM integration (OpenRouter + LangChain)
│   │   │   ├── pdf.service.ts        # PDF extraction + OCR + chunking
│   │   │   └── vectordb.service.ts   # Vector storage + cosine similarity search
│   │   ├── types/
│   │   │   └── index.ts              # Shared TypeScript interfaces
│   │   └── server.ts                 # Express app entry point
│   ├── .env                          # Server environment variables
│   ├── .env.example                  # Example env template
│   ├── package.json
│   └── tsconfig.json
│
├── src/                             # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components (40+ components)
│   │   │   ├── animated-ai-chat.tsx  # Animated chat input component
│   │   │   ├── file-upload-card.tsx  # Drag-and-drop file upload
│   │   │   ├── button.tsx, card.tsx, dialog.tsx, ...
│   │   │   └── ...
│   │   ├── Layout.tsx                # App shell with navbar
│   │   ├── Navbar.tsx                # Top navigation bar
│   │   └── NavLink.tsx               # Active-aware nav links
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx           # Firebase auth context provider
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx            # Responsive breakpoint hook
│   │   └── use-toast.ts              # Toast notification hook
│   │
│   ├── lib/
│   │   ├── api.ts                    # Backend API client (upload, search, video QA)
│   │   ├── auth.ts                   # Firebase auth helpers (login, signup, logout)
│   │   ├── firebase.ts              # Firebase SDK initialization
│   │   ├── mock-data.ts             # Sample data for development
│   │   └── utils.ts                 # Utility functions (cn, classnames)
│   │
│   ├── pages/
│   │   ├── Landing.tsx               # Landing page with features & pipeline diagram
│   │   ├── Login.tsx                 # Authentication page (email + Google)
│   │   ├── Index.tsx                 # Document search page (RAG Q&A)
│   │   ├── Upload.tsx                # PDF upload & processing page
│   │   ├── VideoQA.tsx               # Video Q&A page (LLaVA integration)
│   │   ├── History.tsx               # Query history viewer
│   │   └── NotFound.tsx              # 404 page
│   │
│   ├── App.tsx                       # Root component with routing
│   ├── main.tsx                      # React entry point
│   └── index.css                     # Global styles & design system
│
├── kaggle_notebook.py               # Kaggle notebook cells for Video QA endpoint
├── showcase_training/               # Model training showcase scripts
├── index.html                        # HTML entry point
├── package.json                      # Frontend dependencies
├── vite.config.ts                    # Vite configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **OpenRouter API Key** — Get one free at [openrouter.ai/keys](https://openrouter.ai/keys)
- *(For Video QA)* A **Kaggle account** with GPU access and an **ngrok account** with auth token

### 1. Clone the Repository

```bash
git clone https://github.com/SaiParab17/SEPM-.git
cd SEPM-
```

### 2. Setup Backend

```bash
cd server
npm install

# Create environment file
cp .env.example .env
```

Edit `server/.env` and add your OpenRouter API key:

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

Start the backend server:

```bash
npm run dev
```

The backend will start on **http://localhost:3001**

### 3. Setup Frontend

In a **new terminal**, from the project root:

```bash
npm install
npm run dev
```

The frontend will start on **http://localhost:8080** (or 5173)

### 4. Open the App

1. Navigate to **http://localhost:8080** in your browser
2. **Sign up** or **Sign in with Google**
3. Go to **Upload** → upload a PDF
4. Go to **Search** → ask questions about your documents

---

## ⚙ Configuration

### Server Environment Variables (`server/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `NODE_ENV` | `development` | Environment mode |
| `OPENROUTER_API_KEY` | *(required)* | Your OpenRouter API key |
| `APP_NAME` | `DocuMind-Insight` | App identifier for OpenRouter |
| `APP_URL` | `http://localhost:5173` | Frontend URL |
| `EMBEDDING_MODEL` | `openai/text-embedding-3-small` | Embedding model |
| `EMBEDDING_DIMENSIONS` | `1536` | Embedding vector dimensions |
| `LLM_MODEL` | `openai/gpt-4o-mini` | LLM model for answer generation |
| `LLM_TEMPERATURE` | `0.2` | LLM creativity (0 = deterministic, 1 = creative) |
| `MAX_TOKENS` | `600` | Maximum tokens in LLM response |
| `CHROMA_PATH` | `./chroma_db` | Path to vector storage directory |
| `COLLECTION_NAME` | `documind_docs` | Vector collection name |
| `UPLOAD_DIR` | `./uploads` | PDF upload directory |
| `MAX_FILE_SIZE` | `10485760` | Max upload size in bytes (10 MB) |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |

### Cost Estimates

| Operation | Model | Cost |
|-----------|-------|------|
| Embedding (per document) | `text-embedding-3-small` | ~$0.02 |
| Query answer | `gpt-4o-mini` | ~$0.001 per query |
| **Total for typical testing** | — | **~$0.10-0.50** |

> 💡 **Free option**: Set `LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free` for $0 queries (embeddings still cost ~$0.02/doc).

---

## 📖 Usage Guide

### Document Q&A Workflow

```
Upload PDF → Extract Text → Chunk (1000 chars) → Embed → Store Vectors
                                                            │
User Query → Embed Query → Cosine Similarity Search ────────┘
                                    │
                         Top-K relevant chunks
                                    │
                          ┌─────────▼──────────┐
                          │  GPT-4o-mini (LLM)  │
                          │  + Context Prompt    │
                          └─────────┬──────────┘
                                    │
                          AI Answer + Sources + Confidence
```

1. **Upload** — Navigate to `/upload`, drag-and-drop or browse for PDFs
2. **Process** — Click "Process Documents" to extract text, chunk, and generate embeddings
3. **Search** — Go to `/` (Search page), type a natural language question
4. **Review** — Read the AI-generated answer with source citations and confidence level
5. **History** — View past queries at `/history`

### Video Q&A Workflow

```
Upload Video → Extract Frames → LLaVA-NeXT Inference → Answer
                  │
        ┌─────────┼──────────────┐
        │         │              │
     Fast      Balanced      Thorough
   16 uniform  32 keyframes  Multi-segment
   frames      (scene-aware) (96-192 frames)
```

1. Navigate to `/video-qa`
2. Click **Settings** → paste your Kaggle ngrok URL
3. Select a **quality mode** (Fast / Balanced / Thorough)
4. Upload a video file
5. Type a question and hit Enter

---

## 📡 API Reference

### Backend REST API (Express — port 3001)

#### `POST /api/upload`
Upload and process a PDF document.

**Request:** `multipart/form-data` with `file` field

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "filename": "report.pdf",
    "originalName": "report.pdf",
    "size": 245760,
    "pageCount": 12,
    "uploadedAt": "2026-04-29T12:00:00Z"
  }
}
```

#### `POST /api/search`
Search documents with natural language query.

**Request:**
```json
{
  "query": "What are the main findings?",
  "maxResults": 3
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "answer": "The main findings indicate that...",
    "sources": [
      { "page": 5, "filename": "report.pdf", "score": 0.85 }
    ],
    "confidence": "high",
    "responseTime": 2.3
  }
}
```

#### `GET /api/health`
Health check — returns document chunk count.

#### `GET /api/documents`
List all stored documents with chunk counts.

#### `DELETE /api/documents`
Clear all stored documents and vectors.

---

### Video QA API (FastAPI — Kaggle via ngrok)

#### `POST /api/video-qa`
Analyze a video with a natural language query.

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `video` | File | Video file (MP4, WebM, MOV, AVI) |
| `query` | String | Natural language question |
| `quality` | String | `fast`, `balanced`, or `thorough` |

**Response:**
```json
{
  "success": true,
  "answer": "The dog returns with a tennis ball in its mouth...",
  "frames_extracted": 32,
  "response_time": 18.5,
  "model": "LLaVA-NeXT-Video-7B",
  "quality": "balanced",
  "video_duration": 45.2,
  "video_resolution": "1920x1080"
}
```

#### `GET /health`
Health check for the Kaggle model server.

---

## 🎬 Video Q&A — Kaggle Setup

The Video Q&A feature runs a 7B-parameter multimodal model on Kaggle's free GPU. Here's how to set it up:

### Step 1: Create a Kaggle Notebook

1. Go to [kaggle.com](https://www.kaggle.com) → **New Notebook**
2. Enable **GPU** (Settings → Accelerator → GPU T4 x2)
3. Set **Internet** to **On**

### Step 2: Run the Cells

Copy each cell from `kaggle_notebook.py` into your notebook and run them in order:

| Cell | What It Does | Time |
|------|-------------|------|
| **Cell 1** | Installs ngrok and sets HuggingFace token | ~30s |
| **Cell 2** | Installs Python packages (transformers, FastAPI, OpenCV, etc.) | ~60s |
| **Cell 3** | Downloads and loads LLaVA-NeXT-Video-7B model (4-bit quantized) | ~3-5 min |
| **Cell 4** | Starts FastAPI server + ngrok tunnel, prints public URL | ~10s |

### Step 3: Connect Frontend

1. Copy the ngrok URL printed by Cell 4 (e.g., `https://xxxx.ngrok-free.app`)
2. In the frontend, go to **Video QA** → **Settings**
3. Paste the URL and click **Save**

### Quality Modes Explained

| Mode | Frames | Strategy | Best For |
|------|--------|----------|----------|
| **Fast** | 16 | Uniform sampling | Quick overview, short clips |
| **Balanced** | 32 | Scene-change detection — picks frames at visual transitions + uniform fill | General use, most videos |
| **Thorough** | 96-192 | Splits video into 2-6 segments, analyzes each with 32 keyframes, then synthesizes combined answer | Long videos, detailed analysis |

> ⚠️ **Keep the Kaggle notebook cell running** — the ngrok tunnel closes when the cell stops.

---

## 🖼 Screenshots

### Landing Page
Dark glassmorphism landing with animated brain logo, orbiting document cards, and feature highlights.

### Document Search
Chat-style interface for querying uploaded PDFs with AI-generated answers and source citations.

### PDF Upload
Drag-and-drop upload with real-time processing progress and stored document management.

### Video Q&A
Split-panel layout with video preview, quality selector (Fast/Balanced/Thorough), and conversational AI response area.

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## 🚧 Known Limitations

- **Vector storage** is JSON file-based (suitable for development, not production scale)
- **Video Q&A** requires an active Kaggle notebook session with GPU (sessions timeout after ~12 hours of inactivity)
- **ngrok free tier** generates a new URL each time — you'll need to update it in Settings after restarting
- **OCR** is limited to the first 20 pages per PDF for performance
- **Max file sizes**: 10 MB for PDFs, 100 MB for videos

---

## 👥 Team

**Group 7 — SEPM 2024-25 Sem 3**

Built as part of the Software Engineering & Project Management course.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
