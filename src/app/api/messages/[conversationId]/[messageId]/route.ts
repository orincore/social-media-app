'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// DELETE - Delete/unsend a single message in a conversation
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId: chatId, messageId } = await params;
    if (!chatId || !messageId) {
      return NextResponse.json({ error: 'Chat ID and message ID are required' }, { status: 400 });
    }

    // Verify user is participant in this chat
    const { data: chat, error: chatError } = await adminClient
      .from('chats')
      .select('participants')
      .eq('id', chatId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (!chat.participants.includes(session.user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch message and ensure current user is the sender
    const { data: message, error: messageError } = await adminClient
      .from('messages')
      .select('id, chat_id, sender_id')
      .eq('id', messageId)
      .eq('chat_id', chatId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.sender_id !== session.user.id) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }

    const { error: deleteError } = await adminClient
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('chat_id', chatId);

    if (deleteError) {
      console.error('Error deleting message:', deleteError);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/messages/[conversationId]/[messageId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
