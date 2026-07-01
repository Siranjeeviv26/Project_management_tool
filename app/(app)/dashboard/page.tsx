"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import {
  Loader2 as SpinnerIcon,
  CheckCircle2 as CheckCircle2Icon,
  Clock as ClockIcon,
  AlertCircle as AlertCircleIcon,
  TrendingUp as TrendingUpIcon,
  Calendar as CalendarIcon,
  ArrowRight as ArrowRightIcon,
  Sparkles as SparklesIcon,
  ListTodo as ListTodoIcon,
} from 'lucide-react';
import Link from 'next/link';

interface Profile {
  _id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Task {
  _id: string;
  id?: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: Date | string | null;
  created_by: string;
  assigned_to: string | null;
  position: number;
  created_at: Date | string;
  updated_at: Date | string;
  profiles?: Profile;
  projects?: { name: string };
}

interface Project {
  _id: string;
  team_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ActivityLog {
  _id: string;
  id?: string;
  project_id: string | null;
  team_id: string | null;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: Date | string;
  profiles?: Profile;
}

const statusColors: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    projectsCount: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadDashboardData();
      }
    }
  }, [user, authLoading, router]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentTasks(data.recentTasks);
        setUpcomingDeadlines(data.upcomingDeadlines);
        setRecentActivity(data.recentActivity);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const completionPercentage = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <SpinnerIcon className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Welcome back! Here&apos;s what&apos;s happening with your projects.
          </p>
        </div>
        <Link href="/projects">
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/25">
            <SparklesIcon className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Tasks</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.totalTasks}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <ListTodoIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.completedTasks}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <CheckCircle2Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.pendingTasks}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Overdue</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.overdueTasks}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg">
                <AlertCircleIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="w-5 h-5 text-blue-600" />
              Overall Progress
            </CardTitle>
            <CardDescription>Task completion rate across all projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-slate-200 dark:text-slate-700"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={352}
                    strokeDashoffset={352 - (352 * completionPercentage) / 100}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">{completionPercentage}%</span>
                </div>
              </div>
            </div>
            <div className="text-center text-sm text-slate-600 dark:text-slate-400">
              {stats.completedTasks} of {stats.totalTasks} tasks completed
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>Tasks due soon</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No upcoming deadlines
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((task) => {
                  const dueDate = task.due_date ? new Date(task.due_date) : null;
                  const isUrgent = dueDate && (isToday(dueDate) || isTomorrow(dueDate));
                  return (
                    <Link
                      key={task._id}
                      href={`/projects/${task.project_id}/tasks/${task._id}`}
                      className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <p className="text-sm text-slate-500 truncate">
                          {task.projects?.name || 'Unknown project'}
                        </p>
                      </div>
                      <Badge className={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                      {dueDate && (
                        <Badge variant={isUrgent ? 'destructive' : 'secondary'}>
                          {isToday(dueDate) ? 'Today' : isTomorrow(dueDate) ? 'Tomorrow' : format(dueDate, 'MMM d')}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Tasks</CardTitle>
                <CardDescription>Tasks assigned to you</CardDescription>
              </div>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="gap-1">
                  View all <ArrowRightIcon className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No tasks assigned to you
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <Link
                    key={task._id}
                    href={`/projects/${task.project_id}/tasks/${task._id}`}
                    className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <p className="text-sm text-slate-500 truncate">
                        {task.projects?.name || 'Unknown project'}
                      </p>
                    </div>
                    <Badge className={statusColors[task.status]}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>What your team has been up to</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((log) => {
                  const profile = log.profiles;
                  const initials = profile?.full_name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase() || '?';
                  return (
                    <div key={log._id} className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{profile?.full_name || 'User'}</span>{' '}
                          <span className="text-slate-600 dark:text-slate-400">{log.action}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(log.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
