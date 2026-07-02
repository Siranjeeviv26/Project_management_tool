import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Task, Profile, Project, TeamMember } from '@/lib/models';
import { requireProjectAccess, isProjectMemberUser } from '@/lib/project-access';
import { requireAuth, requireTeamAdmin } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await requireProjectAccess(req, params.id);
    if ('error' in access && access.error) return access.error;

    await connectToDatabase();

    const tasks = await Task.find({ project_id: params.id }).sort({ position: 1 });
    const assignedUserIds = tasks.map(t => t.assigned_to).filter(Boolean);
    const profiles = await Profile.find({ user_id: { $in: assignedUserIds } });

    const tasksWithProfiles = tasks.map(task => ({
      ...task.toObject(),
      profiles: profiles.find(p => p.user_id.toString() === task.assigned_to?.toString())
    }));

    return NextResponse.json(tasksWithProfiles);
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await requireProjectAccess(req, params.id);
    if ('error' in access && access.error) return access.error;
    const { user } = access;

    await connectToDatabase();
    const taskData = await req.json();

    // Check if user is admin of the team
    const project = await Project.findById(params.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isAdmin = await requireTeamAdmin(project.team_id.toString(), user.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can create tasks' }, { status: 403 });
    }

    if (taskData.assigned_to) {
      const isMember = await isProjectMemberUser(params.id, taskData.assigned_to);
      if (!isMember) {
        return NextResponse.json(
          { error: 'Assignee must be a project member' },
          { status: 400 }
        );
      }
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
