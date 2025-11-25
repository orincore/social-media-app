import { NextRequest, NextResponse } from 'next/server';
import { hybridModeration } from '@/lib/moderation/gemini';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const moderationResult = await hybridModeration(content);
    return NextResponse.json(moderationResult);

  } catch (error) {
    console.error('Error in content moderation:', error);
    
    // In case of API errors, allow the content but log the issue
    return NextResponse.json({
      isViolation: false,
      confidence: 0,
      reason: 'Moderation service unavailable'
    });
  }
}
