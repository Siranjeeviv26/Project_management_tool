import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { TeamMember, Profile, User } from '@/lib/models';
import { requireAuth } from '@/lib/api-utils';
import bcrypt from 'bcrypt';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
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
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (user instanceof NextResponse) return user;

    await connectToDatabase();

    const currentTeamMember = await TeamMember.findOne({
      team_id: params.id, user_id: user.userId
    });
    if (!currentTeamMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { email, role, full_name } = await req.json();

    let existingUser = await User.findOne({ email });
    let userId;

    if (existingUser) {
      userId = existingUser._id;
      if (full_name) {
        await Profile.findOneAndUpdate(
          { user_id: existingUser._id },
          { full_name, updated_at: new Date() }
        );
      }
    } else {
      existingUser = await User.create({
        email,
        password: null,
      });

      await Profile.create({
        user_id: existingUser._id,
        email,
        full_name: full_name || null,
        avatar_url: null,
      });

      userId = existingUser._id;
    }

    const existingMember = await TeamMember.findOne({
      team_id: params.id, user_id: userId
    });
    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 });
    }

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
