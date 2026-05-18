/**
 * CODIRA_DEMO: intentional type errors (Hook 5).
 *
 * This file's whole purpose is to give Codira's Phase 2 scanner
 * (`tsc --noEmit`) something to flag so the first-steps card in
 * the chat panel reads:
 *
 *   ✓ Detected your project — 9 tiles + 9 entities added to Architect
 *   typescript scan: 2 errors, 0 warnings — see src/lib/demo-errors.ts
 *
 * The errors are deliberate and small. They don't break runtime
 * because nothing imports this file. They don't break `npm run
 * build` because next.config.mjs sets typescript.ignoreBuildErrors.
 *
 *  HOW TO DEMO:
 *
 *   1. Open Codira on the workspace. The first-steps card lands
 *      in the chat panel after the scanner runs.
 *   2. The card's `first_action` will mention these errors as the
 *      starting point for your tour.
 *   3. Either (a) follow the card's suggestion to fix them, or
 *      (b) delete this file entirely — both close the demo loop.
 *
 *  After the tour, you almost certainly want this file deleted in
 *  any forked version (it serves no other purpose).
 */

// ─── Error 1 — missing await ─────────────────────────────────────
//
// Plausible-looking helper intended to count queued items. The
// `await` is missing, so the Promise<number> return type can't
// be assigned to a `number` variable. Tsc reports:
//
//   Type 'Promise<number>' is not assignable to type 'number'.
//
// (We deliberately do NOT use @ts-expect-error here — that would
// suppress the diagnostic, and Codira's scanner needs to actually
// see it. The demo's value is in tsc emitting these errors.)

async function fetchQueuedCount(): Promise<number> {
  // In a real implementation, this would query an outbox table.
  return 0;
}

const _queuedCount: number = fetchQueuedCount();

// ─── Error 2 — wrong argument type ───────────────────────────────
//
// A pure utility function with strict types. Calling it with a
// string instead of a number is the kind of error tsc catches that
// a human reviewer often misses on fast-moving PRs. Tsc reports:
//
//   Argument of type 'string' is not assignable to parameter of
//   type 'number'.

function _sumPair(a: number, b: number): number {
  return a + b;
}

const _bogusSum = _sumPair(1, '2');

// ─── exports ──────────────────────────────────────────────────────
//
// Nothing real to export — the void usages below keep the names
// "used" so they aren't culled before tsc gets to flag the types.

export {};
void _queuedCount;
void _bogusSum;
