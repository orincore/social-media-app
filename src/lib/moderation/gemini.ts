import { GoogleGenAI } from '@google/genai';

interface ModerationResult {
  isViolation: boolean;
  violationType?: 'anti_national' | 'harassment' | 'sexual_harassment' | 'hate_speech' | 'violence' | 'spam' | 'other';
  confidence: number;
  reason?: string;
}

interface RateLimitState {
  requestCount: number;
  lastReset: number;
  isRateLimited: boolean;
}

// Rate limiting for free tier (250 requests per day for Gemini 2.5 Flash)
const DAILY_LIMIT = 250;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

let rateLimitState: RateLimitState = {
  requestCount: 0,
  lastReset: Date.now(),
  isRateLimited: false
};

let genAI: GoogleGenAI | null = null;

// Initialize Gemini AI client
function initializeGemini() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }
  return genAI;
}

export async function moderateContent(content: string): Promise<ModerationResult> {
  try {
    if (!content || typeof content !== 'string') {
      return {
        isViolation: false,
        confidence: 0,
        reason: 'No content provided'
      };
    }

    const ai = initializeGemini();
    
    if (!ai) {
      console.error('GEMINI_API_KEY is not configured');
      // In development, allow all content if API key is missing
      return {
        isViolation: false,
        confidence: 0,
        reason: 'Moderation service unavailable'
      };
    }

    const prompt = `You are a content moderation AI for a social media platform. Analyze the following content and determine if it violates our community guidelines.

Content to analyze: "${content}"

Check for the following violations:
1. Anti-national content (content against the nation, promoting terrorism, sedition)
2. Harassment or bullying (targeting individuals with harmful intent)
3. Sexual harassment (unwanted sexual advances, explicit sexual content)
4. Hate speech (content promoting hatred against groups based on race, religion, gender, etc.)
5. Violence (promoting or glorifying violence, threats)
6. Spam (repetitive, promotional, or irrelevant content)

Respond ONLY with a JSON object in this exact format:
{
  "isViolation": boolean,
  "violationType": "anti_national" | "harassment" | "sexual_harassment" | "hate_speech" | "violence" | "spam" | "other" | null,
  "confidence": number (0-100),
  "reason": "brief explanation if violation detected"
}

Be strict but fair. Consider context and intent. Err on the side of caution for serious violations like anti-national content, harassment, and hate speech.`;

    let response, text;
    try {
      // Check rate limits before making API call
      if (isRateLimited()) {
        console.warn('Gemini API rate limit exceeded, falling back to keyword filtering');
        return basicKeywordFilter(content);
      }

      response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // Using Flash model for better free tier limits (250 RPD)
        contents: prompt,
      });
      
      // Increment request count after successful call
      incrementRequestCount();
      text = response.text;
    } catch (apiError: unknown) {
      console.error('Gemini API Error:', apiError);
      
      // Return fallback result for API errors
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
      return {
        isViolation: false,
        confidence: 0,
        reason: `AI moderation unavailable: ${errorMessage}`
      };
    }

    // Check if text is undefined or null
    if (!text || typeof text !== 'string') {
      console.error('Gemini API returned empty or invalid response');
      return {
        isViolation: false,
        confidence: 0,
        reason: 'AI moderation returned empty response'
      };
    }

    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const moderationResult: ModerationResult = JSON.parse(jsonMatch[0]);

      // Validate the response structure
      if (typeof moderationResult.isViolation !== 'boolean' || 
          typeof moderationResult.confidence !== 'number') {
        throw new Error('Invalid response structure');
      }

      // Ensure confidence is between 0 and 100
      moderationResult.confidence = Math.max(0, Math.min(100, moderationResult.confidence));

      return moderationResult;

    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response:', text);
      
      // Fallback: if we can't parse the response, allow the content but log the issue
      return {
        isViolation: false,
        confidence: 0,
        reason: 'Moderation service error'
      };
    }

  } catch (error) {
    console.error('Error in content moderation:', error);
    
    // In case of API errors, allow the content but log the issue
    return {
      isViolation: false,
      confidence: 0,
      reason: 'Moderation service unavailable'
    };
  }
}

// Alternative function for batch moderation (future use)
export async function moderateContentBatch(contents: string[]): Promise<ModerationResult[]> {
  const results = await Promise.allSettled(
    contents.map(content => moderateContent(content))
  );

  return results.map(result => 
    result.status === 'fulfilled' 
      ? result.value 
      : {
          isViolation: false,
          confidence: 0,
          reason: 'Moderation failed'
        }
  );
}

// Function to check if content contains specific keywords (fallback moderation)
export function basicKeywordFilter(content: string): ModerationResult {
  const content_lower = content.toLowerCase();
  
  // Basic keyword lists (you can expand these)
  const antiNationalKeywords = ['terrorist', 'bomb', 'attack', 'destroy country'];
  const harassmentKeywords = ['kill yourself', 'die', 'hate you', 'stupid'];
  const sexualKeywords = ['explicit sexual terms']; // Add actual terms as needed
  const hateKeywords = ['racial slurs', 'religious hate']; // Add actual terms as needed
  const violenceKeywords = ['murder', 'kill', 'violence', 'hurt'];
  const spamKeywords = ['buy now', 'click here', 'free money', 'urgent'];

  // Check for violations
  if (antiNationalKeywords.some(keyword => content_lower.includes(keyword))) {
    return {
      isViolation: true,
      violationType: 'anti_national',
      confidence: 80,
      reason: 'Contains anti-national content'
    };
  }

  if (harassmentKeywords.some(keyword => content_lower.includes(keyword))) {
    return {
      isViolation: true,
      violationType: 'harassment',
      confidence: 75,
      reason: 'Contains harassment language'
    };
  }

  if (violenceKeywords.some(keyword => content_lower.includes(keyword))) {
    return {
      isViolation: true,
      violationType: 'violence',
      confidence: 70,
      reason: 'Contains violent content'
    };
  }

  if (sexualKeywords.some(keyword => content_lower.includes(keyword))) {
    return {
      isViolation: true,
      violationType: 'sexual_harassment',
      confidence: 75,
      reason: 'Contains sexual harassment content'
    };
  }

  if (hateKeywords.some(keyword => content_lower.includes(keyword))) {
    return {
      isViolation: true,
      violationType: 'hate_speech',
      confidence: 80,
      reason: 'Contains hate speech'
    };
  }

  if (spamKeywords.some(keyword => content_lower.includes(keyword))) {
    return {
      isViolation: true,
      violationType: 'spam',
      confidence: 60,
      reason: 'Appears to be spam'
    };
  }

  return {
    isViolation: false,
    confidence: 0,
    reason: 'Content appears safe'
  };
}

// Rate limiting functions
function isRateLimited(): boolean {
  const now = Date.now();
  
  // Reset counter if 24 hours have passed
  if (now - rateLimitState.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitState.requestCount = 0;
    rateLimitState.lastReset = now;
    rateLimitState.isRateLimited = false;
  }
  
  // Check if we've exceeded the daily limit
  if (rateLimitState.requestCount >= DAILY_LIMIT) {
    rateLimitState.isRateLimited = true;
    return true;
  }
  
  return false;
}

function incrementRequestCount(): void {
  rateLimitState.requestCount++;
}

// Get current rate limit status
export function getRateLimitStatus(): { remaining: number; resetTime: number; isLimited: boolean } {
  const now = Date.now();
  const resetTime = rateLimitState.lastReset + RATE_LIMIT_WINDOW;
  
  return {
    remaining: Math.max(0, DAILY_LIMIT - rateLimitState.requestCount),
    resetTime,
    isLimited: isRateLimited()
  };
}

// Smart moderation function that prioritizes keyword filtering
export async function smartModeration(content: string): Promise<ModerationResult> {
  try {
    // First, always try keyword filtering (free and instant)
    const keywordResult = basicKeywordFilter(content);
    
    // If keyword filter finds a clear violation, use that (saves API calls)
    if (keywordResult.isViolation && keywordResult.confidence >= 70) {
      return keywordResult;
    }
    
    // Only use AI for uncertain cases and if we have quota remaining
    if (!isRateLimited()) {
      const aiResult = await moderateContent(content);
      
      // If AI is confident about a violation or safety, use that
      if (aiResult.confidence > 60) {
        return aiResult;
      }
      
      // If AI is uncertain, prefer keyword result if it found something
      if (keywordResult.isViolation) {
        return keywordResult;
      }
      
      return aiResult;
    }
    
    // Rate limited - use keyword filtering only
    console.warn('Rate limited: Using keyword filtering only');
    return keywordResult;

  } catch (error) {
    console.error('Error in smart moderation:', error);
    
    // Final fallback to keyword filtering
    return basicKeywordFilter(content);
  }
}

// Hybrid moderation function that uses both AI and keyword filtering
export async function hybridModeration(content: string): Promise<ModerationResult> {
  // Use the new smart moderation approach
  return smartModeration(content);
}
