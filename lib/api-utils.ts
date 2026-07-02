import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { TeamMember } from '@/lib/models';

export function getCurrentUser(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as { userId: string; email: string };
    return decoded;
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return user;
}

export async function requireTeamAdmin(teamId: string, userId: string) {
  await connectToDatabase();
  const teamMember = await TeamMember.findOne({
    team_id: teamId,
    user_id: userId,
  });
  if (!teamMember || teamMember.role !== 'admin') {
    return false;
  }
  return true;
}
