import pdf from 'pdf-parse';
import fs from 'fs/promises';
import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import type { DocumentChunk } from '../types/index.js';

const OCR_SCALE = 2;
const OCR_MAX_PAGES = 20;

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
      const data = await pdf(dataBuffer, {
        pagerender: async (pageData: any) => {
          const textContent = await pageData.getTextContent({ normalizeWhitespace: true });
          return textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .trim();
        },
      });

      const normalizedText = (data.text || '').replace(/\r\n/g, '\n').trim();
      
      return {
        text: normalizedText,
        numPages: data.numpages,
      };
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * OCR fallback for scanned/image-based PDFs
   */
  private async extractTextWithOCR(filePath: string): Promise<{ text: string; numPages: number }> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const fileBuffer = await fs.readFile(filePath);
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(fileBuffer) });
    const pdfDocument = await loadingTask.promise;

    const worker = await createWorker('eng');

    try {
      const pagesToProcess = Math.min(pdfDocument.numPages, OCR_MAX_PAGES);
      const pageTexts: string[] = [];

      for (let pageNumber = 1; pageNumber <= pagesToProcess; pageNumber++) {
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: OCR_SCALE });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const canvasContext = canvas.getContext('2d');

        await page.render({
          canvasContext: canvasContext as any,
          viewport,
        }).promise;

        const imageBuffer = canvas.toBuffer('image/png');
        const { data } = await worker.recognize(imageBuffer);
        const text = (data.text || '').trim();

        if (text.length > 0) {
          pageTexts.push(`Page ${pageNumber}:\n${text}`);
        }
      }

      return {
        text: pageTexts.join('\n\n').trim(),
        numPages: pdfDocument.numPages,
      };
    } finally {
      await worker.terminate();
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
      const nonEmptyDocs = docs.filter(doc => doc.pageContent.trim().length > 0);
      
      // Estimate page number based on chunk position
      const chunks: DocumentChunk[] = nonEmptyDocs.map((doc, index) => {
        const estimatedPage = Math.floor((index / nonEmptyDocs.length) * metadata.totalPages) + 1;
        
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
    let { text, numPages } = await this.extractText(filePath);

    if (text.replace(/\s+/g, '').length === 0) {
      console.log('📷 No PDF text layer found. Trying OCR fallback...');

      try {
        const ocrResult = await this.extractTextWithOCR(filePath);
        text = ocrResult.text;
        numPages = ocrResult.numPages;
      } catch (ocrError) {
        console.error('OCR fallback failed:', ocrError);
      }
    }

    if (text.replace(/\s+/g, '').length === 0) {
      throw new Error(
        'No extractable text found in this PDF. OCR fallback also could not detect readable text. Please upload a clearer PDF or run OCR first.'
      );
    }
    
    const chunks = await this.splitIntoChunks(text, {
      filename,
      documentId,
      totalPages: numPages,
    });

    if (chunks.length === 0) {
      throw new Error(
        'No searchable content could be indexed from this PDF. Please upload a text-based PDF or run OCR first.'
      );
    }

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
