import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Get user profile by username
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { username } = await params;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Get user by username
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if current user is following this user (if logged in)
    let isFollowing = false;
    let followRequestPending = false;
    
    if (session?.user?.id && session.user.id !== user.id) {
      // Check if following
      const { data: followRecord } = await adminClient
        .from('follows')
        .select('id')
        .eq('follower_id', session.user.id)
        .eq('following_id', user.id)
        .single();

      isFollowing = !!followRecord;

      // If not following and user is private, check for pending follow request
      if (!isFollowing && user.is_private) {
        const { data: requestRecord } = await adminClient
          .from('follow_requests')
          .select('id, status')
          .eq('requester_id', session.user.id)
          .eq('target_id', user.id)
          .eq('status', 'pending')
          .single();

        followRequestPending = !!requestRecord;
      }
    }

    return NextResponse.json({
      user,
      isFollowing,
      followRequestPending
    });

  } catch (error) {
    console.error('Error in GET /api/users/[username]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
