import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Profile, User } from '@/lib/models';
import { getCurrentUser } from '@/lib/api-utils';

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { full_name, avatar_url } = await req.json();

    const updatedProfile = await Profile.findOneAndUpdate(
      { user_id: user.userId },
      { full_name, avatar_url, updated_at: new Date() },
      { new: true }
    );

    if (!updatedProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
