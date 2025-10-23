/**
 * Application Configuration & Feature Flags
 *
 * Centralizes environment variable access and feature toggles.
 * Makes third-party services (Scaleway AI, S3, Resend) optional.
 *
 * Usage:
 *   import { config } from '@/lib/config';
 *
 *   if (config.features.ai.enabled) {
 *     // Use AI features
 *   }
 */

// =============================================================================
// Feature Flags
// =============================================================================

export const features = {
  /**
   * AI Features (Scaleway)
   * Enabled when all required Scaleway AI credentials are present
   */
  ai: {
    enabled: !!(
      process.env.SCW_ACCESS_KEY &&
      process.env.SCW_SECRET_KEY &&
      process.env.SCW_DEFAULT_PROJECT_ID
    ),
  },

  /**
   * File Upload Features (Scaleway S3)
   * Enabled when all required Scaleway S3 credentials are present
   */
  storage: {
    enabled: !!(
      process.env.SCALEWAY_ACCESS_KEY &&
      process.env.SCALEWAY_SECRET_KEY &&
      process.env.SCALEWAY_BUCKET_NAME
    ),
  },

  /**
   * Email Features (Resend)
   * Enabled when Resend API key is present
   */
  email: {
    enabled: !!process.env.RESEND_API_KEY,
  },

  /**
   * Cron Job Features
   * Enabled when CRON_SECRET is present for security
   */
  cron: {
    enabled: !!process.env.CRON_SECRET,
  },
} as const;

// =============================================================================
// Scaleway AI Configuration
// =============================================================================

export const scalewayAI = {
  accessKey: process.env.SCW_ACCESS_KEY || '',
  secretKey: process.env.SCW_SECRET_KEY || '',
  organizationId: process.env.SCW_DEFAULT_ORGANIZATION_ID || '',
  projectId: process.env.SCW_DEFAULT_PROJECT_ID || '',
  region: process.env.SCW_REGION || 'fr-par',

  /**
   * Check if AI is properly configured
   */
  isConfigured(): boolean {
    return features.ai.enabled;
  },

  /**
   * Get AI endpoint URL
   */
  getEndpoint(): string {
    const region = this.region;
    return `https://api.scaleway.com/llm/v1alpha1/regions/${region}`;
  },
} as const;

// =============================================================================
// Scaleway S3 Storage Configuration
// =============================================================================

export const scalewayStorage = {
  accessKey: process.env.SCALEWAY_ACCESS_KEY || '',
  secretKey: process.env.SCALEWAY_SECRET_KEY || '',
  bucketName: process.env.SCALEWAY_BUCKET_NAME || '',
  region: process.env.SCALEWAY_REGION || 'fr-par',

  /**
   * Check if storage is properly configured
   */
  isConfigured(): boolean {
    return features.storage.enabled;
  },

  /**
   * Get S3 endpoint URL
   */
  getEndpoint(): string {
    const region = this.region;
    return `https://s3.${region}.scw.cloud`;
  },

  /**
   * Get bucket URL
   */
  getBucketUrl(): string {
    return `${this.getEndpoint()}/${this.bucketName}`;
  },
} as const;

// =============================================================================
// Email Configuration (Resend)
// =============================================================================

export const email = {
  apiKey: process.env.RESEND_API_KEY || '',
  fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@edfolio.app',
  fromName: process.env.EMAIL_FROM_NAME || 'Edfolio',

  /**
   * Check if email is properly configured
   */
  isConfigured(): boolean {
    return features.email.enabled;
  },

  /**
   * Get formatted "from" address
   */
  getFromAddress(): string {
    return `${this.fromName} <${this.fromAddress}>`;
  },
} as const;

// =============================================================================
// Application Configuration
// =============================================================================

export const app = {
  /**
   * Application URL (auto-detected or from env)
   */
  url: process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://localhost:3000',

  /**
   * Environment
   */
  env: process.env.NODE_ENV || 'development',

  /**
   * Check if in production
   */
  isProduction(): boolean {
    return this.env === 'production';
  },

  /**
   * Check if in development
   */
  isDevelopment(): boolean {
    return this.env === 'development';
  },
} as const;

// =============================================================================
// Cron Configuration
// =============================================================================

export const cron = {
  secret: process.env.CRON_SECRET || '',

  /**
   * Check if cron is properly configured
   */
  isConfigured(): boolean {
    return features.cron.enabled;
  },

  /**
   * Verify cron request authorization
   */
  verifyAuth(authHeader: string | null): boolean {
    if (!this.isConfigured()) {
      return false;
    }
    return authHeader === `Bearer ${this.secret}`;
  },
} as const;

// =============================================================================
// Unified Config Export
// =============================================================================

export const config = {
  features,
  scalewayAI,
  scalewayStorage,
  email,
  app,
  cron,
} as const;

// =============================================================================
// Type Exports for TypeScript
// =============================================================================

export type Config = typeof config;
export type Features = typeof features;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a feature is enabled and throw if not
 * Useful for API routes that require specific features
 */
export function requireFeature(
  feature: keyof Features,
  errorMessage?: string
): void {
  if (!features[feature].enabled) {
    throw new Error(
      errorMessage || `Feature '${feature}' is not enabled. Check environment variables.`
    );
  }
}

/**
 * Get missing environment variables for a feature
 * Useful for debugging configuration issues
 */
export function getMissingEnvVars(feature: keyof Features): string[] {
  const missing: string[] = [];

  switch (feature) {
    case 'ai':
      if (!process.env.SCW_ACCESS_KEY) missing.push('SCW_ACCESS_KEY');
      if (!process.env.SCW_SECRET_KEY) missing.push('SCW_SECRET_KEY');
      if (!process.env.SCW_DEFAULT_PROJECT_ID) missing.push('SCW_DEFAULT_PROJECT_ID');
      break;

    case 'storage':
      if (!process.env.SCALEWAY_ACCESS_KEY) missing.push('SCALEWAY_ACCESS_KEY');
      if (!process.env.SCALEWAY_SECRET_KEY) missing.push('SCALEWAY_SECRET_KEY');
      if (!process.env.SCALEWAY_BUCKET_NAME) missing.push('SCALEWAY_BUCKET_NAME');
      break;

    case 'email':
      if (!process.env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
      break;

    case 'cron':
      if (!process.env.CRON_SECRET) missing.push('CRON_SECRET');
      break;
  }

  return missing;
}

/**
 * Log configuration status on server startup
 * Useful for debugging deployment issues
 */
export function logConfigStatus(): void {
  if (app.isDevelopment()) {
    console.log('🔧 Configuration Status:');
    console.log(`   Environment: ${app.env}`);
    console.log(`   App URL: ${app.url}`);
    console.log(`   AI Features: ${features.ai.enabled ? '✅' : '❌'}`);
    console.log(`   Storage Features: ${features.storage.enabled ? '✅' : '❌'}`);
    console.log(`   Email Features: ${features.email.enabled ? '✅' : '❌'}`);
    console.log(`   Cron Features: ${features.cron.enabled ? '✅' : '❌'}`);

    // Show missing env vars for disabled features
    Object.keys(features).forEach((feature) => {
      const featureKey = feature as keyof Features;
      if (!features[featureKey].enabled) {
        const missing = getMissingEnvVars(featureKey);
        if (missing.length > 0) {
          console.log(`   ℹ️  ${feature} disabled - missing: ${missing.join(', ')}`);
        }
      }
    });
  }
}

// =============================================================================
// Auto-log on import (development only)
// =============================================================================

if (app.isDevelopment() && typeof window === 'undefined') {
  // Only log on server side in development
  logConfigStatus();
}
