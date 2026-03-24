import { OpenAIEmbeddings } from '@langchain/openai';
import { env } from '../config/env.js';
import type { DocumentChunk, DocumentSource } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';

interface StoredDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    filename: string;
    page: number;
    documentId: string;
  };
}

export class VectorDBService {
  private embeddings: OpenAIEmbeddings;
  private storagePath: string;
  private documents: StoredDocument[] = [];

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: env.openrouterApiKey,
      modelName: env.embeddingModel,
      dimensions: env.embeddingDimensions,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': env.appUrl,
          'X-Title': env.appName,
        },
      },
    });
    
    this.storagePath = path.join(env.chromaPath, 'vectors.json');
    this.loadDocuments();
  }

  /**
   * Load documents from disk
   */
  private async loadDocuments(): Promise<void> {
    try {
      await fs.mkdir(env.chromaPath, { recursive: true });
      const data = await fs.readFile(this.storagePath, 'utf-8');
      this.documents = JSON.parse(data);
      console.log(`✅ Loaded ${this.documents.length} document chunks from storage`);
    } catch (error) {
      // File doesn't exist yet, start with empty array
      this.documents = [];
      console.log('📦 Initialized new vector storage');
    }
  }

  /**
   * Save documents to disk
   */
  private async saveDocuments(): Promise<void> {
    try {
      await fs.mkdir(env.chromaPath, { recursive: true });
      await fs.writeFile(this.storagePath, JSON.stringify(this.documents, null, 2));
    } catch (error) {
      console.error('Error saving documents:', error);
      throw new Error('Failed to save documents to storage');
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Add document chunks to vector database
   */
  async addDocuments(chunks: DocumentChunk[]): Promise<void> {
    try {
      // Generate embeddings for all chunks
      const texts = chunks.map(chunk => chunk.pageContent);
      const embeddings = await this.embeddings.embedDocuments(texts);
      
      // Create stored documents
      const newDocs: StoredDocument[] = chunks.map((chunk, index) => ({
        id: `${chunk.metadata.documentId}_chunk_${index}`,
        content: chunk.pageContent,
        embedding: embeddings[index],
        metadata: {
          filename: chunk.metadata.filename,
          page: chunk.metadata.page,
          documentId: chunk.metadata.documentId,
        },
      }));
      
      // Add to in-memory storage
      this.documents.push(...newDocs);
      
      // Save to disk
      await this.saveDocuments();
      
      console.log(`✅ Added ${chunks.length} chunks to vector database`);
    } catch (error) {
      console.error('Error adding documents to vector DB:', error);
      throw new Error('Failed to add documents to vector database');
    }
  }

  /**
   * Search for relevant documents
   */
  async searchSimilar(
    query: string,
    maxResults: number = 5
  ): Promise<DocumentSource[]> {
    try {
      if (this.documents.length === 0) {
        return [];
      }
      
      // Generate embedding for query
      const queryEmbedding = await this.embeddings.embedQuery(query);
      
      // Calculate similarities
      const results = this.documents.map(doc => ({
        doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding),
      }));
      
      // Sort by similarity and take top results
      results.sort((a, b) => b.similarity - a.similarity);
      const topResults = results.slice(0, maxResults);
      
      // Format results
      const sources: DocumentSource[] = topResults.map(result => ({
        content: result.doc.content,
        filename: result.doc.metadata.filename,
        page: result.doc.metadata.page,
        score: result.similarity,
      }));
      
      return sources;
    } catch (error) {
      console.error('Error searching vector DB:', error);
      throw new Error('Failed to search documents');
    }
  }

  /**
   * Delete documents by documentId
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const initialCount = this.documents.length;
      this.documents = this.documents.filter(
        doc => doc.metadata.documentId !== documentId
      );
      const deletedCount = initialCount - this.documents.length;
      
      if (deletedCount > 0) {
        await this.saveDocuments();
        console.log(`✅ Deleted ${deletedCount} chunks for document ${documentId}`);
      }
    } catch (error) {
      console.error('Error deleting document from vector DB:', error);
      throw new Error('Failed to delete document');
    }
  }

  /**
   * Get count of documents in collection
   */
  async getDocumentCount(): Promise<number> {
    return this.documents.length;
  }

  /**
   * Get all unique documents
   */
  async getAllDocuments(): Promise<Array<{ documentId: string; filename: string; chunkCount: number }>> {
    const docMap = new Map<string, { filename: string; count: number }>();
    
    for (const doc of this.documents) {
      const existing = docMap.get(doc.metadata.documentId);
      if (existing) {
        existing.count++;
      } else {
        docMap.set(doc.metadata.documentId, {
          filename: doc.metadata.filename,
          count: 1,
        });
      }
    }
    
    return Array.from(docMap.entries()).map(([documentId, data]) => ({
      documentId,
      filename: data.filename,
      chunkCount: data.count,
    }));
  }

  /**
   * Clear all documents from vector database
   */
  async clearAllDocuments(): Promise<number> {
    const count = this.documents.length;
    this.documents = [];
    await this.saveDocuments();
    console.log(`🗑️ Cleared ${count} document chunks from vector database`);
    return count;
  }
}

export const vectorDBService = new VectorDBService();
