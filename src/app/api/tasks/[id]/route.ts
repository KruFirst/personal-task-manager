import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const prisma = getPrisma(getRequestContext().env.DB);
    const { id } = await props.params;
    const body = await request.json();
    
    // Only update provided fields
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.category !== undefined) data.category = body.category;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.archived !== undefined) data.archived = body.archived;
    if (body.startTime !== undefined) data.startTime = body.startTime;
    if (body.endTime !== undefined) data.endTime = body.endTime;
    if (body.location !== undefined) data.location = body.location;

    const task = await prisma.task.update({
      where: { id },
      data
    });
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const prisma = getPrisma(getRequestContext().env.DB);
    const { id } = await props.params;
    await prisma.task.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
