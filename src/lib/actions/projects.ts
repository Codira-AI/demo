/**
 * Server actions for project management.
 *
 * Today: createProject. Future additions (update, archive, delete)
 * land here too.
 *
 * All actions require admin role within the authenticated org.
 * Multi-tenant scoping: the URL-supplied orgSlug must match the
 * authenticated org, otherwise we throw. requireOrgAdmin() handles
 * the auth + role check; we add the slug check inline.
 */

'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireOrgAdmin } from '@/lib/auth';

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const createSchema = z.object({
  orgSlug: z.string().min(1),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  description: z.string().trim().max(500).optional(),
  isPublic: z.union([z.literal('on'), z.literal('off'), z.literal(undefined)])
    .optional(),
});

export async function createProject(formData: FormData): Promise<void> {
  const { organization } = await requireOrgAdmin();
  const parsed = createSchema.parse({
    orgSlug: formData.get('orgSlug'),
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    isPublic: formData.get('isPublic') || undefined,
  });
  if (organization.slug !== parsed.orgSlug) {
    throw new Error('org slug mismatch');
  }

  // Derive a slug from the name. If it collides with an existing
  // project in this org, append -2, -3, ... until unique.
  const baseSlug = slugify(parsed.name);
  if (!baseSlug) {
    throw new Error('Name must contain at least one letter or number');
  }
  let slug = baseSlug;
  for (let i = 2; i < 100; i++) {
    const existing = await db.project.findUnique({
      where: { organization_id_slug: { organization_id: organization.id, slug } },
    });
    if (!existing) break;
    slug = `${baseSlug}-${i}`;
  }

  const project = await db.project.create({
    data: {
      organization_id: organization.id,
      slug,
      name: parsed.name,
      description: parsed.description ?? null,
      is_public: parsed.isPublic === 'on',
    },
  });

  revalidatePath(`/${parsed.orgSlug}/projects`);
  revalidatePath(`/${parsed.orgSlug}/dashboard`);
  // Take the admin straight to the new project's detail page so
  // they can immediately add tasks, share the public URL, etc.
  redirect(`/${parsed.orgSlug}/projects/${project.slug}`);
}
