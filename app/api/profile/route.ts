import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function isLocalAdminMode(): boolean {
  return process.env.LOCAL_ADMIN_MODE === 'true';
}

function localAdminProfile() {
  const now = new Date().toISOString();
  return {
    id: 'local-admin-profile',
    user_id: 'local-admin',
    email: process.env.ADMIN_EMAIL || 'admin@local.test',
    full_name: 'Local Admin',
    credits: 999999,
    frozen_credits: 0,
    role: 'admin',
    invite_code: null,
    invited_by: null,
    invite_count: 0,
    reward_credits: 0,
    created_at: now,
    updated_at: now,
  };
}

export async function GET() {
  if (isLocalAdminMode()) {
    return NextResponse.json(localAdminProfile());
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profile = await prisma.profiles.findUnique({
      where: { user_id: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.warn('Profile database unavailable, using trial profile:', error);
    return NextResponse.json({
      id: `trial-${session.user.id}`,
      user_id: session.user.id,
      email: session.user.email ?? '',
      full_name: session.user.name ?? 'Trial User',
      credits: 999,
      frozen_credits: 0,
      role: 'user',
      invite_code: null,
      invited_by: null,
      invite_count: 0,
      reward_credits: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fallback: true,
    });
  }
}

export async function PATCH(req: NextRequest) {
  if (isLocalAdminMode()) {
    return NextResponse.json({ success: true });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { full_name } = body as { full_name?: string };

  if (typeof full_name !== 'string' || full_name.length > 50) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }

  // Update user name in the users table
  await prisma.users.update({
    where: { id: session.user.id },
    data: { name: full_name },
  });

  return NextResponse.json({ success: true });
}
