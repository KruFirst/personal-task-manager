import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET() {
  try {
    const prisma = getPrisma(getRequestContext().env.DB);
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        avatar: true,
        // Don't send pin!
      }
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
