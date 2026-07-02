"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Users,
  Plus,
  MoreVertical,
  UserPlus,
  UserMinus,
  Crown,
  Shield,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface Profile {
  _id: string;
  id?: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface Team {
  _id: string;
  id?: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface TeamMember {
  _id: string;
  id?: string;
  team_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: Date | string;
  profiles?: Profile;
}

const roleIcons = {
  admin: <Shield className="w-3.5 h-3.5 text-blue-500" />,
  member: <Users className="w-3.5 h-3.5 text-slate-500" />,
};

export default function TeamsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<(Team & { memberCount: number; userRole: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<(TeamMember & { profiles: Profile })[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Teams Page] Auth state:', { user, authLoading });
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadTeams();
      }
    }
  }, [user, authLoading, router]);

  const loadTeams = async () => {
    console.log('[Teams Page] Loading teams...');
    setLoading(true);
    try {
      const res = await fetch('/api/teams');
      console.log('[Teams Page] Teams API response status:', res.status);
      if (res.ok) {
        const teamsData = await res.json();
        console.log('[Teams Page] Teams data:', teamsData);
        setTeams(teamsData);
      } else {
        console.error('[Teams Page] Teams API failed:', res.status);
      }
    } catch (error) {
      console.error('[Teams Page] Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        setCreateDialogOpen(false);
        setName('');
        setDescription('');
        loadTeams();
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const openInviteDialog = async (team: Team) => {
    setSelectedTeam(team);
    setInviteDialogOpen(true);
    setInviteEmail('');
    setInviteName('');
    setInviteRole('member');
    setError(null);

    try {
      const res = await fetch(`/api/teams/${team._id}/members`);
      if (res.ok) {
        setTeamMembers(await res.json());
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/teams/${selectedTeam._id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, full_name: inviteName, role: inviteRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to invite team member');
      }

      setInviteEmail('');
      setInviteName('');
      // Refresh team members list
      const membersRes = await fetch(`/api/teams/${selectedTeam._id}/members`);
      if (membersRes.ok) {
        setTeamMembers(await membersRes.json());
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!selectedTeam) return;
    // Need to implement remove member endpoint
    console.log('Remove member:', member);
  };

  const handleUpdateRole = async (member: TeamMember, newRole: string) => {
    if (!selectedTeam) return;
    // Need to implement update role endpoint
    console.log('Update role:', member, newRole);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Teams</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your teams and collaborate with others
          </p>
        </div>
        {(user?.role === 'admin' || teams.length === 0) && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/25">
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new team</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Team name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter team name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this team about?"
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Team
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {teams.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No teams yet</h3>
            <p className="text-slate-500 mb-4">
              Create your first team to get started
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card key={team._id} className="group hover:shadow-lg transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    {roleIcons[team.userRole as keyof typeof roleIcons]}
                    {team.userRole}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {team.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                    {team.description}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-slate-500">
                    Created {format(new Date(team.created_at), 'MMM d, yyyy')}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openInviteDialog(team)}>
                      <UserPlus className="w-4 h-4" />
                    </Button>
                    <Link href={`/projects?team=${team._id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Team Members - {selectedTeam?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Member name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                  required
                />
              </div>
              <div className="flex gap-2">
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'member')}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add Member
              </Button>
              </div>
            </form>
            <p className="text-xs text-slate-500">
              Members can register or sign up with this email to set their password and access assigned projects.
            </p>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="divide-y">
              {teamMembers.map((member) => {
                const profile = member.profiles;
                const initials = profile?.full_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?';
                const isCurrentUser = member.user_id === user?.id;
                return (
                  <div key={member._id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={profile?.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{profile?.full_name || 'User'}</p>
                        <p className="text-sm text-slate-500">{profile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrentUser ? (
                        <Badge variant="secondary">{member.role}</Badge>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1">
                              {roleIcons[member.role as keyof typeof roleIcons]}
                              {member.role}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUpdateRole(member, 'admin')}>
                              <Shield className="w-4 h-4 mr-2 text-blue-500" />
                              Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateRole(member, 'member')}>
                              <Users className="w-4 h-4 mr-2 text-slate-500" />
                              Member
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
