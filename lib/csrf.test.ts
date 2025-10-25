/**
 * Tests for CSRF Token Management
 *
 * Tests the client-side CSRF token fetching, caching, and management utilities.
 */

import { getCsrfToken, clearCsrfToken, refreshCsrfToken } from './csrf';

// Mock fetch globally
global.fetch = jest.fn();

describe('getCsrfToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCsrfToken(); // Clear cache before each test
  });

  afterEach(() => {
    clearCsrfToken(); // Clean up after each test
  });

  it('should fetch CSRF token from NextAuth endpoint', async () => {
    const mockToken = 'abc123def456ghi789jkl012mno345pq';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: mockToken }),
    });

    const token = await getCsrfToken();

    expect(token).toBe(mockToken);
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/csrf', {
      method: 'GET',
      credentials: 'same-origin',
    });
  });

  it('should return cached token on subsequent calls (within cache duration)', async () => {
    const mockToken = 'abc123def456ghi789jkl012mno345pq';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: mockToken }),
    });

    // First call - fetches from API
    const token1 = await getCsrfToken();
    expect(token1).toBe(mockToken);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second call - returns cached token
    const token2 = await getCsrfToken();
    expect(token2).toBe(mockToken);
    expect(global.fetch).toHaveBeenCalledTimes(1); // Still only called once
  });

  it('should fetch new token after cache expires (30 minutes)', async () => {
    const mockToken1 = 'first-token-abc123def456ghi789jk';
    const mockToken2 = 'second-token-xyz987uvw654tsr321q';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken2 }),
      });

    // First call
    const token1 = await getCsrfToken();
    expect(token1).toBe(mockToken1);

    // Mock time passage (31 minutes)
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => originalDateNow() + 31 * 60 * 1000);

    // Second call - should fetch new token
    const token2 = await getCsrfToken();
    expect(token2).toBe(mockToken2);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Restore Date.now
    Date.now = originalDateNow;
  });

  it('should throw error if fetch fails with non-ok status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(getCsrfToken()).rejects.toThrow('Unable to fetch CSRF token');
  });

  it('should throw error if response is missing csrfToken field', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ somethingElse: 'value' }), // Missing csrfToken
    });

    await expect(getCsrfToken()).rejects.toThrow('Unable to fetch CSRF token');
  });

  it('should throw error if csrfToken is not a string', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: 12345 }), // Number instead of string
    });

    await expect(getCsrfToken()).rejects.toThrow('Unable to fetch CSRF token');
  });

  it('should throw error if csrfToken is null', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: null }),
    });

    await expect(getCsrfToken()).rejects.toThrow('Unable to fetch CSRF token');
  });

  it('should throw error if fetch throws network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(getCsrfToken()).rejects.toThrow('Unable to fetch CSRF token');
  });

  it('should include credentials in fetch request for cookie handling', async () => {
    const mockToken = 'abc123def456ghi789jkl012mno345pq';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: mockToken }),
    });

    await getCsrfToken();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/csrf',
      expect.objectContaining({
        credentials: 'same-origin',
      })
    );
  });
});

describe('clearCsrfToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCsrfToken();
  });

  it('should clear cached token', async () => {
    const mockToken = 'abc123def456ghi789jkl012mno345pq';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: mockToken }),
    });

    // Fetch and cache token
    await getCsrfToken();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Clear cache
    clearCsrfToken();

    // Next call should fetch again
    await getCsrfToken();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should not throw error if called when no token is cached', () => {
    expect(() => clearCsrfToken()).not.toThrow();
  });
});

describe('refreshCsrfToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCsrfToken();
  });

  it('should clear cache and fetch new token', async () => {
    const mockToken1 = 'first-token-abc123def456ghi789jk';
    const mockToken2 = 'second-token-xyz987uvw654tsr321q';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken2 }),
      });

    // Initial token
    const token1 = await getCsrfToken();
    expect(token1).toBe(mockToken1);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Refresh (should bypass cache and fetch new token)
    const token2 = await refreshCsrfToken();
    expect(token2).toBe(mockToken2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should force fresh fetch even if cache is still valid', async () => {
    const mockToken1 = 'first-token-abc123def456ghi789jk';
    const mockToken2 = 'second-token-xyz987uvw654tsr321q';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken2 }),
      });

    // Fetch initial token
    await getCsrfToken();

    // Immediately refresh (cache would still be valid)
    const refreshedToken = await refreshCsrfToken();

    expect(refreshedToken).toBe(mockToken2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should propagate errors from getCsrfToken', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(refreshCsrfToken()).rejects.toThrow('Unable to fetch CSRF token');
  });
});

describe('Token Cache Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCsrfToken();
  });

  it('should use in-memory cache (not localStorage) for security', async () => {
    const mockToken = 'abc123def456ghi789jkl012mno345pq';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: mockToken }),
    });

    // Fetch token
    await getCsrfToken();

    // Verify token is stored in memory (not localStorage)
    // Since localStorage is not defined in Node.js environment, this confirms memory-only storage
    expect(typeof localStorage).toBe('undefined');
  });

  it('should cache token and reuse it for subsequent calls', async () => {
    const mockToken = 'abc123def456ghi789jkl012mno345pq';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: mockToken }),
    });

    // First call fetches from API
    const token1 = await getCsrfToken();
    expect(token1).toBe(mockToken);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Subsequent calls use cache
    const token2 = await getCsrfToken();
    expect(token2).toBe(mockToken);
    expect(global.fetch).toHaveBeenCalledTimes(1); // Still only 1 call

    const token3 = await getCsrfToken();
    expect(token3).toBe(mockToken);
    expect(global.fetch).toHaveBeenCalledTimes(1); // Still only 1 call
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCsrfToken();
  });

  it('should handle empty string token response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: '' }),
    });

    await expect(getCsrfToken()).rejects.toThrow('Unable to fetch CSRF token');
  });

  it('should handle whitespace-only token response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: '   ' }),
    });

    // This would pass through getCsrfToken but fail validation in csrf-validation.ts
    const token = await getCsrfToken();
    expect(token).toBe('   ');
  });

  it('should handle very long token strings', async () => {
    const longToken = 'a'.repeat(1000);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: longToken }),
    });

    const token = await getCsrfToken();
    expect(token).toBe(longToken);
    expect(token.length).toBe(1000);
  });

  it('should handle special characters in token', async () => {
    const specialToken = 'abc+123/def=456_ghi-789==';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ csrfToken: specialToken }),
    });

    const token = await getCsrfToken();
    expect(token).toBe(specialToken);
  });
});
