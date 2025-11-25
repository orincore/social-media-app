import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Fetch messages for a specific chat
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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Verify user is participant in this chat
    const { data: chat } = await adminClient
      .from('chats')
      .select('participants')
      .eq('id', chatId)
      .single();

    if (!chat || !chat.participants.includes(session.user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch messages
    const { data: messages, error } = await adminClient
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Mark messages as read (except own messages)
    if (messages && messages.length > 0) {
      const unreadMessageIds = messages
        .filter(msg => !msg.is_read && msg.sender_id !== session.user!.id)
        .map(msg => msg.id);

      if (unreadMessageIds.length > 0) {
        await adminClient
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessageIds);
      }
    }

    // Get chat details with participant info
    const { data: users } = await adminClient
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified')
      .in('id', chat.participants);

    const chatWithUsers = {
      id: chatId,
      participants: users || [],
      other_user: users?.find(u => u.id !== session.user!.id)
    };

    return NextResponse.json({
      messages: messages?.reverse() || [], // Reverse to show oldest first
      chat: chatWithUsers,
      pagination: {
        page,
        limit,
        hasMore: (messages?.length || 0) === limit
      }
    });

  } catch (error) {
    console.error('Error in GET /api/messages/[conversationId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a message to this chat
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
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Message too long (max 1000 characters)' }, { status: 400 });
    }

    // Verify user is participant in this chat
    const { data: chat } = await adminClient
      .from('chats')
      .select('participants')
      .eq('id', chatId)
      .single();

    if (!chat || !chat.participants.includes(session.user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Send the message
    const { data: message, error: messageError } = await adminClient
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: session.user.id,
        content: content.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        sender:sender_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .single();

    if (messageError) {
      console.error('Error sending message:', messageError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Update chat's last message info
    await adminClient
      .from('chats')
      .update({ 
        last_message_id: message.id,
        last_message_at: message.created_at,
        updated_at: new Date().toISOString() 
      })
      .eq('id', chatId);

    return NextResponse.json({
      success: true,
      message
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/messages/[conversationId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
