# Package Installation Required

To implement the content moderation system with Gemini AI, you need to install the following package:

## Install Google GenAI Package

```bash
npm install @google/genai
```

**Note**: This uses the newer `@google/genai` package instead of `@google/generative-ai` for better API compatibility.

## Environment Variables

Add the following to your `.env.local` file:

```env
# Gemini AI API Key for content moderation
GEMINI_API_KEY=your_gemini_api_key_here
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and add it to your `.env.local` file

**Important**: 
- Keep your API key secure and never commit it to version control
- The system uses the `gemini-3-pro-preview` model with the new API structure
- If API calls fail, the system falls back to keyword-based filtering
- Make sure to install the correct package: `@google/genai` (not `@google/generative-ai`)

## Alternative: OpenAI Integration

If you prefer to use OpenAI instead of Gemini, you can modify the `/src/app/api/moderate-content/route.ts` file to use OpenAI's moderation API:

```bash
npm install openai
```

And update the environment variable:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Database Updates

Run the SQL commands in `database-updates.sql` to update your database schema with the required tables and columns for the content moderation and strikes system.

## TypeScript Types

After running the database updates, you may need to regenerate your Supabase types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

This will update the TypeScript types to include the new tables and columns, which will resolve the lint errors in the strikes API.
