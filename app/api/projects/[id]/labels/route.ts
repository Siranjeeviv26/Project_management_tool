import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Label } from '@/lib/models';
import { requireProjectAccess } from '@/lib/project-access';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await requireProjectAccess(req, params.id);
    if ('error' in access && access.error) return access.error;

    await connectToDatabase();

    const labels = await Label.find({ project_id: params.id });
    return NextResponse.json(labels);
  } catch (error) {
    console.error('Get labels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
