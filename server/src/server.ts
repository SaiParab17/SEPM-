import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRoutes from './routes/api.routes.js';

const app = express();

// Middleware
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'DocuMind Insight API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      upload: 'POST /api/upload',
      search: 'POST /api/search',
      health: 'GET /api/health',
      stats: 'GET /api/stats',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

function classifyServiceError(err: unknown): { status: number; message: string } | null {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (
    lower.includes('invalid api key') ||
    lower.includes('incorrect api key') ||
    lower.includes('api key is invalid') ||
    lower.includes('unauthorized') ||
    lower.includes('401')
  ) {
    return {
      status: 401,
      message: 'Your OpenRouter API key is invalid or expired. Please update server/.env with a valid OPENROUTER_API_KEY.',
    };
  }

  if (
    lower.includes('insufficient_quota') ||
    lower.includes('insufficient credits') ||
    lower.includes('quota exceeded') ||
    lower.includes('payment required') ||
    lower.includes('402')
  ) {
    return {
      status: 402,
      message: 'Your OpenRouter credits appear to be exhausted. Please top up your account or switch to a free model.',
    };
  }

  return null;
}

// Error handler
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const classified = classifyServiceError(err);
  if (classified) {
    return res.status(classified.status).json({
      success: false,
      error: classified.message,
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
};

app.use(errorHandler);

// Start server
const PORT = env.port;

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 DocuMind Insight Backend Server');
  console.log('═══════════════════════════════════');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${env.nodeEnv}`);
  console.log(`🤖 LLM Model: ${env.llmModel}`);
  console.log(`🔢 Embedding Model: ${env.embeddingModel}`);
  console.log(`📁 Upload directory: ${env.uploadDir}`);
  console.log(`💾 Vector DB: ${env.chromaPath}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/upload  - Upload PDF documents');
  console.log('  POST /api/search  - Search and query documents');
  console.log('  GET  /api/health  - Health check');
  console.log('  GET  /api/stats   - Get statistics');
  console.log('═══════════════════════════════════');
  console.log('');
});

export default app;
