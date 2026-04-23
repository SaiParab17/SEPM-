# Project Requirements Document (PRD)

## 1. Project Overview

### 1.1 Project Name
DocuMind Insight

### 1.2 Purpose
DocuMind Insight is a web-based intelligent document question-answering system that allows users to upload PDF files, index their content using embeddings, and ask natural-language questions. The system returns AI-generated answers with source attribution (document name and page number) using a Retrieval-Augmented Generation (RAG) workflow.

### 1.3 Business Goals
- Reduce time needed to find information in long PDF documents.
- Provide explainable AI answers with traceable sources.
- Support low-cost and flexible LLM usage via OpenRouter.
- Offer a simple student/demo-friendly workflow with minimal setup.

## 2. Stakeholders and Users

### 2.1 Primary Users
- Students
- Researchers
- Project teams working with PDF-based content

### 2.2 Stakeholders
- Product owner / project team
- Developers (frontend and backend)
- Demonstration/evaluation audience (e.g., SEPM review panel)

## 3. Scope

### 3.1 In Scope (Current Release)
- Upload PDF documents (single or multiple files queued from UI).
- Validate uploaded files (PDF only, max 10 MB per file).
- Extract and chunk text from PDF documents.
- Generate and store embeddings for document chunks.
- Search indexed chunks by semantic similarity.
- Generate answers from retrieved context using LLM.
- Display response confidence and response time.
- Show source citations with filename and page.
- View stored documents and chunk counts.
- Clear all stored documents.
- Health and statistics API endpoints.

### 3.2 Out of Scope (Current Release)
- Authentication and user accounts.
- Multi-tenant data isolation.
- Document-level permissions/roles.
- OCR for scanned-image PDFs.
- Rich source preview/highlighting inside PDF viewer.
- Exporting chat history.
- Production-grade distributed vector database.

## 4. System Context and Architecture

### 4.1 Frontend
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Routes:
  - `/` for search/chat
  - `/upload` for document management and ingestion

### 4.2 Backend
- Node.js + Express + TypeScript
- REST API for upload, search, health, stats, and document management
- Environment validation using Zod

### 4.3 AI and Retrieval
- Embeddings via OpenRouter-compatible endpoint
- LLM completion via OpenRouter-compatible endpoint
- RAG prompt built from top-k semantically relevant chunks

### 4.4 Storage
- Uploaded files stored on local filesystem (`UPLOAD_DIR`)
- Vectorized chunk records stored in local JSON file at `CHROMA_PATH/vectors.json`

## 5. Functional Requirements

### 5.1 Document Upload and Processing
- FR-1: The system shall allow users to select or drag-and-drop PDF files for upload.
- FR-2: The system shall reject non-PDF file types.
- FR-3: The system shall reject files larger than 10 MB (configurable via environment variable).
- FR-4: The system shall process each accepted PDF by extracting text and estimating page mapping for chunks.
- FR-5: The system shall split extracted text into chunks suitable for semantic search.
- FR-6: The system shall generate embeddings for each chunk and persist chunk vectors and metadata.
- FR-7: The system shall report per-file processing status (pending, processing, complete, error) in the UI.
- FR-8: The system shall display a processing progress indicator for batch processing.

### 5.2 Search and Answer Generation
- FR-9: The system shall accept natural-language search queries.
- FR-10: The system shall validate that query text is non-empty.
- FR-11: The system shall retrieve top similar chunks using cosine similarity over embeddings.
- FR-12: The system shall generate an answer using only retrieved context via LLM prompt.
- FR-13: The system shall return answer text, source list, confidence level, and response time.
- FR-14: If no indexed documents/chunks are found, the system shall return a safe fallback response indicating no relevant documents were found.

### 5.3 Source Attribution and Confidence
- FR-15: The system shall provide source citations including filename and page number.
- FR-16: The system shall compute confidence as `high`, `partial`, or `low` from retrieval score and result count.

### 5.4 Document Management
- FR-17: The system shall list stored documents with document ID, filename, and chunk count.
- FR-18: The system shall support deleting all stored document chunks in one operation.
- FR-19: The backend shall support deleting a single document by document ID.

### 5.5 Health, Monitoring, and Errors
- FR-20: The system shall expose a health endpoint with status, timestamp, and indexed chunk count.
- FR-21: The system shall expose a stats endpoint with total chunk count.
- FR-22: The backend shall return JSON error responses for validation and server failures.
- FR-23: The frontend shall display toast notifications for upload/search/management failures.

## 6. API Requirements

### 6.1 Required Endpoints
- `POST /api/upload`: upload one PDF file (`multipart/form-data`, field: `file`).
- `POST /api/search`: request body includes `query` and optional `maxResults`.
- `GET /api/health`: service health and indexed chunk count.
- `GET /api/stats`: indexing statistics.
- `GET /api/documents`: list stored documents.
- `DELETE /api/documents/:id`: delete one document by ID.
- `DELETE /api/documents`: clear all documents.

### 6.2 Response Contract
- All main API responses shall be JSON.
- Success responses shall include `success: true` where applicable.
- Failure responses shall include `success: false` and error message where applicable.

## 7. Data Requirements

### 7.1 Metadata for Stored Chunks
Each chunk record shall include:
- Chunk ID
- Chunk content
- Embedding vector
- Metadata:
  - `documentId`
  - `filename`
  - `page`

### 7.2 Search Result Data
Search results shall include:
- `answer`
- `sources[]` with page, filename, and optional score
- `confidence`
- `responseTime`

## 8. Non-Functional Requirements

### 8.1 Performance
- NFR-1: The system should provide visible processing feedback for uploads and indexing.
- NFR-2: The system should provide query response time information to users.
- NFR-3: Typical single-query latency target should be within a few seconds under local development conditions, dependent on model/provider latency.

### 8.2 Reliability and Availability
- NFR-4: On startup, the system shall initialize storage folders if absent.
- NFR-5: The system shall persist indexed vectors to disk to survive process restarts.
- NFR-6: On upload processing failure, temporary uploaded file cleanup should be attempted.

### 8.3 Security
- NFR-7: API keys shall be supplied through environment variables, not source code.
- NFR-8: CORS shall restrict requests to configured frontend origin.
- NFR-9: File upload validation shall enforce MIME type and size restrictions.

### 8.4 Maintainability
- NFR-10: Codebase shall use TypeScript on frontend and backend.
- NFR-11: Environment configuration shall be validated at runtime.
- NFR-12: API and service responsibilities shall be separated by modular structure.

### 8.5 Usability
- NFR-13: UI shall provide clear status indicators for upload, processing, and search operations.
- NFR-14: UI shall provide clear empty states when no documents are indexed.

## 9. Constraints and Assumptions

### 9.1 Technical Constraints
- C-1: Requires Node.js 18+ (or compatible Bun workflow).
- C-2: Requires valid OpenRouter API key for embeddings and LLM generation.
- C-3: Current vector storage is local JSON file, which limits scalability for large deployments.
- C-4: Current page attribution is estimated from chunk index, not exact PDF citation mapping.

### 9.2 Assumptions
- A-1: Uploaded PDFs contain extractable text layers.
- A-2: Users operate in trusted/local or controlled deployment environment.
- A-3: External LLM/embedding provider availability and latency impact response time.

## 10. Acceptance Criteria

### 10.1 Upload Flow
- AC-1: Given a valid PDF <= 10 MB, when user uploads and processes it, then the file status becomes `complete` and appears in stored document list.
- AC-2: Given a non-PDF or oversized file, when user attempts to add it, then user sees validation error and file is not processed.

### 10.2 Search Flow
- AC-3: Given at least one indexed document, when user submits a non-empty query, then system returns answer, sources, confidence, and response time.
- AC-4: Given zero indexed chunks, when user performs search, then system returns fallback message indicating no relevant documents found.

### 10.3 Document Management
- AC-5: Given indexed documents exist, when user selects clear-all action and confirms, then system removes all stored chunks and document list becomes empty.

### 10.4 Service Health
- AC-6: Health endpoint shall return status and indexed chunk count when backend is running.

## 11. Risks and Gaps

- R-1: Corrupted or scanned PDFs may produce poor extraction quality.
- R-2: Local vector JSON storage may become slow/large over time.
- R-3: Confidence scoring is heuristic and may not always match user-perceived answer quality.
- R-4: No authentication means all users share one document corpus in current deployment model.

## 12. Future Enhancements (Recommended)

- Add authentication and per-user document spaces.
- Replace local vector JSON store with production vector DB service.
- Improve citation fidelity with exact page/section offsets.
- Add OCR pipeline for image-only PDFs.
- Add document preview and source highlighting.
- Add automated integration/E2E tests for upload and search flows.

---
This document captures the current implemented baseline requirements for DocuMind Insight and can be used as the formal SEPM project requirements artifact.
