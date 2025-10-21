// This file must be imported before any code that uses Prisma
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Create the mock before any imports
const prismaMock = mockDeep<PrismaClient>();

// Mock the module
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: prismaMock,
}));

// Export for use in tests
export { prismaMock };

// Reset before each test
beforeEach(() => {
  mockReset(prismaMock);
});