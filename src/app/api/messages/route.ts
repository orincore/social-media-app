import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Fetch chats for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get chats where user is in participants array
    const { data: chats, error } = await adminClient
      .from('chats')
      .select('*')
      .contains('participants', [session.user.id])
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching chats:', error);
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
    }

    // Get user details for all participants
    const allParticipantIds = new Set<string>();
    chats?.forEach(chat => {
      chat.participants.forEach((id: string) => allParticipantIds.add(id));
    });

    // Include status field to show suspended/deleted accounts in chat
    const { data: users } = await adminClient
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified, status')
      .in('id', Array.from(allParticipantIds)) as { data: Array<{ id: string; username: string; display_name: string; avatar_url: string | null; is_verified: boolean; status?: string }> | null };

    const userMap = (users || []).reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, any>);

    // Get unread message counts for each chat
    const chatIds = chats?.map(c => c.id) || [];
    const { data: unreadCounts } = await adminClient
      .from('messages')
      .select('chat_id')
      .in('chat_id', chatIds)
      .eq('is_read', false)
      .neq('sender_id', session.user.id);

    // Group unread counts by chat
    const unreadByChat = (unreadCounts || []).reduce((acc, msg) => {
      acc[msg.chat_id] = (acc[msg.chat_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Format chats for frontend
    const formattedChats = chats?.map(chat => {
      const otherParticipants = chat.participants.filter((id: string) => id !== session.user!.id);
      const otherUser = userMap[otherParticipants[0]];
      
      return {
        id: chat.id,
        type: 'direct',
        other_user: otherUser,
        unread_count: unreadByChat[chat.id] || 0,
        updated_at: chat.updated_at
      };
    });

    return NextResponse.json({
      chats: formattedChats || [],
      pagination: {
        page,
        limit,
        hasMore: (chats?.length || 0) === limit
      }
    });

  } catch (error) {
    console.error('Error in GET /api/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new chat or send message to existing one
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipient_id, content, chat_id, mediaUrls } = body as { recipient_id?: string; content?: string; chat_id?: string; mediaUrls?: string[] };

    const trimmedContent = content?.trim() || '';
    const hasMedia = Array.isArray(mediaUrls) && mediaUrls.length > 0;

    if (!trimmedContent && !hasMedia) {
      return NextResponse.json({ error: 'Message content or media is required' }, { status: 400 });
    }

    if (trimmedContent.length > 1000) {
      return NextResponse.json({ error: 'Message too long (max 1000 characters)' }, { status: 400 });
    }

    let chatId = chat_id;

    // If no chat_id provided, find or create chat
    if (!chatId) {
      if (!recipient_id) {
        return NextResponse.json({ error: 'Recipient ID is required for new chats' }, { status: 400 });
      }

      // Check if chat already exists between these users
      const participants = [session.user.id, recipient_id].sort();
      const { data: existingChat } = await adminClient
        .from('chats')
        .select('id')
        .contains('participants', participants)
        .eq('participants', participants)
        .single();

      if (existingChat) {
        chatId = existingChat.id;
      } else {
        // Create new chat
        const { data: newChat, error: chatError } = await adminClient
          .from('chats')
          .insert({
            participants: participants,
            last_message_id: null,
            last_message_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (chatError) {
          console.error('Error creating chat:', chatError);
          return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
        }

        chatId = newChat.id;
      }
    }

    // Send the message
    const { data: message, error: messageError } = await adminClient
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: session.user.id,
        content: trimmedContent || (hasMedia ? ' ' : ''),
        media_urls: hasMedia ? mediaUrls : null,
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
      message,
      chat_id: chatId
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
