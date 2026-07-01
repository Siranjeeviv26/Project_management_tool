import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Task, Project, TeamMember, ActivityLog, Profile } from '@/lib/models';
import { requireAuth } from '@/lib/api-utils';

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    await connectToDatabase();

    const teamMembers = await TeamMember.find({ user_id: user.userId });
    const teamIds = teamMembers.map(tm => tm.team_id);

    if (teamIds.length === 0) {
      return NextResponse.json({
        stats: { totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0, projectsCount: 0 },
        recentTasks: [],
        upcomingDeadlines: [],
        recentActivity: []
      });
    }

    const projects = await Project.find({ team_id: { $in: teamIds } });
    const projectIds = projects.map(p => p._id);

    if (projectIds.length === 0) {
      return NextResponse.json({
        stats: { totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0, projectsCount: 0 },
        recentTasks: [],
        upcomingDeadlines: [],
        recentActivity: []
      });
    }

    const allTasks = await Task.find({ project_id: { $in: projectIds } });
    const now = new Date();

    const stats = {
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      pendingTasks: allTasks.filter(t => t.status !== 'completed').length,
      overdueTasks: allTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'completed').length,
      projectsCount: projects.length,
    };

    const assignedTasks = await Task.find({
      assigned_to: user.userId,
      status: { $ne: 'completed' }
    }).sort({ updated_at: -1 }).limit(5);


    const projectMap = new Map();
    projects.forEach(p => projectMap.set(p._id.toString(), p));
    const recentTasksWithProjects = assignedTasks.map(task => {
      const taskObj = task.toObject();
      return {
        ...taskObj,
        projects: projectMap.get(task.project_id.toString())
      };
    });

    const upcomingDeadlines = await Task.find({
      project_id: { $in: projectIds },
      due_date: { $gte: now },
      status: { $ne: 'completed' }
    }).sort({ due_date: 1 }).limit(5);

    const upcomingDeadlinesWithProjects = upcomingDeadlines.map(task => {
      const taskObj = task.toObject();
      return {
        ...taskObj,
        projects: projectMap.get(task.project_id.toString())
      };
    });

    const recentActivity = await ActivityLog.find({
      team_id: { $in: teamIds }
    }).sort({ created_at: -1 }).limit(10);

    const activityUserIds = recentActivity.map(a => a.user_id);
    const profiles = await Profile.find({ _id: { $in: activityUserIds } });

    const profileMap = new Map();
    profiles.forEach(p => profileMap.set(p._id.toString(), p));
    const recentActivityWithProfiles = recentActivity.map(activity => {
      const activityObj = activity.toObject();
      return {
        ...activityObj,
        profiles: profileMap.get(activity.user_id.toString())
      };
    });

    return NextResponse.json({
      stats,
      recentTasks: recentTasksWithProjects,
      upcomingDeadlines: upcomingDeadlinesWithProjects,
      recentActivity: recentActivityWithProfiles
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
