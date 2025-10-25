import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock dependencies
jest.mock('@/lib/background-jobs/share-expiry', () => ({
  expireShares: jest.fn(),
}));

import { expireShares } from '@/lib/background-jobs/share-expiry';

describe('GET /api/cron/expire-shares', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment to development by default
    process.env = { ...originalEnv, NODE_ENV: 'development' };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should allow access in development without cron secret', async () => {
    process.env.NODE_ENV = 'development';

    (expireShares as jest.Mock).mockResolvedValue({
      expired: 5,
    });

    const request = new NextRequest('http://localhost:3000/api/cron/expire-shares');

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.expired).toBe(5);
    expect(data.timestamp).toBeDefined();

    expect(expireShares).toHaveBeenCalled();
  });

  it('should return 500 in production if CRON_SECRET not configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CRON_SECRET;

    const request = new NextRequest('http://localhost:3000/api/cron/expire-shares', {
      headers: {
        'authorization': 'Bearer some-token',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Server configuration error');

    expect(expireShares).not.toHaveBeenCalled();
  });

  it('should return 401 in production if authorization header missing', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 'test-secret-key';

    const request = new NextRequest('http://localhost:3000/api/cron/expire-shares');

    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');

    expect(expireShares).not.toHaveBeenCalled();
  });

  it('should return 401 in production if cron secret is incorrect', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 'correct-secret-key';

    const request = new NextRequest('http://localhost:3000/api/cron/expire-shares', {
      headers: {
        'authorization': 'Bearer wrong-secret-key',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');

    expect(expireShares).not.toHaveBeenCalled();
  });

  it('should successfully expire shares in production with correct secret', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 'correct-secret-key';

    (expireShares as jest.Mock).mockResolvedValue({
      expired: 10,
    });

    const request = new NextRequest('http://localhost:3000/api/cron/expire-shares', {
      headers: {
        'authorization': 'Bearer correct-secret-key',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.expired).toBe(10);
    expect(data.timestamp).toBeDefined();

    expect(expireShares).toHaveBeenCalled();
  });

  it('should handle zero expired shares', async () => {
    process.env.NODE_ENV = 'development';

    (expireShares as jest.Mock).mockResolvedValue({
      expired: 0,
    });

    const request = new NextRequest('http://localhost:3000/api/cron/expire-shares');

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.expired).toBe(0);
  });

  it('should handle large numbers of expired shares', async () => {
    process.env.NODE_ENV = 'development';

    (expireShares as jest.Mock).mockResolvedValue({
      expired: 1000,
    });

    const request = new NextRequest('http://localhost:3000/api/cron/expire-shares');

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.expired).toBe(1000);
  });

  it('should return 500 if expireShares throws error', async () => {
    process.env.NODE_ENV = 'development';

    (expireShares as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/cron/expire-shares');

    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to expire shares');
  });

  it('should accept Bearer token format in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 'my-secret';

    (expireShares as jest.Mock).mockResolvedValue({
      expired: 3,
    });

    const request = new NextRequest('http://localhost:3000/api/cron/expire-shares', {
      headers: {
        'authorization': 'Bearer my-secret',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.expired).toBe(3);
  });

  it('should reject non-Bearer token format in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 'my-secret';

    const request = new NextRequest('http://localhost:3000/api/cron/expire-shares', {
      headers: {
        'authorization': 'my-secret', // Missing "Bearer " prefix
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });
});
