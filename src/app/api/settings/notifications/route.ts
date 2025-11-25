import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await adminClient
      .from('user_settings')
      .select('notification_preferences')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching notification settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Default notification preferences if none exist
    const defaultPreferences = {
      mentions: true,
      community: true,
      product: false,
      login_alerts: true,
      email_notifications: true,
      push_notifications: true
    };

    const preferences = settings?.notification_preferences || defaultPreferences;

    return NextResponse.json({ preferences });

  } catch (error) {
    console.error('Error in GET /api/settings/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences data' }, { status: 400 });
    }

    // Validate preference keys
    const validKeys = ['mentions', 'community', 'product', 'login_alerts', 'email_notifications', 'push_notifications'];
    const invalidKeys = Object.keys(preferences).filter(key => !validKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      return NextResponse.json({ 
        error: `Invalid preference keys: ${invalidKeys.join(', ')}` 
      }, { status: 400 });
    }

    // First, get existing settings to merge with new ones
    const { data: existingSettings } = await adminClient
      .from('user_settings')
      .select('notification_preferences')
      .eq('user_id', session.user.id)
      .single();

    // Default preferences
    const defaultPreferences = {
      mentions: true,
      community: true,
      product: false,
      login_alerts: true,
      email_notifications: true,
      push_notifications: true
    };

    // Merge: defaults -> existing -> new (new values take priority)
    const existingPrefs = existingSettings?.notification_preferences as Record<string, boolean> | null;
    const mergedPreferences = {
      ...defaultPreferences,
      ...(existingPrefs || {}),
      ...preferences
    };

    // Upsert user settings with merged preferences
    const { data, error } = await adminClient
      .from('user_settings')
      .upsert({
        user_id: session.user.id,
        notification_preferences: mergedPreferences
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating notification settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      preferences: data.notification_preferences 
    });

  } catch (error) {
    console.error('Error in PUT /api/settings/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
