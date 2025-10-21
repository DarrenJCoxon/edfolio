import { NextRequest } from 'next/server';
import { PATCH } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';
import { createMockUser } from '@/__tests__/utils/test-data';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';

const mockSession = {
  user: { id: 'clh0e8r5k0000jw0c8y5d6usr1', email: 'test@example.com', name: 'Test User' },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

describe('PATCH /api/user/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/user/preferences',
      {
        method: 'PATCH',
        body: JSON.stringify({ themePreference: 'dark' }),
      }
    );

    const response = await PATCH(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should update theme preference to light', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const updatedUser = createMockUser({
      themePreference: 'light',
    });

    prismaMock.user.update.mockResolvedValue(updatedUser);

    const request = new NextRequest(
      'http://localhost:3000/api/user/preferences',
      {
        method: 'PATCH',
        body: JSON.stringify({ themePreference: 'light' }),
      }
    );

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.themePreference).toBe('light');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'clh0e8r5k0000jw0c8y5d6usr1' },
      data: { themePreference: 'light' },
    });
  });

  it('should update theme preference to dark', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const updatedUser = createMockUser({
      themePreference: 'dark',
    });

    prismaMock.user.update.mockResolvedValue(updatedUser);

    const request = new NextRequest(
      'http://localhost:3000/api/user/preferences',
      {
        method: 'PATCH',
        body: JSON.stringify({ themePreference: 'dark' }),
      }
    );

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.themePreference).toBe('dark');
  });

  it('should update theme preference to system', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const updatedUser = createMockUser({
      themePreference: 'system',
    });

    prismaMock.user.update.mockResolvedValue(updatedUser);

    const request = new NextRequest(
      'http://localhost:3000/api/user/preferences',
      {
        method: 'PATCH',
        body: JSON.stringify({ themePreference: 'system' }),
      }
    );

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.themePreference).toBe('system');
  });

  it('should return 400 for invalid theme preference', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest(
      'http://localhost:3000/api/user/preferences',
      {
        method: 'PATCH',
        body: JSON.stringify({ themePreference: 'invalid' }),
      }
    );

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      'Invalid theme preference. Must be "light", "dark", or "system"'
    );
  });

  it('should return 400 for missing theme preference', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    const request = new NextRequest(
      'http://localhost:3000/api/user/preferences',
      {
        method: 'PATCH',
        body: JSON.stringify({}),
      }
    );

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      'Invalid theme preference. Must be "light", "dark", or "system"'
    );
  });

  it('should handle database errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockSession);

    prismaMock.user.update.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest(
      'http://localhost:3000/api/user/preferences',
      {
        method: 'PATCH',
        body: JSON.stringify({ themePreference: 'dark' }),
      }
    );

    const response = await PATCH(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to update theme preference');
  });
});
