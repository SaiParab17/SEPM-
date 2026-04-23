const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface UploadResponse {
  success: boolean;
  document?: {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    pageCount: number;
    uploadedAt: string;
  };
  error?: string;
}

export interface SearchResult {
  answer: string;
  sources: { page: number; filename: string; score?: number }[];
  confidence: 'high' | 'partial' | 'low';
  responseTime: number;
}

export interface SearchResponse {
  success: boolean;
  result?: SearchResult;
  error?: string;
}

export interface StoredDocument {
  documentId: string;
  filename: string;
  chunkCount: number;
}

export interface DocumentsResponse {
  success: boolean;
  documents: StoredDocument[];
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  deletedCount?: number;
}

/**
 * Upload a PDF file to the backend
 */
export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}

/**
 * Search documents using natural language query
 */
export async function searchDocuments(query: string, maxResults: number = 3): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, maxResults }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Search failed' }));
    throw new Error(error.error || 'Search failed');
  }

  return response.json();
}

/**
 * Check backend health status
 */
export async function checkHealth(): Promise<{ status: string; documentChunks: number }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  
  if (!response.ok) {
    throw new Error('Health check failed');
  }

  return response.json();
}

/**
 * Get all stored documents
 */
export async function getStoredDocuments(): Promise<DocumentsResponse> {
  const response = await fetch(`${API_BASE_URL}/documents`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }

  return response.json();
}

/**
 * Delete a specific document
 */
export async function deleteDocument(documentId: string): Promise<DeleteResponse> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete document');
  }

  return response.json();
}

/**
 * Clear all documents
 */
export async function clearAllDocuments(): Promise<DeleteResponse> {
  const response = await fetch(`${API_BASE_URL}/documents`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to clear documents');
  }

  return response.json();
}
