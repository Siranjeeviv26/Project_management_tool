import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Project, ProjectMember, TeamMember } from '@/lib/models';
import { requireAuth } from '@/lib/api-utils';

export async function requireProjectAccess(req: NextRequest, projectId: string) {
  const user = requireAuth(req);
  if (user instanceof NextResponse) return { error: user };

  await connectToDatabase();

  const project = await Project.findById(projectId);
  if (!project) {
    return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) };
  }

  const projectMember = await ProjectMember.findOne({
    project_id: projectId,
    user_id: user.userId,
  });

  if (projectMember) {
    return { user, project };
  }

  const teamAdmin = await TeamMember.findOne({
    team_id: project.team_id,
    user_id: user.userId,
    role: 'admin',
  });
  if (teamAdmin) {
    return { user, project };
  }

  const projectMemberCount = await ProjectMember.countDocuments({ project_id: projectId });
  if (projectMemberCount === 0) {
    const teamMember = await TeamMember.findOne({
      team_id: project.team_id,
      user_id: user.userId,
    });
    if (teamMember) {
      return { user, project };
    }
  }

  return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) };
}

export async function isProjectMemberUser(projectId: string, userId: string) {
  const member = await ProjectMember.findOne({
    project_id: projectId,
    user_id: userId,
  });
  if (member) return true;

  const projectMemberCount = await ProjectMember.countDocuments({ project_id: projectId });
  if (projectMemberCount === 0) {
    const project = await Project.findById(projectId);
    if (!project) return false;
    const teamMember = await TeamMember.findOne({
      team_id: project.team_id,
      user_id: userId,
    });
    return !!teamMember;
  }

  return false;
}
