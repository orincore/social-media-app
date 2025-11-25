import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// POST - Accept or decline a follow request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { request_id, action } = body; // action: 'accept' or 'decline'

    if (!request_id || !action) {
      return NextResponse.json({ error: 'Request ID and action are required' }, { status: 400 });
    }

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use "accept" or "decline"' }, { status: 400 });
    }

    // Get the follow request
    const { data: followRequest, error: fetchError } = await adminClient
      .from('follow_requests')
      .select('*')
      .eq('id', request_id)
      .eq('target_id', session.user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !followRequest) {
      return NextResponse.json({ error: 'Follow request not found or already processed' }, { status: 404 });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    // Update the request status
    const { error: updateError } = await adminClient
      .from('follow_requests')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', request_id);

    if (updateError) {
      console.error('Error updating follow request:', updateError);
      return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }

    // If accepted, create the follow relationship
    if (action === 'accept') {
      // Create follow relationship
      const { error: followError } = await adminClient
        .from('follows')
        .insert({
          follower_id: followRequest.requester_id,
          following_id: session.user.id,
          created_at: new Date().toISOString()
        });

      if (followError) {
        console.error('Error creating follow relationship:', followError);
        // Revert the request status
        await adminClient
          .from('follow_requests')
          .update({ status: 'pending' })
          .eq('id', request_id);
        return NextResponse.json({ error: 'Failed to create follow relationship' }, { status: 500 });
      }

      // Update follower counts
      // Increment followers_count for current user (target)
      const { data: targetData } = await adminClient
        .from('users')
        .select('followers_count')
        .eq('id', session.user.id)
        .single();

      if (targetData) {
        await adminClient
          .from('users')
          .update({ followers_count: (targetData.followers_count || 0) + 1 })
          .eq('id', session.user.id);
      }

      // Increment following_count for requester
      const { data: requesterData } = await adminClient
        .from('users')
        .select('following_count, display_name, username')
        .eq('id', followRequest.requester_id)
        .single();

      if (requesterData) {
        await adminClient
          .from('users')
          .update({ following_count: (requesterData.following_count || 0) + 1 })
          .eq('id', followRequest.requester_id);
      }

      // Notify the requester that their request was accepted
      const { data: currentUserData } = await adminClient
        .from('users')
        .select('display_name, username')
        .eq('id', session.user.id)
        .single();

      if (currentUserData) {
        await adminClient
          .from('notifications')
          .insert({
            user_id: followRequest.requester_id,
            actor_id: session.user.id,
            type: 'follow',
            content: `${currentUserData.display_name} (@${currentUserData.username}) accepted your follow request`,
            is_read: false,
            created_at: new Date().toISOString()
          });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: action === 'accept' ? 'Follow request accepted' : 'Follow request declined'
    });

  } catch (error) {
    console.error('Error in POST /api/follow-requests/respond:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
