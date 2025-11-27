/**
 * Environment Variable Validation and Configuration
 * 
 * This module provides a centralized way to access environment variables
 * with proper validation and fallbacks for different deployment platforms
 * (Vercel, AWS Amplify, local development).
 * 
 * Key features:
 * - Runtime validation of required environment variables
 * - Graceful fallbacks for optional services
 * - Type-safe access to environment variables
 * - Build-time vs runtime variable handling
 */

// Environment variable definitions with metadata
interface EnvVarConfig {
  key: string;
  required: boolean;
  isPublic: boolean;
  description: string;
  defaultValue?: string;
}

const ENV_CONFIG: EnvVarConfig[] = [
  // Supabase - Required
  { key: 'NEXT_PUBLIC_SUPABASE_URL', required: true, isPublic: true, description: 'Supabase project URL' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, isPublic: true, description: 'Supabase anonymous key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', required: true, isPublic: false, description: 'Supabase service role key' },
  
  // NextAuth - Required
  { key: 'NEXTAUTH_URL', required: true, isPublic: false, description: 'NextAuth base URL', defaultValue: 'http://localhost:3000' },
  { key: 'NEXTAUTH_SECRET', required: true, isPublic: false, description: 'NextAuth secret key' },
  
  // Google OAuth - Required for authentication
  { key: 'GOOGLE_CLIENT_ID', required: true, isPublic: false, description: 'Google OAuth client ID' },
  { key: 'GOOGLE_CLIENT_SECRET', required: true, isPublic: false, description: 'Google OAuth client secret' },
  
  // Upstash Redis - Optional (caching)
  { key: 'UPSTASH_REDIS_REST_URL', required: false, isPublic: false, description: 'Upstash Redis REST URL' },
  { key: 'UPSTASH_REDIS_REST_TOKEN', required: false, isPublic: false, description: 'Upstash Redis REST token' },
  
  // Cloudflare R2 - Optional (media storage)
  { key: 'CLOUDFLARE_R2_ACCESS_KEY_ID', required: false, isPublic: false, description: 'Cloudflare R2 access key' },
  { key: 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', required: false, isPublic: false, description: 'Cloudflare R2 secret key' },
  { key: 'CLOUDFLARE_R2_BUCKET_NAME', required: false, isPublic: false, description: 'Cloudflare R2 bucket name' },
  { key: 'CLOUDFLARE_R2_ENDPOINT', required: false, isPublic: false, description: 'Cloudflare R2 endpoint' },
  { key: 'CLOUDFLARE_R2_PUBLIC_URL', required: false, isPublic: false, description: 'Cloudflare R2 public URL' },
  { key: 'CLOUDFLARE_ACCOUNT_ID', required: false, isPublic: false, description: 'Cloudflare account ID' },
  
  // Gemini AI - Optional (content moderation)
  { key: 'GEMINI_API_KEY', required: false, isPublic: false, description: 'Google Gemini API key' },
];

/**
 * Get an environment variable with optional fallback
 */
export function getEnvVar(key: string, fallback?: string): string | undefined {
  const value = process.env[key];
  if (value !== undefined && value !== '') {
    return value;
  }
  return fallback;
}

/**
 * Get a required environment variable (throws if missing)
 */
export function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Check if an environment variable is set
 */
export function hasEnvVar(key: string): boolean {
  const value = process.env[key];
  return value !== undefined && value !== '';
}

/**
 * Validate all required environment variables
 * Returns an object with validation results
 */
export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const config of ENV_CONFIG) {
    const value = process.env[config.key];
    const hasValue = value !== undefined && value !== '';

    if (config.required && !hasValue) {
      missing.push(config.key);
    } else if (!config.required && !hasValue) {
      warnings.push(`Optional: ${config.key} - ${config.description}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Get environment report (safe for logging - no secrets)
 */
export function getEnvReport(): Record<string, boolean> {
  const report: Record<string, boolean> = {};
  for (const config of ENV_CONFIG) {
    report[config.key] = hasEnvVar(config.key);
  }
  return report;
}

/**
 * Environment configuration object with lazy evaluation
 * This prevents errors during build time when env vars might not be available
 */
export const env = {
  // Supabase
  get supabaseUrl(): string {
    return getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  },
  get supabaseAnonKey(): string {
    return getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  get supabaseServiceRoleKey(): string {
    return getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  },

  // NextAuth
  get nextAuthUrl(): string {
    return getEnvVar('NEXTAUTH_URL', 'http://localhost:3000')!;
  },
  get nextAuthSecret(): string {
    return getRequiredEnvVar('NEXTAUTH_SECRET');
  },

  // Google OAuth
  get googleClientId(): string {
    return getRequiredEnvVar('GOOGLE_CLIENT_ID');
  },
  get googleClientSecret(): string {
    return getRequiredEnvVar('GOOGLE_CLIENT_SECRET');
  },

  // Upstash Redis (optional)
  get redisUrl(): string | undefined {
    return getEnvVar('UPSTASH_REDIS_REST_URL');
  },
  get redisToken(): string | undefined {
    return getEnvVar('UPSTASH_REDIS_REST_TOKEN');
  },
  get hasRedis(): boolean {
    return hasEnvVar('UPSTASH_REDIS_REST_URL') && hasEnvVar('UPSTASH_REDIS_REST_TOKEN');
  },

  // Cloudflare R2 (optional)
  get r2AccessKeyId(): string | undefined {
    return getEnvVar('CLOUDFLARE_R2_ACCESS_KEY_ID');
  },
  get r2SecretAccessKey(): string | undefined {
    return getEnvVar('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  },
  get r2BucketName(): string | undefined {
    return getEnvVar('CLOUDFLARE_R2_BUCKET_NAME');
  },
  get r2Endpoint(): string | undefined {
    return getEnvVar('CLOUDFLARE_R2_ENDPOINT');
  },
  get r2PublicUrl(): string | undefined {
    return getEnvVar('CLOUDFLARE_R2_PUBLIC_URL');
  },
  get r2AccountId(): string | undefined {
    return getEnvVar('CLOUDFLARE_ACCOUNT_ID');
  },
  get hasR2(): boolean {
    return (
      hasEnvVar('CLOUDFLARE_R2_ACCESS_KEY_ID') &&
      hasEnvVar('CLOUDFLARE_R2_SECRET_ACCESS_KEY') &&
      hasEnvVar('CLOUDFLARE_R2_BUCKET_NAME')
    );
  },

  // Gemini AI (optional)
  get geminiApiKey(): string | undefined {
    return getEnvVar('GEMINI_API_KEY');
  },
  get hasGemini(): boolean {
    return hasEnvVar('GEMINI_API_KEY');
  },

  // Runtime detection
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },
  get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  },
  get isVercel(): boolean {
    return hasEnvVar('VERCEL');
  },
  get isAmplify(): boolean {
    return hasEnvVar('AWS_EXECUTION_ENV') || hasEnvVar('AWS_REGION');
  },
};

/**
 * Log environment status (for debugging)
 * Safe to call - doesn't expose secrets
 */
export function logEnvStatus(): void {
  const validation = validateEnv();
  
  console.log('=== Environment Status ===');
  console.log(`Platform: ${env.isVercel ? 'Vercel' : env.isAmplify ? 'AWS Amplify' : 'Local/Other'}`);
  console.log(`Mode: ${env.isProduction ? 'Production' : 'Development'}`);
  console.log(`Valid: ${validation.valid}`);
  
  if (validation.missing.length > 0) {
    console.error('Missing required variables:', validation.missing);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('Optional variables not set:', validation.warnings.length);
  }
  
  console.log('Services available:');
  console.log(`  - Redis: ${env.hasRedis ? '✓' : '✗'}`);
  console.log(`  - R2 Storage: ${env.hasR2 ? '✓' : '✗'}`);
  console.log(`  - Gemini AI: ${env.hasGemini ? '✓' : '✗'}`);
  console.log('========================');
}
