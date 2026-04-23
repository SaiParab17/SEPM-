import { ChatOpenAI } from '@langchain/openai';
import { env } from '../config/env.js';
import type { DocumentSource, SearchResult } from '../types/index.js';

export class LLMService {
  private llm: ChatOpenAI;
  private readonly contextSnippetChars = 700;
  private readonly llmTimeoutMs = 12000;

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
          const compact = source.content
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, this.contextSnippetChars);
          return `[Document ${index + 1}: ${source.filename}, Page ${source.page}]\n${compact}`;
        })
        .join('\n\n---\n\n');

      // Create prompt for LLM
      const prompt = this.buildPrompt(query, contextText);

      // Get response from LLM
      const response = await this.invokeWithTimeout(prompt);
      const answer = this.normalizeAnswer(response.content as string);

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
      const responseTime = (Date.now() - startTime) / 1000;

      // Return a quick extractive fallback when model generation is slow or temporarily unavailable.
      return {
        answer: this.buildFallbackAnswer(query, context),
        sources: context.map(s => ({
          filename: s.filename,
          page: s.page,
          score: s.score,
        })),
        confidence: 'partial',
        responseTime,
      };
    }
  }

  private async invokeWithTimeout(prompt: string) {
    return await Promise.race([
      this.llm.invoke(prompt),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LLM request timed out')), this.llmTimeoutMs);
      }),
    ]);
  }

  private buildFallbackAnswer(query: string, context: DocumentSource[]): string {
    const top = context.slice(0, 2);
    if (top.length === 0) {
      return `I could not find relevant content for: "${query}".`;
    }

    const snippets = top
      .map((source, i) => {
        const text = source.content
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 220);
        return `Source ${i + 1} (${source.filename}, page ${source.page}): ${text}`;
      })
      .join('\n');

    return `I could not generate a full model response quickly, so here are the most relevant extracted snippets for your query "${query}":\n${snippets}`;
  }

  private normalizeAnswer(rawAnswer: string): string {
    let text = rawAnswer.trim();

    // Handle accidental JSON response payloads.
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const parsed = JSON.parse(text) as { answer?: unknown };
        if (typeof parsed.answer === 'string') {
          text = parsed.answer.trim();
        }
      } catch {
        // Keep original text if it's not valid JSON.
      }
    }

    // Remove surrounding quotes from stringified content.
    if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))
    ) {
      text = text.slice(1, -1);
    }

    text = text
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\s+$/g, '');

    return text;
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
6. Respond in natural, human-friendly prose
7. Return plain text only (no JSON, no escaped characters, no surrounding quotes)
8. Do not use markdown formatting symbols like **, __, #, or backticks
9. Prefer short, clear paragraphs over bullet-heavy output unless explicitly asked for bullets

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
