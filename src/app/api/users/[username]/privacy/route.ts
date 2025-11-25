import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Get user's privacy settings (public info only)
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
      .select('id, is_private, username, display_name')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user.id;

    // Get privacy settings from user_settings table
    const { data: settings } = await adminClient
      .from('user_settings')
      .select('privacy_settings')
      .eq('user_id', userId)
      .single();

    // Determine privacy: profile_visibility=true => public, false => private
    let isPrivate = !!user.is_private;
    if (settings?.privacy_settings) {
      const privacySettings = settings.privacy_settings as any;
      if (typeof privacySettings.profile_visibility === 'boolean') {
        isPrivate = !privacySettings.profile_visibility;
      }
    }

    // Check if the requesting user is following this user
    let isFollowing = false;
    if (session?.user?.id && session.user.id !== userId) {
      const { data: followData } = await adminClient
        .from('follows')
        .select('id')
        .eq('follower_id', session.user.id)
        .eq('following_id', userId)
        .single();
      
      isFollowing = !!followData;
    }

    return NextResponse.json({
      user_id: userId,
      username: user.username,
      display_name: user.display_name,
      is_private: isPrivate,
      is_following: isFollowing,
      is_own_profile: session?.user?.id === userId
    });

  } catch (error) {
    console.error('Error in GET /api/users/[username]/privacy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
