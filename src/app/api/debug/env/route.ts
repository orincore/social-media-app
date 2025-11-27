import { NextResponse } from 'next/server';
import { getEnvReport, validateEnv, env } from '@/lib/env';

/**
 * Debug endpoint to verify environment configuration
 * 
 * IMPORTANT: This only returns booleans (no secret values).
 * Use this to diagnose deployment issues on Vercel/Amplify.
 * 
 * GET /api/debug/env
 */

interface EnvDebugResponse {
  // Environment variable status (true = set, false = not set)
  variables: Record<string, boolean>;
  
  // Validation results
  validation: {
    valid: boolean;
    missingRequired: string[];
    optionalNotSet: number;
  };
  
  // Platform detection
  platform: {
    name: string;
    isProduction: boolean;
    nodeEnv: string;
  };
  
  // Service availability
  services: {
    supabase: boolean;
    redis: boolean;
    r2Storage: boolean;
    geminiAI: boolean;
  };
  
  // Runtime info
  runtime: {
    type: 'node' | 'edge' | 'unknown';
    nodeVersion: string;
  };
}

export async function GET() {
  // Get environment report
  const envReport = getEnvReport();
  const validation = validateEnv();
  
  // Detect platform
  let platformName = 'Local/Other';
  if (process.env.VERCEL) {
    platformName = 'Vercel';
  } else if (process.env.AWS_EXECUTION_ENV || process.env.AWS_REGION) {
    platformName = 'AWS Amplify';
  } else if (process.env.NETLIFY) {
    platformName = 'Netlify';
  } else if (process.env.RAILWAY_ENVIRONMENT) {
    platformName = 'Railway';
  } else if (process.env.RENDER) {
    platformName = 'Render';
  }
  
  const response: EnvDebugResponse = {
    variables: envReport,
    
    validation: {
      valid: validation.valid,
      missingRequired: validation.missing,
      optionalNotSet: validation.warnings.length,
    },
    
    platform: {
      name: platformName,
      isProduction: process.env.NODE_ENV === 'production',
      nodeEnv: process.env.NODE_ENV || 'undefined',
    },
    
    services: {
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      redis: env.hasRedis,
      r2Storage: env.hasR2,
      geminiAI: env.hasGemini,
    },
    
    runtime: {
      type: 'node',
      nodeVersion: process.version,
    },
  };

  // Return appropriate status based on validation
  const status = validation.valid ? 200 : 503;
  
  return NextResponse.json(response, { 
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
