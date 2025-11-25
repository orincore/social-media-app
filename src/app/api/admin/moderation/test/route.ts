import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Basic auth check - in production, you'd want proper admin role checking
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Import the smart moderation function
    const { smartModeration, getRateLimitStatus } = await import('@/lib/moderation/gemini');
    
    const rateLimitBefore = getRateLimitStatus();
    const moderationResult = await smartModeration(content);
    const rateLimitAfter = getRateLimitStatus();
    
    const testResult = {
      content,
      moderationResult,
      rateLimitBefore,
      rateLimitAfter,
      quotaUsed: rateLimitBefore.remaining - rateLimitAfter.remaining,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(testResult);
  } catch (error) {
    console.error('Error testing moderation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
