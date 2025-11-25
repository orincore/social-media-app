import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      display_name,
      username,
      bio,
      location,
      website,
      avatar_url,
      banner_url
    } = body;

    // Validate required fields
    if (!display_name?.trim()) {
      return NextResponse.json(
        { error: 'Display name is required', field: 'display_name', message: 'Display name is required' },
        { status: 400 }
      );
    }

    if (!username?.trim()) {
      return NextResponse.json(
        { error: 'Username is required', field: 'username', message: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Invalid username format', field: 'username', message: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Check if username is already taken (by another user)
    if (username !== (session as any)?.user?.username) {
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', session.user.id)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username already taken', field: 'username', message: 'This username is already taken' },
          { status: 400 }
        );
      }
    }

    // Validate field lengths
    if (display_name.length > 50) {
      return NextResponse.json(
        { error: 'Display name too long', field: 'display_name', message: 'Display name must be less than 50 characters' },
        { status: 400 }
      );
    }

    if (username.length > 15) {
      return NextResponse.json(
        { error: 'Username too long', field: 'username', message: 'Username must be less than 15 characters' },
        { status: 400 }
      );
    }

    if (bio && bio.length > 160) {
      return NextResponse.json(
        { error: 'Bio too long', field: 'bio', message: 'Bio must be less than 160 characters' },
        { status: 400 }
      );
    }

    if (location && location.length > 30) {
      return NextResponse.json(
        { error: 'Location too long', field: 'location', message: 'Location must be less than 30 characters' },
        { status: 400 }
      );
    }

    // Validate website URL if provided
    if (website) {
      try {
        new URL(website);
      } catch {
        return NextResponse.json(
          { error: 'Invalid website URL', field: 'website', message: 'Please enter a valid website URL' },
          { status: 400 }
        );
      }
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update({
        display_name: display_name.trim(),
        username: username.trim().toLowerCase(),
        bio: bio?.trim() || null,
        location: location?.trim() || null,
        website: website || null,
        avatar_url: avatar_url || null,
        banner_url: banner_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      
      // Handle specific database errors
      if (updateError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Username already taken', field: 'username', message: 'This username is already taken' },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error in PUT /api/profile/update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
