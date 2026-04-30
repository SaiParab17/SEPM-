# Team Work Distribution & Contributions

This document outlines the responsibilities and key contributions of each team member in the development of **DocuMind Enterprise**. The workload was divided to ensure all layers of the application—from UI/UX to heavy AI inference—were handled efficiently.

## Team Members & Core Areas

| Name | Primary Responsibility |
| :--- | :--- |
| **Sai** | Document QA & RAG Pipeline |
| **Shourya** | Video & Audio QA (Multimodal AI) |
| **Om** | Frontend Architecture & UI/UX Design |
| **Sanskar** | Backend API & Data Infrastructure |
| **Vedant** | Authentication, Security & Deployment |

---

### 1. Sai — Document QA & RAG Pipeline
* **RAG Architecture**: Engineered the core Retrieval-Augmented Generation (RAG) pipeline for document analysis.
* **Universal Parsing**: Implemented `document.service.ts` to support diverse formats (PDF, DOCX, XLSX, CSV, PPTX, TXT, MD).
* **OCR Fallback**: Integrated Tesseract.js to extract text from image-based documents and scans.
* **Vector Embeddings**: Handled document chunking and OpenAI `text-embedding-3-small` integrations.
* **LLM Synthesis**: Designed the prompt engineering and context-injection logic for `gpt-4o-mini` document answering.

### 2. Shourya — Video & Audio QA (Multimodal AI)
* **Video QA Engine**: Integrated `LLaVA-NeXT-Video-7B` for multi-frame video analysis.
* **Audio Intelligence**: Integrated `Whisper-large-v3` for high-accuracy audio track transcription.
* **Cloud GPU Backend**: Developed the GPU-accelerated FastAPI server (`colab_notebook.py` & `kaggle_notebook.py`) for heavy model inference.
* **Extraction Strategies**: Built the "Fast", "Balanced", and "Thorough" scene-change-aware frame extraction algorithms.
* **Multimodal Synthesis**: Created the synthesis logic that combines visual observations with audio transcripts for unified answers.

### 3. Om — Frontend Architecture & UI/UX Design
* **Interface Design**: Designed the "glassmorphism" UI, including the animated gradients, blur effects, and responsive layouts.
* **Component Library**: Integrated and customized `shadcn/ui`, `framer-motion`, and `lucide-react` icons.
* **Page Development**: Built the Landing page, History page, and dynamic Q&A chat interfaces.
* **User Experience**: Implemented real-time loading states, progress bars, and metadata display components for AI responses.
* **Upload Experience**: Designed the drag-and-drop file upload cards with format validation and size restrictions.

### 4. Sanskar — Backend API & Data Infrastructure
* **Express Server**: Set up the core Node.js/Express backend architecture and routing (`api.routes.ts`).
* **File Handling**: Implemented `multer` storage configurations and robust file cleanup pipelines to prevent memory leaks.
* **Vector DB Management**: Built the local vector storage system (`vectordb.service.ts`) for storing and retrieving document chunks via Cosine Similarity.
* **API Endpoints**: Developed the REST APIs for document uploading, searching, health checks, and database management.
* **Error Handling**: Implemented error catching mechanisms and sanitized client-facing error messages.

### 5. Vedant — Authentication, Security & Deployment
* **User Authentication**: Integrated Firebase Auth for secure user sign-up, login, and session management.
* **Route Protection**: Implemented `ProtectedRoute` and `PublicOnlyRoute` wrappers in the React router to restrict unauthorized access.
* **Environment Configuration**: Managed `.env` configurations, OpenRouter API keys, and cross-origin resource sharing (CORS) setups.
* **Network & Tunnels**: Configured the Ngrok tunnel connectivity between the local frontend and the cloud GPU backends.
* **API Integration Setup**: Built the frontend `api.ts` utility for seamless communication between the React app and various backends.
