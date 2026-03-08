import { describe, expect, it } from "vitest";

import { listBackgroundCommands } from "./backgroundCommands";

describe("listBackgroundCommands", () => {
  it("keeps interruption records from newer turns when scanning older ones", () => {
    expect(
      listBackgroundCommands({
        threadId: "thread-1",
        turns: [
          {
            id: "turn-1",
            status: "completed",
            items: [
              {
                id: "cmd-1",
                type: "commandExecution",
                status: "inProgress",
                command: "sleep infinity",
              },
            ],
          },
          {
            id: "turn-2",
            status: "completed",
            interruptedCommandExecutionItemIds: ["cmd-1"],
            items: [],
          },
        ],
      }),
    ).toEqual([]);
  });

  it("applies interruption records from an in-progress latest turn", () => {
    expect(
      listBackgroundCommands({
        threadId: "thread-1",
        turns: [
          {
            id: "turn-1",
            status: "completed",
            items: [
              {
                id: "cmd-1",
                type: "commandExecution",
                status: "inProgress",
                command: "sleep infinity",
              },
            ],
          },
          {
            id: "turn-2",
            status: "inProgress",
            interruptedCommandExecutionItemIds: ["cmd-1"],
            items: [],
          },
        ],
      }),
    ).toEqual([]);
  });
});
