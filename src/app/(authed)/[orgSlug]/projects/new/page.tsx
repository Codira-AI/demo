/**
 * New project form.
 *
 * Admin-only — both the layout guard (requireOrgAccess) and the
 * action (requireOrgAdmin in lib/actions/projects.ts) gate access.
 * The action redirects to the new project's detail page on success.
 */

import Link from 'next/link';
import { createProject } from '@/lib/actions/projects';

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <div className="mx-auto max-w-xl px-8 py-8">
      <Link
        href={`/${orgSlug}/projects`}
        className="text-xs text-ink-2 hover:text-ink-0"
      >
        ← Projects
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">New project</h1>
      <p className="mt-1 mb-6 text-sm text-ink-2">
        A project groups internal tasks and customer-facing feedback for one
        product or initiative.
      </p>

      <form action={createProject} className="space-y-4">
        <input type="hidden" name="orgSlug" value={orgSlug} />

        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-2"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="e.g. Ship Tracker"
            className="w-full rounded border border-edge bg-bg-0 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-2 focus:border-accent focus:outline-none"
          />
          <p className="mt-1 text-xs text-ink-2">
            The slug for public URLs is derived from this name.
          </p>
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-2"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            maxLength={500}
            rows={3}
            placeholder="What is this project for? Customers see this on the public board."
            className="w-full rounded border border-edge bg-bg-0 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-2 focus:border-accent focus:outline-none"
          />
        </div>

        <div className="rounded border border-edge bg-bg-1 p-3">
          <label className="flex items-start gap-2 text-sm text-ink-0">
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked
              className="mt-0.5"
            />
            <div>
              <div>Public feedback board</div>
              <div className="text-xs text-ink-2">
                Customers can find this board at /{orgSlug}/[slug] and submit
                feedback without an account.
              </div>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/${orgSlug}/projects`}
            className="rounded border border-edge bg-bg-1 px-3 py-1.5 text-sm text-ink-1 hover:bg-bg-2 hover:text-ink-0"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent/90"
          >
            Create project
          </button>
        </div>
      </form>
    </div>
  );
}
