import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Comment, Task, Profile } from '@/lib/models';
import { requireProjectAccess } from '@/lib/project-access';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const task = await Task.findById(params.id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(req, task.project_id.toString());
    if ('error' in access && access.error) return access.error;

    const comments = await Comment.find({ task_id: params.id }).sort({ created_at: 1 });
    const userIds = comments.map(c => c.user_id);
    const profiles = await Profile.find({ user_id: { $in: userIds } });

    const commentsWithProfiles = comments.map(comment => ({
      ...comment.toObject(),
      profiles: profiles.find(p => p.user_id.toString() === comment.user_id.toString()),
    }));

    return NextResponse.json(commentsWithProfiles);
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const task = await Task.findById(params.id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(req, task.project_id.toString());
    if ('error' in access && access.error) return access.error;
    const { user } = access;

    const { content } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    const comment = await Comment.create({
      task_id: params.id,
      user_id: user.userId,
      content: content.trim(),
    });

    const profile = await Profile.findOne({ user_id: user.userId });

    return NextResponse.json({
      ...comment.toObject(),
      profiles: profile,
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
