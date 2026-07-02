import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { User, Profile } from '@/lib/models';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { email, password, fullName } = await request.json();

    let user;
    let profile;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // If user already exists (likely invited), update their password and profile
      const hashedPassword = await bcryptjs.hash(password, 12);
      await User.findByIdAndUpdate(existingUser._id, { password: hashedPassword });
      
      // Also update profile if needed
      profile = await Profile.findOne({ user_id: existingUser._id });
      if (profile && fullName) {
        await Profile.findByIdAndUpdate(profile._id, { full_name: fullName });
      }
      
      user = existingUser;
    } else {
      // Create new user and profile
      const hashedPassword = await bcryptjs.hash(password, 12);
      user = await User.create({
        email,
        password: hashedPassword,
      });

      profile = await Profile.create({
        user_id: user._id,
        email,
        full_name: fullName || null,
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
