import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Task, ActivityLog } from '@/lib/models';
import { requireAuth } from '@/lib/api-utils';
import { requireProjectAccess, isProjectMemberUser } from '@/lib/project-access';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (user instanceof NextResponse) return user;

    await connectToDatabase();

    const task = await Task.findById(params.id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(req, task.project_id.toString());
    if ('error' in access && access.error) return access.error;

    return NextResponse.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (user instanceof NextResponse) return user;

    await connectToDatabase();
    const updates = await req.json();

    const task = await Task.findById(params.id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(req, task.project_id.toString());
    if ('error' in access && access.error) {
      // If not a project member, check if user is assigned to this task
      if (task.assigned_to && task.assigned_to.toString() === user.userId) {
        // Allow assigned member to update their own task
      } else {
        return access.error;
      }
    }

    if (updates.assigned_to) {
      const isMember = await isProjectMemberUser(
        task.project_id.toString(),
        updates.assigned_to
      );
      if (!isMember) {
        return NextResponse.json(
          { error: 'Assignee must be a project member' },
          { status: 400 }
        );
      }
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
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (user instanceof NextResponse) return user;

    await connectToDatabase();

    const task = await Task.findById(params.id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(req, task.project_id.toString());
    if ('error' in access && access.error) {
      // If not a project member, check if user is assigned to this task
      if (task.assigned_to && task.assigned_to.toString() === user.userId) {
        // Allow assigned member to delete their own task
      } else {
        return access.error;
      }
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
