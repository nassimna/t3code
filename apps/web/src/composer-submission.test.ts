import { describe, expect, it } from "vitest";

import { prepareComposerSubmissionForSend } from "./composer-submission";

describe("prepareComposerSubmissionForSend", () => {
  it("trims whitespace while preserving inline item offsets", () => {
    expect(
      prepareComposerSubmissionForSend({
        text: "  @src/app.ts  ",
        inlineItems: [
          {
            kind: "mention",
            name: "src/app.ts",
            path: "src/app.ts",
            start: 2,
            end: 13,
          },
        ],
      }),
    ).toEqual({
      text: "@src/app.ts",
      inlineItems: [
        {
          kind: "mention",
          name: "src/app.ts",
          path: "src/app.ts",
          start: 0,
          end: 11,
        },
      ],
    });
  });

  it("removes the dollar prefix from outgoing skill text while preserving the skill item", () => {
    expect(
      prepareComposerSubmissionForSend({
        text: "Run $dogfood now",
        inlineItems: [
          {
            kind: "skill",
            name: "dogfood",
            path: "/skills/dogfood",
            start: 4,
            end: 13,
          },
        ],
      }),
    ).toEqual({
      text: "Run dogfood now",
      inlineItems: [
        {
          kind: "skill",
          name: "dogfood",
          path: "/skills/dogfood",
          start: 4,
          end: 12,
        },
      ],
    });
  });

  it("recomputes offsets when multiple skill prefixes are removed", () => {
    expect(
      prepareComposerSubmissionForSend({
        text: "$dogfood and $feature-dev",
        inlineItems: [
          {
            kind: "skill",
            name: "dogfood",
            path: "/skills/dogfood",
            start: 0,
            end: 8,
          },
          {
            kind: "skill",
            name: "feature-dev",
            path: "/skills/feature-dev",
            start: 13,
            end: 25,
          },
        ],
      }),
    ).toEqual({
      text: "dogfood and feature-dev",
      inlineItems: [
        {
          kind: "skill",
          name: "dogfood",
          path: "/skills/dogfood",
          start: 0,
          end: 7,
        },
        {
          kind: "skill",
          name: "feature-dev",
          path: "/skills/feature-dev",
          start: 12,
          end: 23,
        },
      ],
    });
  });
});
