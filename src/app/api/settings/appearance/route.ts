import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Get user appearance settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await adminClient
      .from('user_settings' as any)
      .select('appearance_settings')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching appearance settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Default appearance settings if none exist
    const defaultSettings = {
      theme: 'dark',
      font_size: 'medium',
      density: 'comfortable'
    };

    const appearanceSettings = settings?.appearance_settings || defaultSettings;

    return NextResponse.json({ settings: appearanceSettings });

  } catch (error) {
    console.error('Error in GET /api/settings/appearance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user appearance settings
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

    // Validate setting keys and values
    const validKeys = ['theme', 'font_size', 'density'];
    const validThemes = ['light', 'dark', 'system'];
    const validFontSizes = ['small', 'medium', 'large'];
    const validDensities = ['compact', 'comfortable', 'spacious'];

    const invalidKeys = Object.keys(settings).filter(key => !validKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      return NextResponse.json({ 
        error: `Invalid setting keys: ${invalidKeys.join(', ')}` 
      }, { status: 400 });
    }

    // Validate values
    if (settings.theme && !validThemes.includes(settings.theme)) {
      return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 });
    }
    if (settings.font_size && !validFontSizes.includes(settings.font_size)) {
      return NextResponse.json({ error: 'Invalid font size value' }, { status: 400 });
    }
    if (settings.density && !validDensities.includes(settings.density)) {
      return NextResponse.json({ error: 'Invalid density value' }, { status: 400 });
    }

    // Upsert user settings
    const { data, error } = await adminClient
      .from('user_settings' as any)
      .upsert({
        user_id: session.user.id,
        appearance_settings: settings
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating appearance settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      settings: data.appearance_settings 
    });

  } catch (error) {
    console.error('Error in PUT /api/settings/appearance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
