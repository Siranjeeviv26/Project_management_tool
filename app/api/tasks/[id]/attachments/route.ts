import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Attachment, Task } from '@/lib/models';
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

    const attachments = await Attachment.find({ task_id: params.id }).sort({ created_at: -1 });
    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Get attachments error:', error);
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

    const { file_name, file_type, file_size, file_content } = await req.json();

    if (!file_name || !file_content) {
      return NextResponse.json({ error: 'File name and content are required' }, { status: 400 });
    }

    const attachment = await Attachment.create({
      task_id: params.id,
      uploaded_by: user.userId,
      file_name,
      file_url: file_content,
      file_type: file_type || null,
      file_size: file_size || null,
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.error('Create attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 });
    }

    await Attachment.findOneAndDelete({ _id: attachmentId, task_id: params.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
