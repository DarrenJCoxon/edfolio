/**
 * TypeScript type definitions for Scaleway AI API
 * Scaleway provides OpenAI-compatible API format
 * All data processing occurs in EU (France, Paris datacenter)
 */

/**
 * Message format for chat completions
 */
export interface ScalewayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Request format for Scaleway chat completions API
 * Compatible with OpenAI API format
 */
export interface ScalewayChatRequest {
  model: string;
  messages: ScalewayMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

/**
 * Response format from Scaleway chat completions API
 */
export interface ScalewayChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Error response from Scaleway API
 */
export interface ScalewayError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * Configuration options for Scaleway client
 */
export interface ScalewayClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter?: number;
}
