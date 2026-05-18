/**
 * CODIRA_DEMO: ⌘K Composer extraction target (Hook 4)
 *
 * This component renders three near-identical metric cells: Open
 * feedback / Tasks in progress / Completed this week. Each cell
 * is a hand-pasted block with only the label, value, icon, and
 * color differing — a textbook case where extracting a single
 * `MetricCell` component would cut the file from ~100 lines to
 * ~50.
 *
 *  HOW TO DEMO:
 *
 *  1. Open this file in Codira.
 *  2. Select all three `<div className="flex flex-col rounded-lg ...">`
 *     blocks below (lines ~36 through ~78 — the visual repetition
 *     makes the selection easy).
 *  3. Press ⌘K to open Composer.
 *  4. Paste this prompt:
 *
 *       Extract these three cells into a single MetricCell component
 *       in this file. The cell takes `label`, `value`, `Icon`, and
 *       `iconColor` props. Replace the inline blocks with calls to it.
 *
 *  5. Optional: toggle Full Review ON to run the reviewer + security +
 *     QA agents alongside the implementer.
 *  6. Approve. Watch the patch land.
 *
 *  The deletion guard catches any case where the implementer drops a
 *  metric instead of extracting it. The grounding guard catches any
 *  case where it references fields that aren't actually defined here.
 *
 *  Once you've finished the tour, run /qa write tests for the new
 *  MetricCell — closes the loop on the same workflow with a different
 *  agent.
 */

import { MessageSquare, Clock, CheckCircle } from 'lucide-react';

export function MetricBar({
  openFeedback,
  tasksInProgress,
  completedThisWeek,
}: {
  openFeedback: number;
  tasksInProgress: number;
  completedThisWeek: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* — cell 1 — Open feedback ———————————————————————————— */}
      <div className="flex flex-col rounded-lg border border-edge bg-bg-1 p-4">
        <div className="mb-1 flex items-center gap-1.5">
          <MessageSquare size={14} className="text-amber-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
            Open feedback
          </span>
        </div>
        <div className="text-2xl font-semibold text-ink-0">{openFeedback}</div>
        <div className="mt-0.5 text-xs text-ink-2">
          awaiting your team's response
        </div>
      </div>

      {/* — cell 2 — In progress ——————————————————————————————— */}
      <div className="flex flex-col rounded-lg border border-edge bg-bg-1 p-4">
        <div className="mb-1 flex items-center gap-1.5">
          <Clock size={14} className="text-blue-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
            In progress
          </span>
        </div>
        <div className="text-2xl font-semibold text-ink-0">{tasksInProgress}</div>
        <div className="mt-0.5 text-xs text-ink-2">
          tasks the team is working on now
        </div>
      </div>

      {/* — cell 3 — Completed this week ——————————————————————— */}
      <div className="flex flex-col rounded-lg border border-edge bg-bg-1 p-4">
        <div className="mb-1 flex items-center gap-1.5">
          <CheckCircle size={14} className="text-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
            Completed
          </span>
        </div>
        <div className="text-2xl font-semibold text-ink-0">{completedThisWeek}</div>
        <div className="mt-0.5 text-xs text-ink-2">
          tasks finished in the last 7 days
        </div>
      </div>
    </div>
  );
}
