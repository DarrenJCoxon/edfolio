/**
 * Tests for CSRF Validation Middleware
 *
 * Tests the server-side CSRF token validation for API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCsrfProtection, isCsrfError } from './csrf-validation';

describe('withCsrfProtection', () => {
  // Mock handler that returns success
  const mockHandler = jest.fn(async (request: NextRequest) => {
    return NextResponse.json({ success: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Safe HTTP Methods (GET, HEAD, OPTIONS)', () => {
    it('should allow GET requests without CSRF token', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const response = await protectedHandler(request, {});

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalledWith(request, {});
    });

    it('should allow HEAD requests without CSRF token', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'HEAD',
      });

      const response = await protectedHandler(request, {});

      expect(mockHandler).toHaveBeenCalledWith(request, {});
    });

    it('should allow OPTIONS requests without CSRF token', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
      });

      const response = await protectedHandler(request, {});

      expect(mockHandler).toHaveBeenCalledWith(request, {});
    });
  });

  describe('Protected HTTP Methods (POST, PUT, PATCH, DELETE)', () => {
    const validToken = 'abc123def456ghi789jkl012mno345pq'; // 32+ char token

    describe('POST requests', () => {
      it('should reject POST request without CSRF token', async () => {
        const protectedHandler = withCsrfProtection(mockHandler);
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        });

        const response = await protectedHandler(request, {});

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toBe('CSRF validation failed');
        expect(data.code).toBe('CSRF_TOKEN_INVALID');
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('should allow POST request with valid CSRF token in X-CSRF-Token header', async () => {
        const protectedHandler = withCsrfProtection(mockHandler);
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': validToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: 'test' }),
        });

        const response = await protectedHandler(request, {});

        expect(response.status).toBe(200);
        expect(mockHandler).toHaveBeenCalledWith(request, {});
      });

      it('should reject POST request with empty CSRF token', async () => {
        const protectedHandler = withCsrfProtection(mockHandler);
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': '',
          },
          body: JSON.stringify({ data: 'test' }),
        });

        const response = await protectedHandler(request, {});

        expect(response.status).toBe(403);
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('should reject POST request with short CSRF token (< 16 chars)', async () => {
        const protectedHandler = withCsrfProtection(mockHandler);
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': 'short', // Only 5 characters
          },
          body: JSON.stringify({ data: 'test' }),
        });

        const response = await protectedHandler(request, {});

        expect(response.status).toBe(403);
        expect(mockHandler).not.toHaveBeenCalled();
      });
    });

    describe('PUT requests', () => {
      it('should reject PUT request without CSRF token', async () => {
        const protectedHandler = withCsrfProtection(mockHandler);
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'PUT',
          body: JSON.stringify({ data: 'test' }),
        });

        const response = await protectedHandler(request, {});

        expect(response.status).toBe(403);
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('should allow PUT request with valid CSRF token', async () => {
        const protectedHandler = withCsrfProtection(mockHandler);
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'PUT',
          headers: {
            'X-CSRF-Token': validToken,
          },
          body: JSON.stringify({ data: 'test' }),
        });

        const response = await protectedHandler(request, {});

        expect(response.status).toBe(200);
        expect(mockHandler).toHaveBeenCalledWith(request, {});
      });
    });

    describe('PATCH requests', () => {
      it('should reject PATCH request without CSRF token', async () => {
        const protectedHandler = withCsrfProtection(mockHandler);
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'PATCH',
          body: JSON.stringify({ data: 'test' }),
        });

        const response = await protectedHandler(request, {});

        expect(response.status).toBe(403);
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('should allow PATCH request with valid CSRF token', async () => {
        const protectedHandler = withCsrfProtection(mockHandler);
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'PATCH',
          headers: {
            'X-CSRF-Token': validToken,
          },
          body: JSON.stringify({ data: 'test' }),
        });

        const response = await protectedHandler(request, {});

        expect(response.status).toBe(200);
        expect(mockHandler).toHaveBeenCalledWith(request, {});
      });
    });

    describe('DELETE requests', () => {
      it('should reject DELETE request without CSRF token', async () => {
        const protectedHandler = withCsrfProtection(mockHandler);
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'DELETE',
        });

        const response = await protectedHandler(request, {});

        expect(response.status).toBe(403);
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('should allow DELETE request with valid CSRF token', async () => {
        const protectedHandler = withCsrfProtection(mockHandler);
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': validToken,
          },
        });

        const response = await protectedHandler(request, {});

        expect(response.status).toBe(200);
        expect(mockHandler).toHaveBeenCalledWith(request, {});
      });
    });
  });

  describe('Token Extraction', () => {
    it('should extract token from X-CSRF-Token header (primary)', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);
      const token = 'abc123def456ghi789jkl012mno345pq';

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': token,
        },
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await protectedHandler(request, {});

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should not accept X-Requested-With header as CSRF token', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest', // Not sufficient for CSRF protection
        },
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await protectedHandler(request, {});

      expect(response.status).toBe(403);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Token Format Validation', () => {
    it('should reject null token', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        // No X-CSRF-Token header
      });

      const response = await protectedHandler(request, {});

      expect(response.status).toBe(403);
    });

    it('should reject whitespace-only token', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': '     ', // Whitespace only
        },
      });

      const response = await protectedHandler(request, {});

      expect(response.status).toBe(403);
    });

    it('should reject token shorter than 16 characters', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': 'abc123', // Only 6 characters
        },
      });

      const response = await protectedHandler(request, {});

      expect(response.status).toBe(403);
    });

    it('should accept token with exactly 16 characters', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': 'abcdef0123456789', // Exactly 16 characters
        },
      });

      const response = await protectedHandler(request, {});

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should accept very long tokens (64+ chars)', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);
      const longToken = 'a'.repeat(64);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': longToken,
        },
      });

      const response = await protectedHandler(request, {});

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should accept tokens with special characters', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);
      const specialToken = 'abc+123/def=456_ghi-789jkl012mno';

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': specialToken,
        },
      });

      const response = await protectedHandler(request, {});

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('Context Passing', () => {
    it('should pass context to handler correctly', async () => {
      const mockHandlerWithContext = jest.fn(async (request: NextRequest, context: any) => {
        return NextResponse.json({ context });
      });

      const protectedHandler = withCsrfProtection(mockHandlerWithContext);
      const context = { params: { id: '123' }, foo: 'bar' };

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET', // Safe method, no CSRF needed
      });

      await protectedHandler(request, context);

      expect(mockHandlerWithContext).toHaveBeenCalledWith(request, context);
    });

    it('should pass context even with CSRF validation', async () => {
      const mockHandlerWithContext = jest.fn(async (request: NextRequest, context: any) => {
        return NextResponse.json({ context });
      });

      const protectedHandler = withCsrfProtection(mockHandlerWithContext);
      const context = { params: { id: '456' } };

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': 'abc123def456ghi789jkl012mno345pq',
        },
      });

      await protectedHandler(request, context);

      expect(mockHandlerWithContext).toHaveBeenCalledWith(request, context);
    });
  });

  describe('Error Response Format', () => {
    it('should return structured error response on CSRF failure', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      });

      const response = await protectedHandler(request, {});

      expect(response.status).toBe(403);
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('message');
      expect(data.error).toBe('CSRF validation failed');
      expect(data.code).toBe('CSRF_TOKEN_INVALID');
      expect(data.message).toContain('refresh the page');
    });

    it('should not leak sensitive information in error response', async () => {
      const protectedHandler = withCsrfProtection(mockHandler);
      const shortToken = 'invalid-123';  // Too short (< 16 chars), will fail validation

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': shortToken,
        },
      });

      const response = await protectedHandler(request, {});

      expect(response.status).toBe(403);
      const data = await response.json();

      // Should not include the actual token in response
      expect(JSON.stringify(data)).not.toContain(shortToken);
    });
  });
});

describe('isCsrfError', () => {
  it('should return true for 403 response with JSON content type', () => {
    const response = new Response(
      JSON.stringify({ error: 'CSRF validation failed' }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    expect(isCsrfError(response)).toBe(true);
  });

  it('should return false for non-403 response', () => {
    const response = new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    expect(isCsrfError(response)).toBe(false);
  });

  it('should return false for 403 response without JSON content type', () => {
    const response = new Response('Forbidden', {
      status: 403,
      headers: {
        'Content-Type': 'text/html',
      },
    });

    expect(isCsrfError(response)).toBe(false);
  });

  it('should return true for 403 with charset in content type', () => {
    const response = new Response(
      JSON.stringify({ error: 'CSRF validation failed' }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );

    expect(isCsrfError(response)).toBe(true);
  });

  it('should return false for 403 without content-type header', () => {
    const response = new Response('Forbidden', {
      status: 403,
    });

    expect(isCsrfError(response)).toBe(false);
  });
});
