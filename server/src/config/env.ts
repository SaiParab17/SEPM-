import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // OpenRouter Configuration
  OPENROUTER_API_KEY: z.string().min(1, 'OpenRouter API key is required'),
  APP_NAME: z.string().default('DocuMind-Insight'),
  APP_URL: z.string().default('http://localhost:5173'),
  
  // Model Configuration
  EMBEDDING_MODEL: z.string().default('openai/text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.string().default('1536'),
  LLM_MODEL: z.string().default('openai/gpt-4o-mini'),
  LLM_TEMPERATURE: z.string().default('0.7'),
  MAX_TOKENS: z.string().default('2000'),
  
  // Vector DB
  CHROMA_PATH: z.string().default('./chroma_db'),
  COLLECTION_NAME: z.string().default('documind_docs'),
  
  // File Upload
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().default('10485760'),
  
  // CORS
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = {
  port: parseInt(parsed.data.PORT),
  nodeEnv: parsed.data.NODE_ENV,
  openrouterApiKey: parsed.data.OPENROUTER_API_KEY,
  appName: parsed.data.APP_NAME,
  appUrl: parsed.data.APP_URL,
  embeddingModel: parsed.data.EMBEDDING_MODEL,
  embeddingDimensions: parseInt(parsed.data.EMBEDDING_DIMENSIONS),
  llmModel: parsed.data.LLM_MODEL,
  llmTemperature: parseFloat(parsed.data.LLM_TEMPERATURE),
  maxTokens: parseInt(parsed.data.MAX_TOKENS),
  chromaPath: parsed.data.CHROMA_PATH,
  collectionName: parsed.data.COLLECTION_NAME,
  uploadDir: parsed.data.UPLOAD_DIR,
  maxFileSize: parseInt(parsed.data.MAX_FILE_SIZE),
  frontendUrl: parsed.data.FRONTEND_URL,
};
