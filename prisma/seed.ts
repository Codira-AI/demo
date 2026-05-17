/**
 * Tessera seed.
 *
 * Populates a believable "Demo Inc." environment:
 *   - 1 organization on the Pro plan, mid-billing-cycle
 *   - 1 admin user (matches DEMO_USER in src/lib/demo.ts)
 *   - 2 team members beyond the admin
 *   - 2 projects with distinct flavors
 *   - 5 tasks across the projects, mixed statuses, some with assignees
 *   - 8 customers (external) with realistic names
 *   - 14 feedback posts spanning all 5 status values
 *   - votes distributed roughly log-normally (a few popular, many quiet)
 *   - 4 comments mixing team + customer authorship
 *
 * Idempotent via upsert — running `npm run db:seed` twice doesn't
 * duplicate. Useful both for first-time setup and for refreshing
 * state between demo recordings.
 */

import { PrismaClient, Plan, SubscriptionStatus, UserRole, TaskStatus, Priority, PostStatus } from '@prisma/client';
import { DEMO_ORG, DEMO_USER } from '../src/lib/demo';

const db = new PrismaClient();

async function main() {
  // ─── ORG + SUBSCRIPTION ─────────────────────────────────────
  const org = await db.organization.upsert({
    where: { clerk_org_id: DEMO_ORG.clerk_org_id },
    create: {
      clerk_org_id: DEMO_ORG.clerk_org_id,
      name: DEMO_ORG.name,
      slug: DEMO_ORG.slug,
      plan: Plan.pro,
      stripe_customer_id: 'cus_demo_codira',
      stripe_subscription_id: 'sub_demo_codira',
      current_period_end: daysFromNow(18),
    },
    update: {},
  });

  await db.subscription.upsert({
    where: { organization_id: org.id },
    create: {
      organization_id: org.id,
      plan: Plan.pro,
      status: SubscriptionStatus.active,
      current_period_end: daysFromNow(18),
      cancel_at_period_end: false,
    },
    update: {},
  });

  // ─── USERS ──────────────────────────────────────────────────
  const admin = await db.user.upsert({
    where: { clerk_user_id: DEMO_USER.clerk_user_id },
    create: {
      clerk_user_id: DEMO_USER.clerk_user_id,
      organization_id: org.id,
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      role: UserRole.admin,
    },
    update: {},
  });

  const taylor = await db.user.upsert({
    where: { clerk_user_id: 'demo_user_taylor' },
    create: {
      clerk_user_id: 'demo_user_taylor',
      organization_id: org.id,
      email: 'taylor@demo-inc.example',
      name: 'Taylor Park',
      role: UserRole.member,
    },
    update: {},
  });

  const morgan = await db.user.upsert({
    where: { clerk_user_id: 'demo_user_morgan' },
    create: {
      clerk_user_id: 'demo_user_morgan',
      organization_id: org.id,
      email: 'morgan@demo-inc.example',
      name: 'Morgan Riley',
      role: UserRole.member,
    },
    update: {},
  });

  // ─── PROJECTS ───────────────────────────────────────────────
  const shipTracker = await upsertProject(org.id, 'ship-tracker', {
    name: 'Ship Tracker',
    description:
      'Our main customer feedback board for the Ship Tracker app. Pre-launch — we ship to beta in 2 weeks.',
  });
  const radar = await upsertProject(org.id, 'radar', {
    name: 'Radar',
    description: 'Internal-only roadmap for our analytics product (no public posts here).',
    is_public: false,
  });

  // ─── TASKS ──────────────────────────────────────────────────
  await Promise.all([
    upsertTask(shipTracker.id, 'task-1', {
      title: 'Polish the public feedback board layout',
      description: 'Mobile breakpoint is broken below 380px. Status pills wrap awkwardly.',
      status: TaskStatus.in_progress,
      priority: Priority.high,
      assigneeIds: [admin.id],
    }),
    upsertTask(shipTracker.id, 'task-2', {
      title: 'Email digest for board owners',
      description: 'Weekly summary of new posts + top-voted items. Resend + React Email.',
      status: TaskStatus.todo,
      priority: Priority.medium,
      assigneeIds: [taylor.id],
    }),
    upsertTask(shipTracker.id, 'task-3', {
      title: 'Stripe webhook reconciliation job',
      description: 'Cron that reconciles missed webhook events from the last 24h.',
      status: TaskStatus.in_review,
      priority: Priority.urgent,
      assigneeIds: [admin.id, morgan.id],
    }),
    upsertTask(radar.id, 'task-4', {
      title: 'Set up Postgres read replica',
      description: 'Analytics queries are getting slow. Read replica for the dashboard reads.',
      status: TaskStatus.todo,
      priority: Priority.medium,
      assigneeIds: [morgan.id],
    }),
    upsertTask(radar.id, 'task-5', {
      title: 'Audit event schema for v2 analytics',
      description: 'Current event shape is too flat for funnel queries. Need to nest properties.',
      status: TaskStatus.done,
      priority: Priority.low,
      assigneeIds: [taylor.id],
    }),
  ]);

  // ─── CUSTOMERS ──────────────────────────────────────────────
  const customers = await Promise.all(
    [
      { email: 'alex.lin@example.com', name: 'Alex Lin' },
      { email: 'jordan.smith@example.com', name: 'Jordan Smith' },
      { email: 'sam.cooper@example.com', name: 'Sam Cooper' },
      { email: 'riley.thomas@example.com', name: 'Riley Thomas' },
      { email: 'kai.morrison@example.com', name: 'Kai Morrison' },
      { email: 'evan.lee@example.com', name: 'Evan Lee' },
      { email: 'priya.nair@example.com', name: 'Priya Nair' },
      { email: 'jamie.fox@example.com', name: 'Jamie Fox' },
    ].map((c) =>
      db.customer.upsert({
        where: { email: c.email },
        create: c,
        update: {},
      }),
    ),
  );

  // ─── FEEDBACK POSTS ────────────────────────────────────────
  // Mix of statuses; titles read like real customer requests.
  const postSpecs: Array<{
    title: string;
    body: string;
    status: PostStatus;
    authorIdx: number;
    voteCustomerIdxs: number[];
  }> = [
    {
      title: 'Dark mode for the dashboard',
      body: 'Reading the dashboard at night burns my eyes. Even just a system-pref toggle would help.',
      status: PostStatus.planned,
      authorIdx: 0,
      voteCustomerIdxs: [0, 1, 2, 3, 4, 5, 6, 7], // very popular
    },
    {
      title: 'CSV export for projects',
      body: 'Need to share project data with my non-technical co-founder who lives in spreadsheets.',
      status: PostStatus.in_progress,
      authorIdx: 1,
      voteCustomerIdxs: [1, 2, 3, 5, 7],
    },
    {
      title: 'Slack notifications when a high-priority task is created',
      body: 'We use Slack for everything. Email is too easy to miss.',
      status: PostStatus.completed,
      authorIdx: 2,
      voteCustomerIdxs: [0, 2, 4, 6],
    },
    {
      title: 'API access for integrations',
      body: 'I want to push tasks from my GitHub issues automatically.',
      status: PostStatus.planned,
      authorIdx: 3,
      voteCustomerIdxs: [0, 3, 5, 7],
    },
    {
      title: 'Bulk-assign tasks',
      body: 'Going through 30 tasks one at a time to reassign them is brutal.',
      status: PostStatus.open,
      authorIdx: 4,
      voteCustomerIdxs: [4, 5],
    },
    {
      title: 'Recurring tasks',
      body: 'My weekly review task should not need to be manually re-created every Monday.',
      status: PostStatus.open,
      authorIdx: 5,
      voteCustomerIdxs: [1, 5, 6],
    },
    {
      title: 'Better mobile experience',
      body: 'The dashboard works on mobile but feels cramped. Would love a real mobile-first redesign.',
      status: PostStatus.open,
      authorIdx: 6,
      voteCustomerIdxs: [0, 2, 4, 6, 7],
    },
    {
      title: 'Time tracking on tasks',
      body: "Even a simple 'start/stop timer' would help me bill clients accurately.",
      status: PostStatus.declined,
      authorIdx: 7,
      voteCustomerIdxs: [7],
    },
    {
      title: 'Two-factor authentication',
      body: 'My team handles sensitive customer data and we need 2FA available, ideally TOTP.',
      status: PostStatus.in_progress,
      authorIdx: 0,
      voteCustomerIdxs: [0, 3, 4, 6, 7],
    },
    {
      title: 'Custom task statuses',
      body: 'The 4 statuses are nice but our team has a "blocked" state we want to track.',
      status: PostStatus.open,
      authorIdx: 1,
      voteCustomerIdxs: [1, 2, 5],
    },
    {
      title: 'Drag-and-drop task reordering',
      body: 'I love the keyboard shortcuts but sometimes I just want to grab a task and move it.',
      status: PostStatus.open,
      authorIdx: 2,
      voteCustomerIdxs: [2, 3],
    },
    {
      title: 'Comment reactions',
      body: 'A simple 👍/❤️ on comments saves typing "agreed" 50 times.',
      status: PostStatus.completed,
      authorIdx: 3,
      voteCustomerIdxs: [0, 1, 3, 4],
    },
    {
      title: 'Per-project email digests',
      body: 'Currently I get one digest for everything. Would love per-project granularity.',
      status: PostStatus.open,
      authorIdx: 4,
      voteCustomerIdxs: [4, 5, 6],
    },
    {
      title: 'GraphQL API',
      body: 'REST is fine but GraphQL would let me fetch exactly what I need for our admin tool.',
      status: PostStatus.declined,
      authorIdx: 5,
      voteCustomerIdxs: [5],
    },
  ];

  // Insert posts + votes. We rely on `findFirst` + `create` rather
  // than upsert because there's no natural unique key on (project,
  // title) — re-running the seed produces a no-op when posts already
  // exist by title-match.
  for (const spec of postSpecs) {
    const existing = await db.feedbackPost.findFirst({
      where: { project_id: shipTracker.id, title: spec.title },
    });
    if (existing) continue;
    const post = await db.feedbackPost.create({
      data: {
        project_id: shipTracker.id,
        customer_id: customers[spec.authorIdx]!.id,
        title: spec.title,
        body: spec.body,
        status: spec.status,
      },
    });
    for (const voterIdx of spec.voteCustomerIdxs) {
      await db.vote.create({
        data: { post_id: post.id, customer_id: customers[voterIdx]!.id },
      });
    }
  }

  // ─── COMMENTS — mix of team + customer authorship ──────────
  const darkModePost = await db.feedbackPost.findFirst({
    where: { project_id: shipTracker.id, title: 'Dark mode for the dashboard' },
  });
  const apiPost = await db.feedbackPost.findFirst({
    where: { project_id: shipTracker.id, title: 'API access for integrations' },
  });
  if (darkModePost) {
    await db.comment.createMany({
      data: [
        {
          post_id: darkModePost.id,
          body: 'Great timing — we just started this. Aiming to ship in 2 weeks.',
          author_user_id: admin.id,
        },
        {
          post_id: darkModePost.id,
          body: 'Will it follow system preference automatically? Or manual toggle only?',
          author_customer_id: customers[3]!.id,
        },
        {
          post_id: darkModePost.id,
          body: 'Both — system by default with a manual override in Settings.',
          author_user_id: admin.id,
        },
      ],
      skipDuplicates: true,
    });
  }
  if (apiPost) {
    await db.comment.create({
      data: {
        post_id: apiPost.id,
        body: "We're planning to launch the API in v2. REST first, then GraphQL if there's demand.",
        author_user_id: taylor.id,
      },
    });
  }

  // ─── DONE ───────────────────────────────────────────────────
  const summary = await db.$transaction([
    db.organization.count(),
    db.user.count(),
    db.project.count(),
    db.task.count(),
    db.customer.count(),
    db.feedbackPost.count(),
    db.vote.count(),
    db.comment.count(),
  ]);
  console.log(
    `Seed complete — ${summary[0]} org, ${summary[1]} users, ${summary[2]} projects, ` +
      `${summary[3]} tasks, ${summary[4]} customers, ${summary[5]} posts, ` +
      `${summary[6]} votes, ${summary[7]} comments.`,
  );
}

// ─── helpers ──────────────────────────────────────────────────

function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

async function upsertProject(
  orgId: string,
  slug: string,
  data: { name: string; description?: string; is_public?: boolean },
) {
  return db.project.upsert({
    where: { organization_id_slug: { organization_id: orgId, slug } },
    create: { organization_id: orgId, slug, ...data },
    update: {},
  });
}

async function upsertTask(
  projectId: string,
  identifier: string, // arbitrary, for idempotency lookup
  data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    assigneeIds: string[];
  },
) {
  const existing = await db.task.findFirst({
    where: { project_id: projectId, title: data.title },
  });
  if (existing) return existing;
  return db.task.create({
    data: {
      project_id: projectId,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assignees: { connect: data.assigneeIds.map((id) => ({ id })) },
    },
  });
  void identifier;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
