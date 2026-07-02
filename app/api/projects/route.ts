import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Project, ProjectMember, TeamMember, Team, Task } from '@/lib/models';
import { requireAuth, requireTeamAdmin } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (user instanceof NextResponse) return user;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('team');
    const status = searchParams.get('status') || 'active';

    const projectMemberships = await ProjectMember.find({ user_id: user.userId });
    let projectIds = projectMemberships.map(pm => pm.project_id);

    const teamMembers = await TeamMember.find({ user_id: user.userId });
    const teamIds = teamMembers.map(tm => tm.team_id);

    if (teamIds.length > 0) {
      const legacyProjects = await Project.find({ team_id: { $in: teamIds } });
      for (const project of legacyProjects) {
        const pmCount = await ProjectMember.countDocuments({ project_id: project._id });
        if (pmCount === 0) {
          projectIds.push(project._id);
        }
      }
    }

    projectIds = Array.from(new Set(projectIds.map(id => id.toString())));

    if (projectIds.length === 0) {
      return NextResponse.json([]);
    }

    const query: Record<string, unknown> = {
      _id: { $in: projectIds },
      status,
    };

    if (teamId && teamId !== 'all') {
      query.team_id = teamId;
    }

    const projects = await Project.find(query).sort({ created_at: -1 });

    const filteredProjectIds = projects.map(p => p._id);
    const tasks = await Task.find({ project_id: { $in: filteredProjectIds } });

    const projectTeamIds = projects.map(p => p.team_id);
    const teams = await Team.find({ _id: { $in: projectTeamIds } });

    const projectsWithData = projects.map((project) => {
      const projectTasks = tasks.filter(t => t.project_id.toString() === project._id.toString());
      const completedCount = projectTasks.filter(t => t.status === 'completed').length;

      return {
        ...project.toObject(),
        team: teams.find(t => t._id.toString() === project.team_id.toString()),
        taskCount: projectTasks.length,
        completedCount,
      };
    });

    return NextResponse.json(projectsWithData);
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (user instanceof NextResponse) return user;

    await connectToDatabase();
    const { team_id, name, description, member_ids = [] } = await req.json();

    const isAdmin = await requireTeamAdmin(team_id, user.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can create projects' }, { status: 403 });
    }

    const project = await Project.create({
      team_id,
      name,
      description,
      created_by: user.userId,
    });

    const memberIdSet = new Set<string>([user.userId, ...member_ids]);

    const teamMembers = await TeamMember.find({ team_id });
    const validUserIds = new Set(teamMembers.map(m => m.user_id.toString()));

    const projectMemberIds = Array.from(memberIdSet).filter(id => validUserIds.has(id.toString()));

    await ProjectMember.insertMany(
      projectMemberIds.map(userId => ({
        project_id: project._id,
        user_id: userId,
      }))
    );

    return NextResponse.json(project);
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
