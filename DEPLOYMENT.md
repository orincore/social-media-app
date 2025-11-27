# Deployment Guide

This guide covers deploying the Social Media App to **Vercel** and **AWS Amplify**.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Vercel Deployment](#vercel-deployment)
- [AWS Amplify Deployment](#aws-amplify-deployment)
- [Troubleshooting](#troubleshooting)
- [Debug Endpoint](#debug-endpoint)

---

## Prerequisites

Before deploying, ensure you have:

1. **Supabase Project** - [Create one here](https://supabase.com)
2. **Google OAuth Credentials** - [Set up here](https://console.cloud.google.com)
3. **GitHub Repository** - Push your code to GitHub

### Optional Services

- **Upstash Redis** - For caching (recommended for production)
- **Cloudflare R2** - For media storage
- **Google Gemini API** - For AI content moderation

---

## Environment Variables

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard > Settings > API |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google Cloud Console > Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console > Credentials |
| `NEXTAUTH_URL` | Your app's URL | Your deployment URL (e.g., `https://your-app.vercel.app`) |
| `NEXTAUTH_SECRET` | Random secret string | Generate with `openssl rand -base64 32` |

### Optional Variables

| Variable | Description | Required For |
|----------|-------------|--------------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | Caching |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | Caching |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 access key | Media uploads |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 secret key | Media uploads |
| `CLOUDFLARE_R2_BUCKET_NAME` | R2 bucket name | Media uploads |
| `CLOUDFLARE_R2_ENDPOINT` | R2 endpoint URL | Media uploads |
| `CLOUDFLARE_R2_PUBLIC_URL` | R2 public URL | Media uploads |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Media uploads |
| `GEMINI_API_KEY` | Google Gemini API key | AI moderation |

---

## Vercel Deployment

### Step 1: Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### Step 2: Configure Environment Variables

1. In the project settings, go to **"Environment Variables"**
2. Add all required variables from the table above
3. **Important**: Set `NEXTAUTH_URL` to your Vercel deployment URL

```
NEXTAUTH_URL=https://your-project.vercel.app
```

### Step 3: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   - `https://your-project.vercel.app/api/auth/callback/google`

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete
3. Visit your deployment URL

### Vercel Configuration

The `vercel.json` file is already configured with:
- Proper headers for security and CORS
- API function timeout (30 seconds)
- Static asset caching

---

## AWS Amplify Deployment

### Step 1: Create Amplify App

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Click **"Create new app"**
3. Choose **"Host web app"**
4. Select **"GitHub"** and authorize

### Step 2: Configure Build Settings

The `amplify.yml` file is already configured. Amplify will automatically detect it.

### Step 3: Configure Environment Variables

**⚠️ CRITICAL FOR AMPLIFY:**

1. Go to **App settings** → **Environment variables**
2. Add **ALL** required environment variables
3. Make sure to add them in the correct format:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
NEXTAUTH_URL=https://main.your-amplify-id.amplifyapp.com
NEXTAUTH_SECRET=your-secret-at-least-32-chars
```

### Step 4: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   - `https://main.your-amplify-id.amplifyapp.com/api/auth/callback/google`

### Step 5: Deploy

1. Push to your main branch
2. Amplify will automatically build and deploy
3. Check the build logs for any issues

### Amplify-Specific Notes

1. **Environment Variables**: Amplify requires you to manually add each variable in the console. Unlike Vercel, it doesn't auto-detect `.env` files.

2. **Build Verification**: The `amplify.yml` includes commands to verify environment variables are set during build.

3. **NEXTAUTH_URL**: Must match your Amplify app URL exactly, including the branch prefix (e.g., `https://main.d1234567890.amplifyapp.com`).

---

## Troubleshooting

### Debug Endpoint

Visit `/api/debug/env` on your deployed app to check environment configuration:

```
https://your-app.vercel.app/api/debug/env
```

This returns:
- Which environment variables are set (true/false)
- Platform detection (Vercel/Amplify)
- Service availability (Redis, R2, Gemini)
- Validation status

### Common Issues

#### 1. "Missing required environment variable"

**Cause**: Environment variable not set in deployment platform.

**Solution**:
- Vercel: Go to Project Settings → Environment Variables
- Amplify: Go to App Settings → Environment variables
- Add the missing variable and redeploy

#### 2. "OAuth callback error"

**Cause**: Google OAuth redirect URI mismatch.

**Solution**:
1. Check your `NEXTAUTH_URL` matches your deployment URL exactly
2. Add the callback URL to Google Cloud Console:
   - `https://your-app-url/api/auth/callback/google`

#### 3. "Supabase connection failed"

**Cause**: Incorrect Supabase credentials or URL.

**Solution**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
3. Check Supabase project is active

#### 4. "Build failed on Amplify"

**Cause**: Environment variables not available during build.

**Solution**:
1. Go to Amplify Console → App settings → Environment variables
2. Ensure all `NEXT_PUBLIC_*` variables are added
3. Trigger a new build

#### 5. "Media uploads not working"

**Cause**: R2 not configured or credentials incorrect.

**Solution**:
1. Check all `CLOUDFLARE_R2_*` variables are set
2. Verify R2 bucket exists and is accessible
3. Check CORS settings on R2 bucket

### Checking Logs

**Vercel**:
- Go to Project → Deployments → Select deployment → Functions tab

**Amplify**:
- Go to App → Build history → Select build → Build logs

---

## Debug Endpoint

The app includes a debug endpoint at `/api/debug/env` that helps diagnose deployment issues.

### Response Format

```json
{
  "variables": {
    "NEXT_PUBLIC_SUPABASE_URL": true,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": true,
    "SUPABASE_SERVICE_ROLE_KEY": true,
    "NEXTAUTH_URL": true,
    "NEXTAUTH_SECRET": true,
    "GOOGLE_CLIENT_ID": true,
    "GOOGLE_CLIENT_SECRET": true,
    "UPSTASH_REDIS_REST_URL": false,
    "UPSTASH_REDIS_REST_TOKEN": false
  },
  "validation": {
    "valid": true,
    "missingRequired": [],
    "optionalNotSet": 8
  },
  "platform": {
    "name": "Vercel",
    "isProduction": true,
    "nodeEnv": "production"
  },
  "services": {
    "supabase": true,
    "redis": false,
    "r2Storage": false,
    "geminiAI": false
  },
  "runtime": {
    "type": "node",
    "nodeVersion": "v20.x.x"
  }
}
```

### Interpreting Results

- **variables**: Shows which env vars are set (true) or missing (false)
- **validation.valid**: `true` if all required variables are set
- **validation.missingRequired**: List of missing required variables
- **platform.name**: Detected deployment platform
- **services**: Shows which optional services are available

---

## Security Notes

1. **Never commit `.env.local`** - It contains secrets
2. **Use different secrets per environment** - Don't reuse NEXTAUTH_SECRET
3. **Rotate secrets regularly** - Especially if compromised
4. **Review OAuth scopes** - Only request necessary permissions

---

## Support

If you encounter issues:

1. Check the debug endpoint first
2. Review deployment logs
3. Verify all environment variables
4. Check Google OAuth configuration
5. Ensure Supabase project is active

For more help, open an issue on the GitHub repository.
