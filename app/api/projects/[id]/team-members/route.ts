import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ProjectMember, Profile, TeamMember } from '@/lib/models';
import { requireProjectAccess } from '@/lib/project-access';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await requireProjectAccess(req, params.id);
    if ('error' in access && access.error) return access.error;
    const { project } = access;

    await connectToDatabase();

    let members = await ProjectMember.find({ project_id: params.id });

    if (members.length === 0) {
      const teamMembers = await TeamMember.find({ team_id: project!.team_id });
      if (teamMembers.length > 0) {
        try {
          await ProjectMember.insertMany(
            teamMembers.map(tm => ({
              project_id: params.id,
              user_id: tm.user_id,
            }))
          );
        } catch {
          // ignore duplicate key errors during migration
        }
        members = await ProjectMember.find({ project_id: params.id });
      }
    }

    const memberUserIds = members.map(m => m.user_id);
    const profiles = await Profile.find({ user_id: { $in: memberUserIds } });

    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Get project members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
