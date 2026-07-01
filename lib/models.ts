import mongoose, { Document, Schema } from 'mongoose';

export interface IProfile extends Document {
  user_id: mongoose.Types.ObjectId;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ITeam extends Document {
  name: string;
  description: string | null;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface ITeamMember extends Document {
  team_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  role: 'member' | 'admin';
  joined_at: Date;
}

export interface IProject extends Document {
  team_id: mongoose.Types.ObjectId;
  name: string;
  description: string | null;
  color: string;
  status: 'active' | 'archived';
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface ITask extends Document {
  project_id: mongoose.Types.ObjectId;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: Date | null;
  created_by: mongoose.Types.ObjectId;
  assigned_to: mongoose.Types.ObjectId | null;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface ILabel extends Document {
  project_id: mongoose.Types.ObjectId;
  name: string;
  color: string;
}

export interface ITaskLabel extends Document {
  task_id: mongoose.Types.ObjectId;
  label_id: mongoose.Types.ObjectId;
}

export interface IComment extends Document {
  task_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  content: string;
  mentions: mongoose.Types.ObjectId[];
  created_at: Date;
  updated_at: Date;
}

export interface IAttachment extends Document {
  task_id: mongoose.Types.ObjectId;
  uploaded_by: mongoose.Types.ObjectId;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: Date;
}

export interface INotification extends Document {
  user_id: mongoose.Types.ObjectId;
  type: 'task_assigned' | 'comment' | 'mention' | 'due_date';
  entity_type: string;
  entity_id: mongoose.Types.ObjectId;
  message: string;
  read: boolean;
  created_at: Date;
}

export interface IActivityLog extends Document {
  team_id: mongoose.Types.ObjectId | null;
  project_id: mongoose.Types.ObjectId | null;
  user_id: mongoose.Types.ObjectId;
  action: string;
  entity_type: string;
  entity_id: mongoose.Types.ObjectId;
  details: Record<string, any>;
  created_at: Date;
}

interface IUser extends Document {
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

const ProfileSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  full_name: { type: String, default: null },
  avatar_url: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const TeamSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: null },
  created_by: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const TeamMemberSchema: Schema = new Schema({
  team_id: { type: Schema.Types.ObjectId, required: true, ref: 'Team' },
  user_id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  role: { type: String, enum: [ 'admin', 'member'], default: 'member' },
  joined_at: { type: Date, default: Date.now },
});

const ProjectSchema: Schema = new Schema({
  team_id: { type: Schema.Types.ObjectId, required: true, ref: 'Team' },
  name: { type: String, required: true },
  description: { type: String, default: null },
  color: { type: String, default: '#3B82F6' },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  created_by: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const TaskSchema: Schema = new Schema({
  project_id: { type: Schema.Types.ObjectId, required: true, ref: 'Project' },
  title: { type: String, required: true },
  description: { type: String, default: null },
  status: { type: String, enum: ['todo', 'in_progress', 'review', 'completed'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  due_date: { type: Date, default: null },
  created_by: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  assigned_to: { type: Schema.Types.ObjectId, default: null, ref: 'User' },
  position: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const LabelSchema: Schema = new Schema({
  project_id: { type: Schema.Types.ObjectId, required: true, ref: 'Project' },
  name: { type: String, required: true },
  color: { type: String, default: '#6366F1' },
});

const TaskLabelSchema: Schema = new Schema({
  task_id: { type: Schema.Types.ObjectId, required: true, ref: 'Task' },
  label_id: { type: Schema.Types.ObjectId, required: true, ref: 'Label' },
});

const CommentSchema: Schema = new Schema({
  task_id: { type: Schema.Types.ObjectId, required: true, ref: 'Task' },
  user_id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  content: { type: String, required: true },
  mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const AttachmentSchema: Schema = new Schema({
  task_id: { type: Schema.Types.ObjectId, required: true, ref: 'Task' },
  uploaded_by: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  file_name: { type: String, required: true },
  file_url: { type: String, required: true },
  file_type: { type: String, default: null },
  file_size: { type: Number, default: null },
  created_at: { type: Date, default: Date.now },
});

const NotificationSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  type: { type: String, enum: ['task_assigned', 'comment', 'mention', 'due_date'], required: true },
  entity_type: { type: String, required: true },
  entity_id: { type: Schema.Types.ObjectId, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

const ActivityLogSchema: Schema = new Schema({
  team_id: { type: Schema.Types.ObjectId, default: null, ref: 'Team' },
  project_id: { type: Schema.Types.ObjectId, default: null, ref: 'Project' },
  user_id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  action: { type: String, required: true },
  entity_type: { type: String, required: true },
  entity_id: { type: Schema.Types.ObjectId, required: true },
  details: { type: Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now },
});

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const Profile = mongoose.models.Profile || mongoose.model<IProfile>('Profile', ProfileSchema);
export const Team = mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
export const TeamMember = mongoose.models.TeamMember || mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema);
export const Project = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
export const Label = mongoose.models.Label || mongoose.model<ILabel>('Label', LabelSchema);
export const TaskLabel = mongoose.models.TaskLabel || mongoose.model<ITaskLabel>('TaskLabel', TaskLabelSchema);
export const Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
export const Attachment = mongoose.models.Attachment || mongoose.model<IAttachment>('Attachment', AttachmentSchema);
export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export const ActivityLog = mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
