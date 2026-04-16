import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// POST - Find existing chat between two users or create a new empty one
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipient_id } = body as { recipient_id?: string };

    if (!recipient_id) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
    }

    if (recipient_id === session.user.id) {
      return NextResponse.json({ error: 'Cannot create a chat with yourself' }, { status: 400 });
    }

    const participants = [session.user.id, recipient_id].sort();

    // Find an existing chat between these exact two participants
    const { data: fullChats } = await adminClient
      .from('chats')
      .select('id, participants')
      .contains('participants', participants);

    const exactMatch = (fullChats || []).find((c: { id: string; participants: string[] }) => {
      const sorted = [...c.participants].sort();
      return (
        sorted.length === participants.length &&
        sorted.every((p, i) => p === participants[i])
      );
    });

    if (exactMatch) {
      return NextResponse.json({ chat_id: exactMatch.id, created: false });
    }

    // Create new empty chat
    const { data: newChat, error: chatError } = await adminClient
      .from('chats')
      .insert({
        participants,
        last_message_id: null,
        last_message_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (chatError || !newChat) {
      console.error('Error creating chat:', chatError);
      return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
    }

    return NextResponse.json({ chat_id: newChat.id, created: true }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/messages/find-or-create:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
