import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Label, Project, TeamMember } from '@/lib/models';
import { requireAuth } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    await connectToDatabase();

    const project = await Project.findById(params.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const teamMember = await TeamMember.findOne({
      team_id: project.team_id, user_id: user.userId
    });
    if (!teamMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const labels = await Label.find({ project_id: params.id });
    return NextResponse.json(labels);
  } catch (error) {
    console.error('Get labels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
