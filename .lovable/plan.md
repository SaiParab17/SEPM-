

# DocuMind - Intelligent Document Search System

## Overview
A two-page document search app with admin upload and user search interfaces, using mock/simulated data (no real backend processing).

## Page 1: User Search (Default Landing - `/`)
- Large centered search box with auto-focus, Enter key submit, and search icon button
- Clickable example query that auto-fills the search box
- On submit: loading spinner → answer card with main answer, source pill badges, confidence indicator, and response time badge
- Chat history as collapsible accordion with timestamps
- "Clear Chat" icon button (top-right)
- Empty state: "No documents uploaded yet" with link to Upload page

## Page 2: Admin Upload (`/upload`)
- Left sidebar navigation with links to Search and Upload pages (collapsible on mobile)
- Drag-and-drop zone accepting PDFs only, multi-file, max 10MB validation with error messages
- File list table: filename, size, status with icons (pending/processing/complete)
- "Process Documents" button: disabled until files added, triggers animated progress bar with "Vectorizing... X%" text, then success message with count
- Processing time note below

## Design
- Blue primary (#1976D2), white background, card-based with soft shadows
- Inter font, 16px base
- Lucide icons throughout
- Responsive: sidebar stacks below on mobile
- Sidebar with SidebarProvider using shadcn sidebar component

## Data
- All mock/simulated — no real PDF parsing or vector search
- Simulated search responses with hardcoded answers and sources
- File upload simulated with progress animations

