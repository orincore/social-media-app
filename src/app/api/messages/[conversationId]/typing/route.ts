import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// In-memory store for typing indicators (in production, use Redis)
const typingIndicators = new Map<string, {
  userId: string;
  chatId: string;
  timestamp: number;
  username: string;
  displayName: string;
}>();

// Clean up old typing indicators (older than 5 seconds)
const cleanupTypingIndicators = () => {
  const now = Date.now();
  const fiveSecondsAgo = now - 5000;
  
  for (const [key, indicator] of typingIndicators.entries()) {
    if (indicator.timestamp < fiveSecondsAgo) {
      typingIndicators.delete(key);
    }
  }
};

// POST - Set typing indicator
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId: chatId } = await params;
    const body = await request.json();
    const { isTyping } = body;

    // Verify user is participant in this chat
    const { data: chat } = await adminClient
      .from('chats')
      .select('participants')
      .eq('id', chatId)
      .single();

    if (!chat || !chat.participants.includes(session.user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get user info
    const { data: user } = await adminClient
      .from('users')
      .select('username, display_name')
      .eq('id', session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const key = `${chatId}:${session.user.id}`;

    if (isTyping) {
      // Set typing indicator
      typingIndicators.set(key, {
        userId: session.user.id,
        chatId,
        timestamp: Date.now(),
        username: user.username,
        displayName: user.display_name
      });
    } else {
      // Remove typing indicator
      typingIndicators.delete(key);
    }

    // Clean up old indicators
    cleanupTypingIndicators();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in POST /api/messages/[conversationId]/typing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get typing indicators for a chat
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId: chatId } = await params;

    // Verify user is participant in this chat
    const { data: chat } = await adminClient
      .from('chats')
      .select('participants')
      .eq('id', chatId)
      .single();

    if (!chat || !chat.participants.includes(session.user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Clean up old indicators
    cleanupTypingIndicators();

    // Get typing indicators for this chat (excluding current user)
    const typingUsers = Array.from(typingIndicators.values())
      .filter(indicator => 
        indicator.chatId === chatId && 
        indicator.userId !== session.user!.id
      );

    return NextResponse.json({ typingUsers });

  } catch (error) {
    console.error('Error in GET /api/messages/[conversationId]/typing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
