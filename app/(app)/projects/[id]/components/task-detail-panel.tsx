"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import {
  Calendar,
  User,
  Tag,
  MessageSquare,
  Paperclip,
  Trash2,
  Send,
  Loader2,
  Upload,
  Download,
  X,
} from 'lucide-react';

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

interface Comment {
  _id: string;
  id?: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  created_at: Date | string;
  updated_at: Date | string;
  profiles?: Profile;
}

interface Attachment {
  _id: string;
  id?: string;
  task_id: string;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: Date | string;
}

interface TaskDetailPanelProps {
  task: Task;
  projectId: string;
  teamMembers: Profile[];
  labels: Label[];
  onClose: () => void;
  onRefresh: () => void;
  onDelete: () => void;
}

const priorityColors = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const statusColors = {
  todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
};

const UNASSIGNED = 'unassigned';

export function TaskDetailPanel({
  task,
  projectId,
  teamMembers,
  labels,
  onClose,
  onRefresh,
  onDelete,
}: TaskDetailPanelProps) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const [dueDate, setDueDate] = useState(task.due_date ? (typeof task.due_date === 'string' ? task.due_date.split('T')[0] : '') : '');
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<(Comment & { profiles: Profile })[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadComments();
    loadAttachments();
  }, [task._id]);

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/tasks/${task._id}/comments`);
      if (res.ok) {
        setComments(await res.json());
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadAttachments = async () => {
    try {
      const res = await fetch(`/api/tasks/${task._id}/attachments`);
      if (res.ok) {
        setAttachments(await res.json());
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/tasks/${task._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          status,
          priority,
          assigned_to: assignedTo || null,
          due_date: dueDate || null,
        }),
      });

      setEditing(false);
      onRefresh();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (res.ok) {
        setNewComment('');
        loadComments();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileContent = reader.result as string;
        const res = await fetch(`/api/tasks/${task._id}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_content: fileContent,
          }),
        });

        if (res.ok) {
          loadAttachments();
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    try {
      await fetch(`/api/tasks/${task._id}/attachments?attachmentId=${attachment._id}`, {
        method: 'DELETE',
      });
      loadAttachments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    return (
      name?.split(' ').map((n) => n[0]).join('').toUpperCase() ||
      email?.[0]?.toUpperCase() ||
      '?'
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <ScrollArea className="h-[calc(100vh-100px)]">
      <div className="space-y-6 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          {editing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold"
            />
          ) : (
            <h2 className="text-lg font-semibold">{task.title}</h2>
          )}
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Status and Priority */}
        <div className="flex items-center gap-3">
          {editing ? (
            <>
              <Select value={status} onValueChange={(v) => setStatus(v as Task['status'])}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={(v) => setPriority(v as Task['priority'])}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : (
            <>
              <Badge className={statusColors[task.status]}>
                {task.status.replace('_', ' ')}
              </Badge>
              <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
            </>
          )}
        </div>

        <Separator />

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-500">Description</h3>
          {editing ? (
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={4}
            />
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {task.description || 'No description'}
            </p>
          )}
        </div>

        {/* Due Date and Assignee */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-500 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Due Date
            </h3>
            {editing ? (
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            ) : (
              <p className="text-sm">
                {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'Not set'}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-500 flex items-center gap-1">
              <User className="w-4 h-4" /> Assignee
            </h3>
            {editing ? (
              <Select
                value={assignedTo || UNASSIGNED}
                onValueChange={(v) => setAssignedTo(v === UNASSIGNED ? '' : v)}
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
            ) : (
              <div className="flex items-center gap-2">
                {task.profiles ? (
                  <>
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={task.profiles.avatar_url || ''} />
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                        {getInitials(task.profiles.full_name, task.profiles.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{task.profiles.full_name || task.profiles.email}</span>
                  </>
                ) : (
                  <span className="text-sm text-slate-500">Unassigned</span>
                )}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Attachments */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-500 flex items-center gap-1">
            <Paperclip className="w-4 h-4" /> Attachments ({attachments.length})
          </h3>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-1" />
                  )}
                  Upload
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((att) => (
                <div
                  key={att._id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-4 h-4 flex-shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-sm truncate">{att.file_name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(att.file_size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAttachment(att)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Comments */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-500 flex items-center gap-1">
            <MessageSquare className="w-4 h-4" /> Comments ({comments.length})
          </h3>
          <form onSubmit={handleAddComment} className="flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={submittingComment}>
              {submittingComment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          {comments.length > 0 && (
            <div className="space-y-3 mt-4">
              {comments.map((comment) => {
                const initials = getInitials(comment.profiles?.full_name, comment.profiles?.email);
                return (
                  <div key={comment._id} className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={comment.profiles?.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.profiles?.full_name || 'User'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete */}
        <Separator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Task
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this task? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}
