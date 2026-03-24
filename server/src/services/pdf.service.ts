import pdf from 'pdf-parse';
import fs from 'fs/promises';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import type { DocumentChunk } from '../types/index.js';

export class PDFService {
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', ''],
    });
  }

  /**
   * Extract text from PDF file
   */
  async extractText(filePath: string): Promise<{ text: string; numPages: number }> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      return {
        text: data.text,
        numPages: data.numpages,
      };
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Split text into chunks for embedding
   */
  async splitIntoChunks(
    text: string,
    metadata: { filename: string; documentId: string; totalPages: number }
  ): Promise<DocumentChunk[]> {
    try {
      const docs = await this.textSplitter.createDocuments([text]);
      
      // Estimate page number based on chunk position
      const chunks: DocumentChunk[] = docs.map((doc, index) => {
        const estimatedPage = Math.floor((index / docs.length) * metadata.totalPages) + 1;
        
        return {
          pageContent: doc.pageContent,
          metadata: {
            filename: metadata.filename,
            page: estimatedPage,
            documentId: metadata.documentId,
          },
        };
      });

      return chunks;
    } catch (error) {
      console.error('Error splitting text:', error);
      throw new Error('Failed to split document into chunks');
    }
  }

  /**
   * Process PDF: extract text and split into chunks
   */
  async processPDF(
    filePath: string,
    filename: string,
    documentId: string
  ): Promise<{ chunks: DocumentChunk[]; pageCount: number }> {
    const { text, numPages } = await this.extractText(filePath);
    
    const chunks = await this.splitIntoChunks(text, {
      filename,
      documentId,
      totalPages: numPages,
    });

    return {
      chunks,
      pageCount: numPages,
    };
  }

  /**
   * Delete PDF file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
}

export const pdfService = new PDFService();
