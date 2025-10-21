/**
 * Integration tests for AI Test Endpoint
 *
 * Tests cover:
 * - Authentication validation
 * - Rate limiting
 * - Input validation
 * - Successful AI requests
 * - Error handling for various Scaleway API errors
 * - Timeout handling
 */

import { NextRequest } from 'next/server';
import { POST } from './route';
import { TEST_IDS } from '@/__tests__/utils/test-data';
import { resetRateLimit } from '@/lib/ai/rate-limiter';
import { ScalewayAPIError } from '@/lib/ai/scaleway-client';

// Mock auth module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock scaleway client
jest.mock('@/lib/ai/scaleway-client', () => {
  const actualModule = jest.requireActual('@/lib/ai/scaleway-client');
  return {
    ...actualModule,
    scalewayClient: {
      chat: jest.fn(),
    },
    ScalewayAPIError: actualModule.ScalewayAPIError,
  };
});

import { auth } from '@/lib/auth';
import { scalewayClient } from '@/lib/ai/scaleway-client';

describe('POST /api/ai/test', () => {
  const mockSession = {
    user: { id: TEST_IDS.user1, email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset rate limit for test user before each test
    resetRateLimit(TEST_IDS.user1);
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no user ID', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: new Date().toISOString(),
      });

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 if message is missing', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid message');
    });

    it('should return 400 if message is not a string', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: 123 }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid message');
    });

    it('should return 400 if message is empty', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: '' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid message. Expected a non-empty string.');
    });

    it('should return 400 if message is too long', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const longMessage = 'a'.repeat(10001);

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: longMessage }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('too long');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (scalewayClient.chat as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: 'AI response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      });

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
    });

    it('should return 429 when rate limit is exceeded', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (scalewayClient.chat as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: 'AI response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      });

      // Make 10 requests to hit the limit
      for (let i = 0; i < 10; i++) {
        const request = new NextRequest('http://localhost:3000/api/ai/test', {
          method: 'POST',
          body: JSON.stringify({ message: `Test message ${i}` }),
        });
        await POST(request);
      }

      // 11th request should be rate limited
      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message 11' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toBe('Rate limit exceeded');
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('Successful AI Requests', () => {
    it('should successfully process a valid AI request', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const mockAIResponse = {
        choices: [
          {
            message: {
              content: 'This is a test AI response',
            },
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15,
        },
      };

      (scalewayClient.chat as jest.Mock).mockResolvedValue(mockAIResponse);

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: 'Hello AI' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.text).toBe('This is a test AI response');
      expect(data.data.usage).toEqual(mockAIResponse.usage);
      expect(data.message).toBe('AI test successful');

      // Verify the AI client was called correctly
      expect(scalewayClient.chat).toHaveBeenCalledWith({
        model: 'llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: 'Hello AI' }],
        temperature: 0.7,
        max_tokens: 1000,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors (401)', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (scalewayClient.chat as jest.Mock).mockRejectedValue(
        new ScalewayAPIError('AI service authentication failed', 401)
      );

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('AI service authentication failed');
    });

    it('should handle rate limit errors from Scaleway (429)', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (scalewayClient.chat as jest.Mock).mockRejectedValue(
        new ScalewayAPIError('Too many requests. Please try again later.', 429)
      );

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toContain('Too many requests');
    });

    it('should handle server errors (500)', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (scalewayClient.chat as jest.Mock).mockRejectedValue(
        new ScalewayAPIError('AI service is temporarily unavailable', 500)
      );

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('AI service is temporarily unavailable');
    });

    it('should handle service unavailable errors (503)', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (scalewayClient.chat as jest.Mock).mockRejectedValue(
        new ScalewayAPIError('AI service is temporarily unavailable', 503)
      );

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toBe('AI service is temporarily unavailable');
    });

    it('should handle timeout errors (408)', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (scalewayClient.chat as jest.Mock).mockRejectedValue(
        new ScalewayAPIError(
          'Request timeout - AI service took too long to respond',
          408
        )
      );

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(408);
      const data = await response.json();
      expect(data.error).toContain('timeout');
    });

    it('should handle generic errors gracefully', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (scalewayClient.chat as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });
});
