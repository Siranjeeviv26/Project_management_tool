import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { TeamMember, Profile, User } from '@/lib/models';
import { requireAuth } from '@/lib/api-utils';
import bcrypt from 'bcrypt';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    await connectToDatabase();

    const teamMember = await TeamMember.findOne({
      team_id: params.id, user_id: user.userId
    });
    if (!teamMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const members = await TeamMember.find({ team_id: params.id });
    const memberUserIds = members.map(m => m.user_id);
    const profiles = await Profile.find({ user_id: { $in: memberUserIds } });

    const membersWithProfiles = members.map(member => ({
      ...member.toObject(),
      profiles: profiles.find(p => p.user_id.toString() === member.user_id.toString())
    }));

    return NextResponse.json(membersWithProfiles);
  } catch (error) {
    console.error('Get team members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    await connectToDatabase();

    // Check if current user is a member of this team
    const currentTeamMember = await TeamMember.findOne({
      team_id: params.id, user_id: user.userId
    });
    if (!currentTeamMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { email, role } = await request.json();

    // Try to find existing user by email
    let existingUser = await User.findOne({ email });
    let userId;

    if (existingUser) {
      userId = existingUser._id;
    } else {
      // If user doesn't exist, create a placeholder user
      // with a random password (they'll set their own later via reset password/signup)
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      existingUser = await User.create({
        email,
        password: hashedPassword,
      });

      // Also create a profile for this new user
      await Profile.create({
        user_id: existingUser._id,
        email,
        full_name: null,
        avatar_url: null,
      });

      userId = existingUser._id;
    }

    // Check if user is already a member of this team
    const existingMember = await TeamMember.findOne({
      team_id: params.id, user_id: userId
    });
    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 });
    }

    // Add user to team
    await TeamMember.create({
      team_id: params.id,
      user_id: userId,
      role: role || 'member',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add team member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
