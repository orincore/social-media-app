import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Get pending follow requests for current user (requests they received)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'received'; // 'received' or 'sent'

    let query = adminClient
      .from('follow_requests')
      .select(`
        id,
        requester_id,
        target_id,
        status,
        created_at,
        updated_at
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (type === 'received') {
      query = query.eq('target_id', session.user.id);
    } else {
      query = query.eq('requester_id', session.user.id);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching follow requests:', error);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    // Get user details for each request
    const userIds = type === 'received' 
      ? requests.map(r => r.requester_id)
      : requests.map(r => r.target_id);

    const { data: users } = await adminClient
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified')
      .in('id', userIds);

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);

    const enrichedRequests = requests.map(req => ({
      ...req,
      user: type === 'received' 
        ? usersMap.get(req.requester_id)
        : usersMap.get(req.target_id)
    }));

    return NextResponse.json({ 
      requests: enrichedRequests,
      count: enrichedRequests.length 
    });

  } catch (error) {
    console.error('Error in GET /api/follow-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a follow request to a private profile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { target_id } = body;

    if (!target_id) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    if (target_id === session.user.id) {
      return NextResponse.json({ error: 'Cannot send follow request to yourself' }, { status: 400 });
    }

    // Check if target user exists and is private
    const { data: targetUser, error: userError } = await adminClient
      .from('users')
      .select('id, username, is_private')
      .eq('id', target_id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!targetUser.is_private) {
      return NextResponse.json({ error: 'User profile is not private, follow directly' }, { status: 400 });
    }

    // Check if already following
    const { data: existingFollow } = await adminClient
      .from('follows')
      .select('id')
      .eq('follower_id', session.user.id)
      .eq('following_id', target_id)
      .single();

    if (existingFollow) {
      return NextResponse.json({ error: 'Already following this user' }, { status: 400 });
    }

    // Check if request already exists
    const { data: existingRequest } = await adminClient
      .from('follow_requests')
      .select('id, status')
      .eq('requester_id', session.user.id)
      .eq('target_id', target_id)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json({ error: 'Follow request already pending' }, { status: 400 });
      }
      if (existingRequest.status === 'declined') {
        // Update existing declined request to pending
        const { error: updateError } = await adminClient
          .from('follow_requests')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', existingRequest.id);

        if (updateError) {
          console.error('Error updating follow request:', updateError);
          return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Follow request sent' });
      }
    }

    // Create new follow request
    const { error: insertError } = await adminClient
      .from('follow_requests')
      .insert({
        requester_id: session.user.id,
        target_id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error creating follow request:', insertError);
      return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
    }

    // Create notification for target user
    const { data: requesterData } = await adminClient
      .from('users')
      .select('display_name, username')
      .eq('id', session.user.id)
      .single();

    if (requesterData) {
      await adminClient
        .from('notifications')
        .insert({
          user_id: target_id,
          actor_id: session.user.id,
          type: 'follow',
          content: `${requesterData.display_name} (@${requesterData.username}) requested to follow you`,
          is_read: false,
          created_at: new Date().toISOString()
        });
    }

    return NextResponse.json({ success: true, message: 'Follow request sent' });

  } catch (error) {
    console.error('Error in POST /api/follow-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Cancel a pending follow request
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('target_id');

    if (!targetId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    const { error } = await adminClient
      .from('follow_requests')
      .delete()
      .eq('requester_id', session.user.id)
      .eq('target_id', targetId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error canceling follow request:', error);
      return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Follow request canceled' });

  } catch (error) {
    console.error('Error in DELETE /api/follow-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
