import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { getCurrentUser } from '@/lib/api-utils';
import bcrypt from 'bcrypt';

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { password } = await req.json();

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findByIdAndUpdate(
      user.userId,
      { password: hashedPassword, updated_at: new Date() }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update password error:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
