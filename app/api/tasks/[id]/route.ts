import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Task, Project, TeamMember, ActivityLog, Attachment } from '@/lib/models';
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

    return NextResponse.json(task);
  } catch (error) {
    console.error('Get task error:', error);
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

    const updatedTask = await Task.findByIdAndUpdate(
      params.id,
      updates,
      { new: true }
    );

    await ActivityLog.create({
      project_id: task.project_id,
      user_id: user.userId,
      action: 'updated a task',
      entity_type: 'task',
      entity_id: task._id,
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
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

    await ActivityLog.create({
      project_id: task.project_id,
      user_id: user.userId,
      action: 'deleted a task',
      entity_type: 'task',
    });

    await Task.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
