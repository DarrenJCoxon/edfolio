import { NextRequest } from 'next/server';
import { POST } from './route';
import { prismaMock } from '@/__tests__/utils/prisma-mock';

jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn((password: string) =>
    Promise.resolve(`hashed_${password}`)
  ),
}));

import { hashPassword } from '@/lib/auth';

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create user and default folio successfully', async () => {
    const mockUser = {
      id: 'clh0e8r5k0000jw0c8y5d6usr1',
      email: 'test@example.com',
      name: 'test',
      password: 'hashed_password123',
      themePreference: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockFolio = {
      id: 'clh0e8r5k0000jw0c8y5d6fol1',
      name: 'My Folio',
      ownerId: 'clh0e8r5k0000jw0c8y5d6usr1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => Promise<unknown>) => {
      const tx = {
        user: {
          create: jest.fn().mockResolvedValue(mockUser),
        },
        folio: {
          create: jest.fn().mockResolvedValue(mockFolio),
        },
      };
      return callback(tx);
    });

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.email).toBe('test@example.com');
    expect(data.data.name).toBe('test');
    expect(data.message).toBe('User created successfully');
    expect(hashPassword).toHaveBeenCalledWith('password123');
  });

  it('should return 400 if user already exists', async () => {
    const existingUser = {
      id: 'clh0e8r5k0000jw0c8y5d6usr1',
      email: 'existing@example.com',
      name: 'Existing User' as string | null,
      password: 'hashed_password',
      themePreference: 'system' as string | null,
      emailVerified: null as Date | null,
      image: null as string | null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.user.findUnique.mockResolvedValue(existingUser);

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('User with this email already exists');
  });

  it('should return 400 for invalid email', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'password123',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
    expect(data.details).toBeDefined();
  });

  it('should return 400 for password too short', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'short',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
    expect(data.details).toBeDefined();
  });

  it('should return 400 for password too long', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'a'.repeat(101),
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should return 400 for missing email', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        password: 'password123',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should return 400 for missing password', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should handle database errors gracefully', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to create user');
  });

  it('should derive username from email', async () => {
    const mockUser = {
      id: 'clh0e8r5k0000jw0c8y5d6usr1',
      email: 'john.doe@example.com',
      name: 'john.doe',
      password: 'hashed_password123',
      themePreference: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => Promise<unknown>) => {
      const tx = {
        user: {
          create: jest.fn().mockResolvedValue(mockUser),
        },
        folio: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      return callback(tx);
    });

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'john.doe@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.name).toBe('john.doe');
  });
});
