/**
 * Rate Limiting Utility for AI API Endpoints
 *
 * Implements per-user rate limiting to prevent abuse and manage API costs.
 * Uses in-memory storage with automatic cleanup of expired entries.
 *
 * Configuration:
 * - 10 requests per minute per user
 * - Sliding window implementation
 * - Automatic cleanup of expired entries
 */

import { RateLimitResult } from './types';

/**
 * Rate limit configuration
 */
const RATE_LIMIT = 10; // requests per window
const WINDOW_MS = 60 * 1000; // 1 minute in milliseconds

/**
 * Interface for rate limit tracking entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory storage for rate limit tracking
 * Key: userId, Value: RateLimitEntry
 */
const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Check if a user has exceeded their rate limit
 *
 * @param userId - The unique identifier for the user
 * @returns Rate limit result with allowed status and metadata
 */
export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  // Periodically clean up expired entries (1% chance per call)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries(now);
  }

  // No entry exists or entry has expired - create new window
  if (!entry || entry.resetTime < now) {
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });

    return {
      allowed: true,
      limit: RATE_LIMIT,
      remaining: RATE_LIMIT - 1,
    };
  }

  // Check if rate limit has been exceeded
  if (entry.count >= RATE_LIMIT) {
    return {
      allowed: false,
      limit: RATE_LIMIT,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000), // seconds
    };
  }

  // Increment count and allow request
  entry.count++;

  return {
    allowed: true,
    limit: RATE_LIMIT,
    remaining: RATE_LIMIT - entry.count,
  };
}

/**
 * Clean up expired rate limit entries
 *
 * @param now - Current timestamp
 */
function cleanupExpiredEntries(now: number): void {
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Reset rate limit for a specific user
 * Useful for testing or administrative purposes
 *
 * @param userId - The unique identifier for the user
 */
export function resetRateLimit(userId: string): void {
  rateLimitMap.delete(userId);
}

/**
 * Get current rate limit status for a user without incrementing
 *
 * @param userId - The unique identifier for the user
 * @returns Current rate limit status
 */
export function getRateLimitStatus(userId: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || entry.resetTime < now) {
    return {
      allowed: true,
      limit: RATE_LIMIT,
      remaining: RATE_LIMIT,
    };
  }

  const remaining = Math.max(0, RATE_LIMIT - entry.count);

  return {
    allowed: remaining > 0,
    limit: RATE_LIMIT,
    remaining,
    retryAfter: remaining === 0
      ? Math.ceil((entry.resetTime - now) / 1000)
      : undefined,
  };
}
