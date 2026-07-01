import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Team, TeamMember, Profile } from '@/lib/models';
import { getCurrentUser, requireAuth } from '@/lib/api-utils';

export async function GET() {
  try {
    console.log('[Teams API] Checking auth...');
    const user = await requireAuth();
    if (user instanceof NextResponse) {
      console.log('[Teams API] Auth failed');
      return user;
    }

    console.log('[Teams API] Connecting to database...');
    await connectToDatabase();

    console.log('[Teams API] Fetching team members...');
    const teamMembers = await TeamMember.find({ user_id: user.userId });
    const teamIds = teamMembers.map(tm => tm.team_id);
    console.log('[Teams API] Found team IDs:', teamIds);

    console.log('[Teams API] Fetching teams...');
    const teams = await Team.find({ _id: { $in: teamIds } });
    console.log('[Teams API] Found teams:', teams);

    // For each team, get member count and current user's role
    const teamsWithData = await Promise.all(teams.map(async (team) => {
      const members = await TeamMember.find({ team_id: team._id });
      const currentMember = members.find(m => m.user_id.toString() === user.userId);
      
      return {
        ...team.toObject(),
        memberCount: members.length,
        userRole: currentMember?.role || 'member',
      };
    }));

    console.log('[Teams API] Returning data:', teamsWithData);
    return NextResponse.json(teamsWithData);
  } catch (error) {
    console.error('[Teams API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    await connectToDatabase();
    const { name, description } = await request.json();

    const team = await Team.create({
      name,
      description,
      created_by: user.userId,
    });

    await TeamMember.create({
      team_id: team._id,
      user_id: user.userId,
      role: 'member',
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
