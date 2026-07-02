"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  Plus,
  Loader2,
  Calendar,
  User,
  MoreVertical,
  MessageSquare,
  Paperclip,
  GripVertical,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TaskDetailPanel } from './components/task-detail-panel';

interface Profile {
  _id: string;
  id?: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
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
}

interface Label {
  _id: string;
  id?: string;
  project_id: string;
  name: string;
  color: string;
}

const columns = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', title: 'Review', color: 'bg-amber-500' },
  { id: 'completed', title: 'Completed', color: 'bg-green-500' },
];

const priorityColors = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const UNASSIGNED = 'unassigned';

export default function ProjectBoardPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'review' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assigned_to: string;
    due_date: string;
  }>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (projectId) {
        loadData();
      }
    }
  }, [user, authLoading, projectId, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, labelsRes, membersRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/tasks`),
        fetch(`/api/projects/${projectId}/labels`),
        fetch(`/api/projects/${projectId}/team-members`),
      ]);

      if (tasksRes.ok) {
        const t = await tasksRes.json();
        console.log('Tasks from API:', t);
        setTasks(t);
      }
      if (labelsRes.ok) {
        setLabels(await labelsRes.json());
      }
      if (membersRes.ok) {
        const members = await membersRes.json();
        console.log('Team Members from API:', members);
        setTeamMembers(members);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const taskData = {
        ...newTask,
        assigned_to: newTask.assigned_to || null,
        due_date: newTask.due_date || null,
      };

      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (res.ok) {
        setCreateDialogOpen(false);
        setNewTask({
          title: '',
          description: '',
          status: 'todo',
          priority: 'medium',
          assigned_to: '',
          due_date: '',
        });
        loadData();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const task = tasks.find((t) => t._id === draggableId);
    if (!task) return;

    const newStatus = destination.droppableId as Task['status'];
    const newTasks = [...tasks];
    const taskIndex = newTasks.findIndex((t) => t._id === draggableId);

    newTasks[taskIndex] = { ...task, status: newStatus };

    const sameStatusTasks = newTasks.filter((t) => t.status === newStatus);
    sameStatusTasks.sort((a, b) => a.position - b.position);

    const oldIndex = sameStatusTasks.findIndex((t) => t._id === draggableId);
    sameStatusTasks.splice(oldIndex, 1);
    sameStatusTasks.splice(destination.index, 0, task);

    sameStatusTasks.forEach((t, i) => {
      const idx = newTasks.findIndex((nt) => nt._id === t._id);
      newTasks[idx].position = i;
    });

    setTasks(newTasks);

    await fetch(`/api/tasks/${task._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: newStatus, 
        position: sameStatusTasks.findIndex((t) => t._id === draggableId) 
      }),
    });
  }, [tasks, projectId, user]);

  const handleDeleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
    setSelectedTask(null);
    setDetailOpen(false);
    loadData();
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const getTasksByStatus = (status: string) => tasks.filter((t) => t.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/projects')}>
            <span className="sr-only">Back</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Kanban Board</h1>
            <p className="text-slate-600 dark:text-slate-400">Drag and drop tasks to update status</p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-gradient-to-r from-blue-600 to-cyan-500">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.id);
            return (
              <div key={column.id} className="flex-shrink-0 w-80">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <h3 className="font-medium text-slate-700 dark:text-slate-300">{column.title}</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {columnTasks.length}
                  </Badge>
                </div>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef as React.RefCallback<HTMLDivElement>}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[200px] p-2 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-slate-100/50 dark:bg-slate-800/30'
                      }`}
                    >
                      {columnTasks.map((task, index) => {
                        const assignee = task.profiles as Profile | null;
                        const initials = assignee?.full_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase() || assignee?.email?.[0]?.toUpperCase() || '?';
                        const dueDate = task.due_date ? new Date(task.due_date) : null;
                        const isOverdue = dueDate && isPast(dueDate) && task.status !== 'completed';

                        return (
                          <Draggable key={task._id} draggableId={task._id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef as React.RefCallback<HTMLDivElement>}
                                {...provided.draggableProps}
                                style={provided.draggableProps.style as React.CSSProperties}
                                className={`cursor-pointer transition-all hover:shadow-md ${
                                  snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                }`}
                                onClick={() => openTaskDetail(task)}
                              >
                                <Card>
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-2">
                                    <div
                                      {...provided.dragHandleProps as React.HTMLAttributes<HTMLDivElement>}
                                      className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm line-clamp-2">{task.title}</p>
                                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <Badge className={priorityColors[task.priority]} variant="secondary">
                                          {task.priority}
                                        </Badge>
                                        {dueDate && (
                                          <Badge
                                            variant={isOverdue ? 'destructive' : 'secondary'}
                                            className="text-xs"
                                          >
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {isToday(dueDate)
                                              ? 'Today'
                                              : isTomorrow(dueDate)
                                              ? 'Tomorrow'
                                              : format(dueDate, 'MMM d')}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between mt-2">
                                        {assignee && (
                                          <Avatar className="w-6 h-6">
                                            <AvatarImage src={assignee.avatar_url || ''} />
                                            <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                                              {initials}
                                            </AvatarFallback>
                                          </Avatar>
                                        )}
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                          {task.description && (
                                            <MessageSquare className="w-3 h-3" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {columnTasks.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                          No tasks
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Add a description..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={newTask.status}
                  onValueChange={(v) => setNewTask({ ...newTask, status: v as typeof newTask.status })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={newTask.priority}
                  onValueChange={(v) => setNewTask({ ...newTask, priority: v as typeof newTask.priority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assignee</label>
                <Select
                  value={newTask.assigned_to || UNASSIGNED}
                  onValueChange={(v) =>
                    setNewTask({ ...newTask, assigned_to: v === UNASSIGNED ? '' : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member._id} value={member.user_id.toString()}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Task Details</SheetTitle>
          </SheetHeader>
          {selectedTask && (
            <TaskDetailPanel
              task={selectedTask}
              projectId={projectId as string}
              teamMembers={teamMembers}
              labels={labels}
              onClose={() => setDetailOpen(false)}
              onRefresh={loadData}
              onDelete={() => handleDeleteTask(selectedTask._id)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
