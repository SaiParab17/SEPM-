import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { pdfService } from '../services/pdf.service.js';
import { vectorDBService } from '../services/vectordb.service.js';
import { llmService } from '../services/llm.service.js';
import { env } from '../config/env.js';
import type { UploadResponse, SearchRequest, SearchResponse } from '../types/index.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(env.uploadDir, { recursive: true });
      cb(null, env.uploadDir);
    } catch (error) {
      cb(error as Error, env.uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * POST /api/upload
 * Upload and process a PDF document
 */
router.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    let filePath: string | undefined;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        } as UploadResponse);
      }

      const file = req.file;
      filePath = file.path;
      const documentId = uuidv4();

      console.log(`📄 Processing file: ${file.originalname}`);

      // Extract text and split into chunks
      const { chunks, pageCount } = await pdfService.processPDF(
        filePath,
        file.originalname,
        documentId
      );

      console.log(`📝 Extracted ${chunks.length} chunks from ${pageCount} pages`);

      // Add to vector database
      await vectorDBService.addDocuments(chunks);

      // Return success response
      const response: UploadResponse = {
        success: true,
        document: {
          id: documentId,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          pageCount,
          uploadedAt: new Date(),
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Upload error:', error);

      const message = error instanceof Error ? error.message : String(error);

      if (message.toLowerCase().includes('no extractable text') || message.toLowerCase().includes('no searchable content')) {
        if (filePath) {
          await pdfService.deleteFile(filePath).catch(console.error);
        }

        return res.status(422).json({
          success: false,
          error: message,
        } as UploadResponse);
      }
      
      // Clean up file if processing failed
      if (filePath) {
        await pdfService.deleteFile(filePath).catch(console.error);
      }

      next(error);
    }
  }
);

/**
 * POST /api/search
 * Search documents and generate AI answer
 */
router.post('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, maxResults = 3 } = req.body as SearchRequest;
    const boundedMaxResults = Math.min(Math.max(Number(maxResults) || 3, 1), 5);

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      } as SearchResponse);
    }

    console.log(`🔍 Search query: "${query}"`);

    // Search for relevant documents
    const sources = await vectorDBService.searchSimilar(query, boundedMaxResults);

    if (sources.length === 0) {
      return res.json({
        success: true,
        result: {
          answer: "I couldn't find a relevant section for that question in the indexed documents. Try rephrasing your question or asking about a specific topic from the PDF.",
          sources: [],
          confidence: 'low',
          responseTime: 0,
        },
      } as SearchResponse);
    }

    console.log(`📚 Found ${sources.length} relevant sources`);

    // Generate answer using LLM
    const result = await llmService.generateAnswer(query, sources);

    console.log(`✅ Generated answer in ${result.responseTime.toFixed(2)}s`);

    res.json({
      success: true,
      result,
    } as SearchResponse);
  } catch (error) {
    console.error('Search error:', error);
    next(error);
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const docCount = await vectorDBService.getDocumentCount();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      documentChunks: docCount,
      environment: env.nodeEnv,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: 'Service unavailable',
    });
  }
});

/**
 * GET /api/stats
 * Get statistics about indexed documents
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chunkCount = await vectorDBService.getDocumentCount();
    
    res.json({
      success: true,
      stats: {
        totalChunks: chunkCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents
 * Get all stored documents
 */
router.get('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documents = await vectorDBService.getAllDocuments();
    
    res.json({
      success: true,
      documents,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a specific document
 */
router.delete('/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.id;
    await vectorDBService.deleteDocument(documentId);
    
    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/documents
 * Clear all documents
 */
router.delete('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deletedCount = await vectorDBService.clearAllDocuments();
    
    res.json({
      success: true,
      message: `Cleared ${deletedCount} document chunks`,
      deletedCount,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
