import { describe, expect, it } from "vitest";

import {
  compareThreadsByLatestActivity,
  getThreadLatestActivityAt,
  hasUnseenCompletion,
  resolveThreadStatusPill,
} from "./Sidebar.logic";

function makeLatestTurn(overrides?: {
  completedAt?: string | null;
  startedAt?: string | null;
}): Parameters<typeof hasUnseenCompletion>[0]["latestTurn"] {
  return {
    turnId: "turn-1" as never,
    state: "completed",
    assistantMessageId: null,
    requestedAt: "2026-03-09T10:00:00.000Z",
    startedAt: overrides?.startedAt ?? "2026-03-09T10:00:00.000Z",
    completedAt: overrides?.completedAt ?? "2026-03-09T10:05:00.000Z",
  };
}

describe("hasUnseenCompletion", () => {
  it("returns true when a thread completed after its last visit", () => {
    expect(
      hasUnseenCompletion({
        interactionMode: "default",
        latestTurn: makeLatestTurn(),
        lastVisitedAt: "2026-03-09T10:04:00.000Z",
        proposedPlans: [],
        session: null,
      }),
    ).toBe(true);
  });
});

describe("compareThreadsByLatestActivity", () => {
  it("sorts threads by updatedAt before createdAt", () => {
    const threads = [
      {
        id: "thread-older-updated" as never,
        createdAt: "2026-03-09T10:05:00.000Z",
        updatedAt: "2026-03-09T10:06:00.000Z",
      },
      {
        id: "thread-latest-updated" as never,
        createdAt: "2026-03-09T10:00:00.000Z",
        updatedAt: "2026-03-09T10:10:00.000Z",
      },
    ];

    expect(threads.toSorted(compareThreadsByLatestActivity).map((thread) => thread.id)).toEqual([
      "thread-latest-updated",
      "thread-older-updated",
    ]);
  });

  it("falls back to createdAt and then id when updatedAt values tie", () => {
    const threads = [
      {
        id: "thread-a" as never,
        createdAt: "2026-03-09T10:00:00.000Z",
        updatedAt: "2026-03-09T10:05:00.000Z",
      },
      {
        id: "thread-c" as never,
        createdAt: "2026-03-09T10:00:00.000Z",
        updatedAt: "2026-03-09T10:05:00.000Z",
      },
      {
        id: "thread-b" as never,
        createdAt: "2026-03-09T10:04:00.000Z",
        updatedAt: "2026-03-09T10:05:00.000Z",
      },
    ];

    expect(threads.toSorted(compareThreadsByLatestActivity).map((thread) => thread.id)).toEqual([
      "thread-b",
      "thread-c",
      "thread-a",
    ]);
  });

  it("falls back to createdAt when updatedAt is invalid", () => {
    const threads = [
      {
        id: "thread-valid-updated" as never,
        createdAt: "2026-03-09T10:00:00.000Z",
        updatedAt: "2026-03-09T10:05:00.000Z",
      },
      {
        id: "thread-invalid-updated" as never,
        createdAt: "2026-03-09T10:06:00.000Z",
        updatedAt: "invalid",
      },
    ];

    expect(threads.toSorted(compareThreadsByLatestActivity).map((thread) => thread.id)).toEqual([
      "thread-invalid-updated",
      "thread-valid-updated",
    ]);
  });
});

describe("getThreadLatestActivityAt", () => {
  it("returns updatedAt when it is valid", () => {
    expect(
      getThreadLatestActivityAt({
        createdAt: "2026-03-09T10:00:00.000Z",
        updatedAt: "2026-03-09T10:05:00.000Z",
      }),
    ).toBe("2026-03-09T10:05:00.000Z");
  });

  it("falls back to createdAt when updatedAt is invalid", () => {
    expect(
      getThreadLatestActivityAt({
        createdAt: "2026-03-09T10:00:00.000Z",
        updatedAt: "invalid",
      }),
    ).toBe("2026-03-09T10:00:00.000Z");
  });
});

describe("resolveThreadStatusPill", () => {
  const baseThread = {
    interactionMode: "plan" as const,
    latestTurn: null,
    lastVisitedAt: undefined,
    proposedPlans: [],
    session: {
      provider: "codex" as const,
      status: "running" as const,
      createdAt: "2026-03-09T10:00:00.000Z",
      updatedAt: "2026-03-09T10:00:00.000Z",
      orchestrationStatus: "running" as const,
    },
  };

  it("shows pending approval before all other statuses", () => {
    expect(
      resolveThreadStatusPill({
        thread: baseThread,
        hasPendingApprovals: true,
        hasPendingUserInput: true,
      }),
    ).toMatchObject({ label: "Pending Approval", pulse: false });
  });

  it("shows awaiting input when plan mode is blocked on user answers", () => {
    expect(
      resolveThreadStatusPill({
        thread: baseThread,
        hasPendingApprovals: false,
        hasPendingUserInput: true,
      }),
    ).toMatchObject({ label: "Awaiting Input", pulse: false });
  });

  it("falls back to working when the thread is actively running without blockers", () => {
    expect(
      resolveThreadStatusPill({
        thread: baseThread,
        hasPendingApprovals: false,
        hasPendingUserInput: false,
      }),
    ).toMatchObject({ label: "Working", pulse: true });
  });

  it("shows plan ready when a settled plan turn has a proposed plan ready for follow-up", () => {
    expect(
      resolveThreadStatusPill({
        thread: {
          ...baseThread,
          latestTurn: makeLatestTurn(),
          proposedPlans: [
            {
              id: "plan-1" as never,
              turnId: "turn-1" as never,
              createdAt: "2026-03-09T10:00:00.000Z",
              updatedAt: "2026-03-09T10:05:00.000Z",
              planMarkdown: "# Plan",
            },
          ],
          session: {
            ...baseThread.session,
            status: "ready",
            orchestrationStatus: "ready",
          },
        },
        hasPendingApprovals: false,
        hasPendingUserInput: false,
      }),
    ).toMatchObject({ label: "Plan Ready", pulse: false });
  });

  it("shows completed when there is an unseen completion and no active blocker", () => {
    expect(
      resolveThreadStatusPill({
        thread: {
          ...baseThread,
          interactionMode: "default",
          latestTurn: makeLatestTurn(),
          lastVisitedAt: "2026-03-09T10:04:00.000Z",
          session: {
            ...baseThread.session,
            status: "ready",
            orchestrationStatus: "ready",
          },
        },
        hasPendingApprovals: false,
        hasPendingUserInput: false,
      }),
    ).toMatchObject({ label: "Completed", pulse: false });
  });
});
