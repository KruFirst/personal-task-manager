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
    if (body.name !== undefined) data.name = body.name;
    if (body.avatar !== undefined) data.avatar = body.avatar;
    if (body.pin !== undefined && body.pin.length === 4) data.pin = body.pin;

    const user = await prisma.user.update({
      where: { id },
      data
    });
    
    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, avatar: user.avatar } });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
