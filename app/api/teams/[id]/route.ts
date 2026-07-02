import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Team, TeamMember } from '@/lib/models';
import { requireAuth } from '@/lib/api-utils';

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
      team_id: params.id, user_id: user.userId });
    if (!teamMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const team = await Team.findById(params.id);
    return NextResponse.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (user instanceof NextResponse) return user;

    await connectToDatabase();

    const teamMember = await TeamMember.findOne({
      team_id: params.id, user_id: user.userId, role: 'member'
    });
    if (!teamMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await Team.findByIdAndDelete(params.id);
    await TeamMember.deleteMany({ team_id: params.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
