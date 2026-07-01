import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Attachment, Task, Project, TeamMember } from '@/lib/models';
import { requireAuth } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    await connectToDatabase();

    const task = await Task.findById(params.id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const project = await Project.findById(task.project_id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const teamMember = await TeamMember.findOne({
      team_id: project.team_id, user_id: user.userId
    });
    if (!teamMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const attachments = await Attachment.find({ task_id: params.id }).sort({ created_at: -1 });
    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Get attachments error:', error);
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
    const attachmentData = await request.json();

    const task = await Task.findById(params.id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const project = await Project.findById(task.project_id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const teamMember = await TeamMember.findOne({
      team_id: project.team_id, user_id: user.userId
    });
    if (!teamMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const attachment = await Attachment.create({
      ...attachmentData,
      task_id: params.id,
      uploaded_by: user.userId,
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.error('Create attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
