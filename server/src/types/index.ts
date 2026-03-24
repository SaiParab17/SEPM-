export interface ProcessedDocument {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  pageCount: number;
  uploadedAt: Date;
}

export interface SearchResult {
  answer: string;
  sources: DocumentSource[];
  confidence: 'high' | 'partial' | 'low';
  responseTime: number;
}

export interface DocumentSource {
  page: number;
  filename: string;
  content?: string;
  score?: number;
}

export interface DocumentChunk {
  pageContent: string;
  metadata: {
    filename: string;
    page: number;
    documentId: string;
  };
}

export interface UploadResponse {
  success: boolean;
  document?: ProcessedDocument;
  error?: string;
}

export interface SearchRequest {
  query: string;
  maxResults?: number;
}

export interface SearchResponse {
  success: boolean;
  result?: SearchResult;
  error?: string;
}
