import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Task, Project, TeamMember, Profile } from '@/lib/models';
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

    const tasks = await Task.find({ project_id: params.id }).sort({ position: 1 });
    const assignedUserIds = tasks.map(t => t.assigned_to).filter(Boolean);
    const profiles = await Profile.find({ _id: { $in: assignedUserIds } });

    const tasksWithProfiles = tasks.map(task => ({
      ...task.toObject(),
      profiles: profiles.find(p => p._id.toString() === task.assigned_to)
    }));

    return NextResponse.json(tasksWithProfiles);
  } catch (error) {
    console.error('Get tasks error:', error);
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
    const taskData = await request.json();

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

    const maxPosition = await Task.findOne({ project_id: params.id }).sort({ position: -1 });
    const position = maxPosition ? maxPosition.position + 1 : 0;

    const task = await Task.create({
      ...taskData,
      project_id: params.id,
      created_by: user.userId,
      position,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
