import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Project, TeamMember, Team, Task } from '@/lib/models';
import { requireAuth } from '@/lib/api-utils';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team');
    const status = searchParams.get('status') || 'active';

    const teamMembers = await TeamMember.find({ user_id: user.userId });
    let teamIds = teamMembers.map(tm => tm.team_id);

    if (teamId && teamId !== 'all') {
      teamIds = teamIds.filter(id => id.toString() === teamId);
    }

    if (teamIds.length === 0) {
      return NextResponse.json([]);
    }

    const projects = await Project.find({
      team_id: { $in: teamIds },
      status,
    }).sort({ created_at: -1 });
    
    const projectIds = projects.map(p => p._id);
    const tasks = await Task.find({ project_id: { $in: projectIds } });
    
    const projectTeamIds = projects.map(p => p.team_id);
    const teams = await Team.find({ _id: { $in: projectTeamIds } });

    const projectsWithData = await Promise.all(projects.map(async (project) => {
      const projectTasks = tasks.filter(t => t.project_id.toString() === project._id.toString());
      const completedCount = projectTasks.filter(t => t.status === 'completed').length;
      
      return {
        ...project.toObject(),
        team: teams.find(t => t._id.toString() === project.team_id.toString()),
        taskCount: projectTasks.length,
        completedCount,
      };
    }));

    return NextResponse.json(projectsWithData);
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    await connectToDatabase();
    const { team_id, name, description } = await request.json();

    const teamMember = await TeamMember.findOne({
      team_id, user_id: user.userId
    });
    if (!teamMember) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const project = await Project.create({
      team_id,
      name,
      description,
      created_by: user.userId,
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
