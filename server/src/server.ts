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

// Error handler
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
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
