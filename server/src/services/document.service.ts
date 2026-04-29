import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { createWorker } from 'tesseract.js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import type { DocumentChunk } from '../types/index.js';
import { pdfService } from './pdf.service.js';

// ─── Supported MIME types → handler key ────────────────────────────────────
export const SUPPORTED_MIME_TYPES: Record<string, string> = {
  // PDF
  'application/pdf': 'pdf',

  // Word
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',

  // Excel / CSV
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xlsx',
  'text/csv': 'csv',
  'application/csv': 'csv',

  // PowerPoint
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'pptx',

  // Plain text / Markdown / Code
  'text/plain': 'txt',
  'text/markdown': 'txt',
  'text/x-markdown': 'txt',
  'text/html': 'txt',
  'application/json': 'txt',
  'text/javascript': 'txt',
  'text/typescript': 'txt',
  'text/x-python': 'txt',

  // Images (OCR)
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/webp': 'image',
  'image/tiff': 'image',
  'image/bmp': 'image',
};

export const SUPPORTED_EXTENSIONS: Record<string, string> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'docx',
  '.xlsx': 'xlsx',
  '.xls': 'xlsx',
  '.csv': 'csv',
  '.pptx': 'pptx',
  '.ppt': 'pptx',
  '.txt': 'txt',
  '.md': 'txt',
  '.markdown': 'txt',
  '.json': 'txt',
  '.js': 'txt',
  '.ts': 'txt',
  '.py': 'txt',
  '.html': 'txt',
  '.htm': 'txt',
  '.xml': 'txt',
  '.yaml': 'txt',
  '.yml': 'txt',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.webp': 'image',
  '.tiff': 'image',
  '.bmp': 'image',
};

// ─── Text splitter (shared) ─────────────────────────────────────────────────
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '. ', ' ', ''],
});

// ─── Helper: build chunks from raw text ────────────────────────────────────
async function buildChunks(
  text: string,
  filename: string,
  documentId: string,
  totalPages: number
): Promise<DocumentChunk[]> {
  const docs = await textSplitter.createDocuments([text]);
  const nonEmpty = docs.filter(d => d.pageContent.trim().length > 0);

  return nonEmpty.map((doc, index) => {
    const estimatedPage =
      Math.floor((index / Math.max(nonEmpty.length, 1)) * totalPages) + 1;
    return {
      pageContent: doc.pageContent,
      metadata: { filename, page: estimatedPage, documentId },
    };
  });
}

// ─── Individual extractors ──────────────────────────────────────────────────

/** Plain text / markdown / code / json / html */
async function extractTxt(filePath: string): Promise<{ text: string; pages: number }> {
  const text = await fs.readFile(filePath, 'utf-8');
  // Estimate "pages" based on character count (2000 chars ≈ 1 page)
  const pages = Math.max(1, Math.ceil(text.length / 2000));
  return { text, pages };
}

/** DOCX / DOC — mammoth extracts raw text */
async function extractDocx(filePath: string): Promise<{ text: string; pages: number }> {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value.trim();
  if (!text) throw new Error('No text found in DOCX file.');
  const pages = Math.max(1, Math.ceil(text.length / 2000));
  return { text, pages };
}

/** XLSX / XLS / CSV — read all sheets, stringify cell values */
async function extractXlsx(filePath: string): Promise<{ text: string; pages: number }> {
  const workbook = XLSX.readFile(filePath);
  const lines: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    lines.push(`=== Sheet: ${sheetName} ===`);
    for (const row of rows) {
      const cells = (row as unknown[]).map(c => String(c ?? '').trim());
      if (cells.some(c => c.length > 0)) {
        lines.push(cells.join('\t'));
      }
    }
    lines.push('');
  }

  const text = lines.join('\n').trim();
  if (!text) throw new Error('No data found in spreadsheet.');
  const pages = Math.max(1, Math.ceil(text.length / 2000));
  return { text, pages };
}

/** CSV — XLSX can read CSV too */
async function extractCsv(filePath: string): Promise<{ text: string; pages: number }> {
  const content = await fs.readFile(filePath, 'utf-8');
  const workbook = XLSX.read(content, { type: 'string' });
  return extractXlsxFromWorkbook(workbook);
}

function extractXlsxFromWorkbook(workbook: XLSX.WorkBook): { text: string; pages: number } {
  const lines: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    for (const row of rows) {
      const cells = (row as unknown[]).map(c => String(c ?? '').trim());
      if (cells.some(c => c.length > 0)) lines.push(cells.join('\t'));
    }
  }
  const text = lines.join('\n').trim();
  if (!text) throw new Error('No data found in CSV.');
  return { text, pages: Math.max(1, Math.ceil(text.length / 2000)) };
}

/** PPTX — extract text from XML slide content using XLSX (it reads OOXML) */
async function extractPptx(filePath: string): Promise<{ text: string; pages: number }> {
  // XLSX can parse PPTX files to extract text from slides
  try {
    const wb = XLSX.readFile(filePath, { type: 'file' });
    const lines: string[] = [];
    for (const sheetName of wb.SheetNames) {
      lines.push(`=== Slide: ${sheetName} ===`);
      const sheet = wb.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      for (const row of rows) {
        const cells = (row as unknown[]).map(c => String(c ?? '').trim()).filter(c => c.length > 0);
        if (cells.length) lines.push(cells.join(' '));
      }
      lines.push('');
    }
    const text = lines.join('\n').trim();
    if (!text) throw new Error('No slides content');
    return { text, pages: wb.SheetNames.length || 1 };
  } catch {
    // Fallback: read raw XML strings from the PPTX zip
    const raw = await fs.readFile(filePath);
    const wb = XLSX.read(raw, { type: 'buffer', bookSheets: false });
    const text = wb.SheetNames.join('\n');
    if (!text) throw new Error('Could not extract text from PowerPoint file.');
    return { text, pages: Math.max(1, wb.SheetNames.length) };
  }
}

/** Images — Tesseract OCR */
async function extractImage(filePath: string): Promise<{ text: string; pages: number }> {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(filePath);
    const text = (data.text || '').trim();
    if (!text) throw new Error('No text detected in image. The image may not contain readable text.');
    return { text, pages: 1 };
  } finally {
    await worker.terminate();
  }
}

// ─── Main entry point ───────────────────────────────────────────────────────

export interface ProcessResult {
  chunks: DocumentChunk[];
  pageCount: number;
  fileType: string;
}

export class DocumentService {
  /**
   * Detect file type from MIME type or extension, then extract text and chunk.
   */
  async processDocument(
    filePath: string,
    originalName: string,
    documentId: string,
    mimeType: string
  ): Promise<ProcessResult> {
    const ext = path.extname(originalName).toLowerCase();

    // Resolve handler: prefer MIME, fall back to extension
    const handler =
      SUPPORTED_MIME_TYPES[mimeType] ??
      SUPPORTED_EXTENSIONS[ext] ??
      null;

    if (!handler) {
      throw new Error(
        `Unsupported file type: "${ext}" (${mimeType}). ` +
        `Supported: PDF, DOCX, XLSX, CSV, PPTX, TXT, MD, JSON, HTML, PNG, JPG, WEBP.`
      );
    }

    console.log(`📄 Extracting text from ${originalName} (type: ${handler})`);

    let text: string;
    let pages: number;

    switch (handler) {
      case 'pdf': {
        // Delegate entirely to the existing PDF service (includes OCR fallback)
        const result = await pdfService.processPDF(filePath, originalName, documentId);
        return { chunks: result.chunks, pageCount: result.pageCount, fileType: 'pdf' };
      }
      case 'docx': {
        ({ text, pages } = await extractDocx(filePath));
        break;
      }
      case 'xlsx': {
        ({ text, pages } = await extractXlsx(filePath));
        break;
      }
      case 'csv': {
        ({ text, pages } = await extractCsv(filePath));
        break;
      }
      case 'pptx': {
        ({ text, pages } = await extractPptx(filePath));
        break;
      }
      case 'image': {
        ({ text, pages } = await extractImage(filePath));
        break;
      }
      case 'txt':
      default: {
        ({ text, pages } = await extractTxt(filePath));
        break;
      }
    }

    if (!text || text.trim().length === 0) {
      throw new Error(`No readable content found in "${originalName}".`);
    }

    const chunks = await buildChunks(text, originalName, documentId, pages);

    if (chunks.length === 0) {
      throw new Error(`Could not split "${originalName}" into indexable chunks.`);
    }

    console.log(`✅ ${handler.toUpperCase()}: ${chunks.length} chunks from ${pages} page(s)`);

    return { chunks, pageCount: pages, fileType: handler };
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore — file may already be gone
    }
  }
}

export const documentService = new DocumentService();
