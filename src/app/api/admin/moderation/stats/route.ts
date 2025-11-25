import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Basic auth check - in production, you'd want proper admin role checking
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Import the rate limit functions
    const { getRateLimitStatus } = await import('@/lib/moderation/gemini');
    
    const rateLimitStatus = getRateLimitStatus();
    
    const stats = {
      rateLimitStatus,
      dailyLimit: 250, // Gemini 2.5 Flash limit
      modelUsed: 'gemini-2.5-flash'
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
