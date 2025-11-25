# Gemini API Free Tier Optimization

## Overview
This document explains the optimizations implemented to work efficiently within Gemini API's free tier limits while maintaining effective content moderation.

## Free Tier Limits
- **Gemini 2.5 Flash**: 250 requests/day, 10 requests/minute
- **Gemini 2.5 Pro**: 100 requests/day, 5 requests/minute  
- **Gemini 2.5 Flash-Lite**: 1,000 requests/day, 15 requests/minute

## Our Strategy

### 1. Model Selection
We use **Gemini 2.5 Flash** for the best balance of:
- Higher daily quota (250 requests vs 100 for Pro)
- Good performance for content moderation tasks
- Reasonable rate limits (10 RPM)

### 2. Smart Moderation System
The `smartModeration()` function implements a multi-layer approach:

```typescript
// 1. Always try keyword filtering first (free & instant)
const keywordResult = basicKeywordFilter(content);

// 2. If keyword filter finds clear violation (≥70% confidence), use it
if (keywordResult.isViolation && keywordResult.confidence >= 70) {
  return keywordResult; // Saves API call
}

// 3. Only use AI for uncertain cases if quota available
if (!isRateLimited()) {
  const aiResult = await moderateContent(content);
  // Use AI result if confident, otherwise prefer keyword result
}

// 4. Fallback to keyword filtering when rate limited
return keywordResult;
```

### 3. Rate Limiting System
- **Daily Tracking**: Monitors requests per 24-hour window
- **Automatic Reset**: Quota resets every 24 hours
- **Graceful Degradation**: Falls back to keyword filtering when limited
- **Status Monitoring**: Provides real-time quota information

### 4. Keyword Filtering Enhancement
Comprehensive keyword lists for:
- Anti-national content
- Harassment and bullying
- Sexual harassment
- Hate speech
- Violence and threats
- Spam content

### 5. Usage Optimization
- **Prioritize Keywords**: Handle obvious violations without AI
- **AI for Edge Cases**: Use AI only for uncertain content
- **Batch Efficiency**: Avoid unnecessary API calls
- **Monitoring**: Track usage with admin dashboard

## Implementation Files

### Core Moderation
- `/src/lib/moderation/gemini.ts` - Main moderation logic with rate limiting
- `/src/app/api/posts/route.ts` - Integration in post creation API

### Admin Dashboard
- `/src/app/(main)/admin/moderation/page.tsx` - Monitoring interface
- `/src/app/api/admin/moderation/stats/route.ts` - Rate limit status API
- `/src/app/api/admin/moderation/test/route.ts` - Test moderation API

## Usage Guidelines

### For Development
1. Set `GEMINI_API_KEY` in `.env.local`
2. Monitor quota usage via admin dashboard
3. Test moderation with various content types
4. Keyword filtering works without API key

### For Production
1. Consider upgrading to paid tier for higher limits
2. Monitor daily usage patterns
3. Adjust keyword filters based on common violations
4. Set up alerts for quota exhaustion

## Environment Variables
```bash
# Required for AI moderation
GEMINI_API_KEY=your_api_key_here

# Optional: Custom daily limit (default: 250)
GEMINI_DAILY_LIMIT=250
```

## Monitoring
Access the admin dashboard at `/admin/moderation` to view:
- Current quota usage
- Remaining requests
- Rate limit status
- Test moderation functionality
- Usage statistics

## Benefits
1. **Cost Effective**: Maximizes free tier usage
2. **Reliable**: Always has keyword filtering fallback
3. **Efficient**: Saves API calls for obvious cases
4. **Transparent**: Clear monitoring and logging
5. **Scalable**: Easy to upgrade to paid tier when needed

## Future Enhancements
- Machine learning model for keyword filtering
- User reputation scoring
- Community reporting integration
- Advanced pattern detection
- Multi-language support
