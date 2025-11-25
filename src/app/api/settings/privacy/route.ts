import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Get user privacy settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await adminClient
      .from('user_settings')
      .select('privacy_settings')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching privacy settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Default privacy settings if none exist
    // profile_visibility: true means profile is public, false means private
    const defaultSettings = {
      safety_prompts: true,
      profile_visibility: true,
      discoverability: true,
      show_online_status: true
    };

    const privacySettings = settings?.privacy_settings || defaultSettings;

    return NextResponse.json({ settings: privacySettings });

  } catch (error) {
    console.error('Error in GET /api/settings/privacy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user privacy settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 });
    }

    // Validate setting keys
    const validKeys = ['safety_prompts', 'profile_visibility', 'discoverability', 'show_online_status'];
    const invalidKeys = Object.keys(settings).filter(key => !validKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      return NextResponse.json({ 
        error: `Invalid setting keys: ${invalidKeys.join(', ')}` 
      }, { status: 400 });
    }

    // First, get existing settings to merge with new ones
    const { data: existingSettings } = await adminClient
      .from('user_settings')
      .select('privacy_settings')
      .eq('user_id', session.user.id)
      .single();

    // Default privacy settings
    // profile_visibility: true means profile is public, false means private
    const defaultSettings = {
      safety_prompts: true,
      profile_visibility: true,
      discoverability: true,
      show_online_status: true
    };

    // Merge: defaults -> existing -> new (new values take priority)
    const existingPrivacy = existingSettings?.privacy_settings as Record<string, boolean> | null;
    const mergedSettings = {
      ...defaultSettings,
      ...(existingPrivacy || {}),
      ...settings
    };

    // Upsert user settings with merged settings
    const { data, error } = await adminClient
      .from('user_settings')
      .upsert({
        user_id: session.user.id,
        privacy_settings: mergedSettings
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating privacy settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    // Sync profile_visibility to users.is_private for easier queries
    // Convention: profile_visibility === true => public profile (is_private=false)
    //             profile_visibility === false => private profile (is_private=true)
    if (settings.profile_visibility !== undefined) {
      await adminClient
        .from('users')
        .update({ is_private: !settings.profile_visibility })
        .eq('id', session.user.id);
    }

    return NextResponse.json({ 
      success: true, 
      settings: data.privacy_settings 
    });

  } catch (error) {
    console.error('Error in PUT /api/settings/privacy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
