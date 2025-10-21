/**
 * Scaleway AI Client Utility
 *
 * Provides a type-safe client for interacting with Scaleway AI Generative APIs.
 * All data processing occurs in EU (France, Paris datacenter) for GDPR compliance.
 *
 * Features:
 * - Exponential backoff retry logic
 * - Request timeout handling
 * - Comprehensive error handling
 * - Type-safe request/response interfaces
 */

import {
  ScalewayChatRequest,
  ScalewayChatResponse,
  ScalewayError,
  ScalewayClientConfig,
} from './types';

/**
 * Default configuration values
 */
const DEFAULT_BASE_URL = 'https://api.scaleway.ai/v1';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MODEL = 'llama-3.1-8b-instruct';

/**
 * User-friendly error messages for common API errors
 */
const ERROR_MESSAGES: Record<number, string> = {
  401: 'AI service authentication failed',
  429: 'Too many requests. Please try again later.',
  500: 'AI service is temporarily unavailable',
  503: 'AI service is temporarily unavailable',
};

/**
 * Custom error class for Scaleway API errors
 */
class ScalewayAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ScalewayAPIError';
  }
}

/**
 * Scaleway AI Client
 */
class ScalewayClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config?: Partial<ScalewayClientConfig>) {
    const apiKey = config?.apiKey || process.env.SCW_SECRET_KEY;

    if (!apiKey) {
      throw new Error('Scaleway API key is required (SCW_SECRET_KEY)');
    }

    this.apiKey = apiKey;
    this.baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
    this.timeout = config?.timeout || DEFAULT_TIMEOUT;
    this.maxRetries = config?.maxRetries || DEFAULT_MAX_RETRIES;
  }

  /**
   * Send a chat completion request to Scaleway AI
   */
  async chat(request: ScalewayChatRequest): Promise<ScalewayChatResponse> {
    return this.makeRequest('/chat/completions', request);
  }

  /**
   * Make an authenticated request to Scaleway API with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    body: unknown
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.executeRequest<T>(endpoint, body);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx except 429)
        if (
          error instanceof ScalewayAPIError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 429
        ) {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === this.maxRetries) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Execute a single request to Scaleway API
   */
  private async executeRequest<T>(
    endpoint: string,
    body: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if ((error as Error).name === 'AbortError') {
        throw new ScalewayAPIError(
          'Request timeout - AI service took too long to respond',
          408
        );
      }

      throw error;
    }
  }

  /**
   * Handle error responses from Scaleway API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const status = response.status;
    let errorMessage = ERROR_MESSAGES[status] || 'AI request failed';
    let errorCode: string | undefined;

    try {
      const errorData: ScalewayError = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
      if (errorData.error?.code) {
        errorCode = errorData.error.code;
      }
    } catch {
      // If we can't parse the error response, use the default message
    }

    throw new ScalewayAPIError(errorMessage, status, errorCode);
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance of Scaleway client
 * Similar pattern to Prisma client singleton
 */
const globalForScaleway = global as unknown as {
  scalewayClient: ScalewayClient | undefined;
};

export const scalewayClient =
  globalForScaleway.scalewayClient ||
  new ScalewayClient();

if (process.env.NODE_ENV !== 'production') {
  globalForScaleway.scalewayClient = scalewayClient;
}

/**
 * Export the error class for error handling in API routes
 */
export { ScalewayAPIError };

/**
 * Export default model constant
 */
export { DEFAULT_MODEL };
