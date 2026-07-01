import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Project, TeamMember, ActivityLog } from '@/lib/models';
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

    return NextResponse.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    await connectToDatabase();
    const updates = await request.json();

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

    const updatedProject = await Project.findByIdAndUpdate(
      params.id,
      updates,
      { new: true }
    );

    if (updates.status) {
      await ActivityLog.create({
        project_id: project._id,
        team_id: project.team_id,
        user_id: user.userId,
        action: updates.status === 'archived' ? 'archived the project' : 'restored the project',
        entity_type: 'project',
        entity_id: project._id,
      });
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    await ActivityLog.create({
      team_id: project.team_id,
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
