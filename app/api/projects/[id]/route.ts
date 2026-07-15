import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import {
  deleteLocalProject,
  isLocalGenerationStoreEnabled,
  updateLocalProject,
} from '@/lib/local-generation-store';

/**
 * PATCH /api/projects/[id]
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  const { id } = await context.params;
  const body = await req.json();

  if (isLocalGenerationStoreEnabled(user_id)) {
    const project = await updateLocalProject(id, user_id, { name: body.name });
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, local: true });
  }

  let existing;
  try {
    existing = await prisma.projects.findFirst({
      where: { id, user_id },
    });
  } catch (error) {
    if (!isLocalGenerationStoreEnabled(user_id)) throw error;
    const project = await updateLocalProject(id, user_id, { name: body.name });
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, local: true });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updateData: Parameters<typeof prisma.projects.update>[0]['data'] = {};
  if (body.name !== undefined) updateData.name = body.name;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  await prisma.projects.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/projects/[id]
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  const { id } = await context.params;

  if (isLocalGenerationStoreEnabled(user_id)) {
    const deleted = await deleteLocalProject(id, user_id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, local: true });
  }

  let existing;
  try {
    existing = await prisma.projects.findFirst({
      where: { id, user_id },
    });
  } catch (error) {
    if (!isLocalGenerationStoreEnabled(user_id)) throw error;
    const deleted = await deleteLocalProject(id, user_id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, local: true });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.projects.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
