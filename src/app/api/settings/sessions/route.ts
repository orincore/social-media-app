import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Get user active sessions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clean expired sessions first
    await adminClient.rpc('clean_expired_sessions');

    const { data: sessions, error } = await adminClient
      .from('user_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('last_active', { ascending: false });

    if (error) {
      console.error('Error fetching user sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Format sessions for frontend
    const formattedSessions = sessions?.map((s: any) => ({
      id: s.id,
      deviceInfo: s.device_info,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      locationInfo: s.location_info,
      isCurrent: s.is_current,
      lastActive: s.last_active,
      createdAt: s.created_at
    })) || [];

    return NextResponse.json({ sessions: formattedSessions });

  } catch (error) {
    console.error('Error in GET /api/settings/sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a specific session (logout from device)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Delete the session
    const { error } = await adminClient
      .from('user_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', session.user.id); // Ensure user can only delete their own sessions

    if (error) {
      console.error('Error deleting session:', error);
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Session deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/settings/sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
