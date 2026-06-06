import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const prisma = getPrisma(getRequestContext().env.DB);
    const userId = request.headers.get('x-user-id');
    const tasks = await prisma.task.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const prisma = getPrisma(getRequestContext().env.DB);
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const task = await prisma.task.create({
      data: {
        userId: userId || null,
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        category: body.category,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        startTime: body.startTime,
        endTime: body.endTime,
        location: body.location,
      }
    });
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
