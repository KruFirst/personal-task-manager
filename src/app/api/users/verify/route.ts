import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const prisma = getPrisma(getRequestContext().env.DB);
    const { userId, pin } = await request.json();
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || user.pin !== pin) {
      return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
    }
    
    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, avatar: user.avatar } });
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
