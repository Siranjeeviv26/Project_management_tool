import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Project, ActivityLog } from '@/lib/models';
import { requireProjectAccess } from '@/lib/project-access';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await requireProjectAccess(req, params.id);
    if ('error' in access && access.error) return access.error;

    await connectToDatabase();

    const project = await Project.findById(params.id);
    return NextResponse.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await requireProjectAccess(req, params.id);
    if ('error' in access && access.error) return access.error;
    const { user, project } = access;

    await connectToDatabase();
    const updates = await req.json();

    const updatedProject = await Project.findByIdAndUpdate(
      params.id,
      updates,
      { new: true }
    );

    if (updates.status) {
      await ActivityLog.create({
        project_id: project!._id,
        team_id: project!.team_id,
        user_id: user.userId,
        action: updates.status === 'archived' ? 'archived the project' : 'restored the project',
        entity_type: 'project',
        entity_id: project!._id,
      });
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await requireProjectAccess(req, params.id);
    if ('error' in access && access.error) return access.error;
    const { user, project } = access;

    await connectToDatabase();

    await ActivityLog.create({
      team_id: project!.team_id,
      user_id: user.userId,
      action: 'deleted a project',
      entity_type: 'project',
    });

    await Project.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
