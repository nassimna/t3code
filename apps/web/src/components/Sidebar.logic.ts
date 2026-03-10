import type { Thread } from "../types";
import { findLatestProposedPlan, isLatestTurnSettled } from "../session-logic";

export interface ThreadStatusPill {
  label:
    | "Working"
    | "Connecting"
    | "Completed"
    | "Pending Approval"
    | "Awaiting Input"
    | "Plan Ready";
  colorClass: string;
  dotClass: string;
  pulse: boolean;
}

type ThreadStatusInput = Pick<
  Thread,
  "interactionMode" | "latestTurn" | "lastVisitedAt" | "proposedPlans" | "session"
>;

function parseThreadTimestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getThreadLatestActivityAt(thread: Pick<Thread, "createdAt" | "updatedAt">): string {
  return parseThreadTimestamp(thread.updatedAt) === null ? thread.createdAt : thread.updatedAt;
}

function getThreadLatestActivityTimestamp(
  thread: Pick<Thread, "createdAt" | "updatedAt">,
): number | null {
  const updatedAt = parseThreadTimestamp(thread.updatedAt);
  if (updatedAt !== null) {
    return updatedAt;
  }
  return parseThreadTimestamp(thread.createdAt);
}

export function compareThreadsByLatestActivity(
  left: Pick<Thread, "id" | "createdAt" | "updatedAt">,
  right: Pick<Thread, "id" | "createdAt" | "updatedAt">,
): number {
  const leftLatestActivityAt = getThreadLatestActivityTimestamp(left);
  const rightLatestActivityAt = getThreadLatestActivityTimestamp(right);
  if (
    leftLatestActivityAt !== null &&
    rightLatestActivityAt !== null &&
    leftLatestActivityAt !== rightLatestActivityAt
  ) {
    return rightLatestActivityAt - leftLatestActivityAt;
  }
  if (leftLatestActivityAt !== rightLatestActivityAt) {
    return rightLatestActivityAt === null ? -1 : 1;
  }

  const leftCreatedAt = parseThreadTimestamp(left.createdAt);
  const rightCreatedAt = parseThreadTimestamp(right.createdAt);
  if (leftCreatedAt !== null && rightCreatedAt !== null && leftCreatedAt !== rightCreatedAt) {
    return rightCreatedAt - leftCreatedAt;
  }
  if (leftCreatedAt !== rightCreatedAt) {
    return rightCreatedAt === null ? -1 : 1;
  }

  return right.id.localeCompare(left.id);
}

export function hasUnseenCompletion(thread: ThreadStatusInput): boolean {
  if (!thread.latestTurn?.completedAt) return false;
  const completedAt = Date.parse(thread.latestTurn.completedAt);
  if (Number.isNaN(completedAt)) return false;
  if (!thread.lastVisitedAt) return true;

  const lastVisitedAt = Date.parse(thread.lastVisitedAt);
  if (Number.isNaN(lastVisitedAt)) return true;
  return completedAt > lastVisitedAt;
}

export function resolveThreadStatusPill(input: {
  thread: ThreadStatusInput;
  hasPendingApprovals: boolean;
  hasPendingUserInput: boolean;
}): ThreadStatusPill | null {
  const { hasPendingApprovals, hasPendingUserInput, thread } = input;

  if (hasPendingApprovals) {
    return {
      label: "Pending Approval",
      colorClass: "text-amber-600 dark:text-amber-300/90",
      dotClass: "bg-amber-500 dark:bg-amber-300/90",
      pulse: false,
    };
  }

  if (hasPendingUserInput) {
    return {
      label: "Awaiting Input",
      colorClass: "text-indigo-600 dark:text-indigo-300/90",
      dotClass: "bg-indigo-500 dark:bg-indigo-300/90",
      pulse: false,
    };
  }

  if (thread.session?.status === "running") {
    return {
      label: "Working",
      colorClass: "text-sky-600 dark:text-sky-300/80",
      dotClass: "bg-sky-500 dark:bg-sky-300/80",
      pulse: true,
    };
  }

  if (thread.session?.status === "connecting") {
    return {
      label: "Connecting",
      colorClass: "text-sky-600 dark:text-sky-300/80",
      dotClass: "bg-sky-500 dark:bg-sky-300/80",
      pulse: true,
    };
  }

  const hasPlanReadyPrompt =
    !hasPendingUserInput &&
    thread.interactionMode === "plan" &&
    isLatestTurnSettled(thread.latestTurn, thread.session) &&
    findLatestProposedPlan(thread.proposedPlans, thread.latestTurn?.turnId ?? null) !== null;
  if (hasPlanReadyPrompt) {
    return {
      label: "Plan Ready",
      colorClass: "text-violet-600 dark:text-violet-300/90",
      dotClass: "bg-violet-500 dark:bg-violet-300/90",
      pulse: false,
    };
  }

  if (hasUnseenCompletion(thread)) {
    return {
      label: "Completed",
      colorClass: "text-emerald-600 dark:text-emerald-300/90",
      dotClass: "bg-emerald-500 dark:bg-emerald-300/90",
      pulse: false,
    };
  }

  return null;
}
