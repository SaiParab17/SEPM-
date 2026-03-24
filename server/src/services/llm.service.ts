import { ChatOpenAI } from '@langchain/openai';
import { env } from '../config/env.js';
import type { DocumentSource, SearchResult } from '../types/index.js';

export class LLMService {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: env.openrouterApiKey,
      modelName: env.llmModel,
      temperature: env.llmTemperature,
      maxTokens: env.maxTokens,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': env.appUrl,
          'X-Title': env.appName,
        },
      },
    });
  }

  /**
   * Generate answer using RAG (Retrieval Augmented Generation)
   */
  async generateAnswer(
    query: string,
    context: DocumentSource[]
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // Build context from retrieved documents
      const contextText = context
        .map((source, index) => {
          return `[Document ${index + 1}: ${source.filename}, Page ${source.page}]\n${source.content}`;
        })
        .join('\n\n---\n\n');

      // Create prompt for LLM
      const prompt = this.buildPrompt(query, contextText);

      // Get response from LLM
      const response = await this.llm.invoke(prompt);
      const answer = response.content as string;

      // Calculate confidence based on relevance scores
      const avgScore = context.reduce((sum, s) => sum + (s.score || 0), 0) / context.length;
      const confidence = this.calculateConfidence(avgScore, context.length);

      const responseTime = (Date.now() - startTime) / 1000;

      return {
        answer,
        sources: context.map(s => ({
          filename: s.filename,
          page: s.page,
          score: s.score,
        })),
        confidence,
        responseTime,
      };
    } catch (error) {
      console.error('Error generating answer:', error);
      throw new Error('Failed to generate answer from LLM');
    }
  }

  /**
   * Build prompt for LLM with context and query
   */
  private buildPrompt(query: string, context: string): string {
    return `You are a helpful AI assistant that answers questions based on the provided document context.

Your task:
1. Read the context from the documents carefully
2. Answer the user's question accurately based ONLY on the information in the context
3. If the context doesn't contain enough information to answer the question, say so clearly
4. Cite specific documents and page numbers when possible
5. Be concise but comprehensive

Context from documents:
${context}

User Question: ${query}

Answer:`;
  }

  /**
   * Calculate confidence level based on similarity scores and result count
   */
  private calculateConfidence(
    avgScore: number,
    resultCount: number
  ): 'high' | 'partial' | 'low' {
    if (avgScore > 0.7 && resultCount >= 3) {
      return 'high';
    } else if (avgScore > 0.5 || resultCount >= 2) {
      return 'partial';
    }
    return 'low';
  }

  /**
   * Check if API key is valid
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.llm.invoke('Hello');
      return true;
    } catch (error) {
      console.error('LLM health check failed:', error);
      return false;
    }
  }
}

export const llmService = new LLMService();
