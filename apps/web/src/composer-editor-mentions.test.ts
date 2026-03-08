import { describe, expect, it } from "vitest";

import { splitPromptIntoComposerSegments } from "./composer-editor-mentions";

describe("splitPromptIntoComposerSegments", () => {
  it("splits structured mention items into inline item segments", () => {
    expect(
      splitPromptIntoComposerSegments("Inspect @AGENTS.md please", [
        {
          kind: "mention",
          name: "AGENTS.md",
          path: "AGENTS.md",
          start: "Inspect ".length,
          end: "Inspect @AGENTS.md".length,
        },
      ]),
    ).toEqual([
      { type: "text", text: "Inspect " },
      {
        type: "inline-item",
        inlineItem: {
          kind: "mention",
          name: "AGENTS.md",
          path: "AGENTS.md",
          start: "Inspect ".length,
          end: "Inspect @AGENTS.md".length,
        },
        text: "@AGENTS.md",
      },
      { type: "text", text: " please" },
    ]);
  });

  it("does not convert plain text without structured inline items", () => {
    expect(splitPromptIntoComposerSegments("Inspect @AGENTS.md", [])).toEqual([
      { type: "text", text: "Inspect @AGENTS.md" },
    ]);
  });

  it("keeps newlines around structured inline items", () => {
    expect(
      splitPromptIntoComposerSegments("one\n@src/index.ts \ntwo", [
        {
          kind: "mention",
          name: "src/index.ts",
          path: "src/index.ts",
          start: 4,
          end: "one\n@src/index.ts".length,
        },
      ]),
    ).toEqual([
      { type: "text", text: "one\n" },
      {
        type: "inline-item",
        inlineItem: {
          kind: "mention",
          name: "src/index.ts",
          path: "src/index.ts",
          start: 4,
          end: "one\n@src/index.ts".length,
        },
        text: "@src/index.ts",
      },
      { type: "text", text: " \ntwo" },
    ]);
  });
});
