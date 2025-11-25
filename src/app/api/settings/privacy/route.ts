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
    const defaultSettings = {
      safety_prompts: true,
      profile_visibility: false,
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

    // Upsert user settings
    const { data, error } = await adminClient
      .from('user_settings')
      .upsert({
        user_id: session.user.id,
        privacy_settings: settings
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating privacy settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
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
