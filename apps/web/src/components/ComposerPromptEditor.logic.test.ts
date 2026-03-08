import { describe, expect, it } from "vitest";

import {
  getComposerInlineItemChipLabelClassName,
  getComposerInlineItemChipLabelText,
} from "../composer-inline-item-display";

describe("getComposerInlineItemChipLabelText", () => {
  it("omits the dollar prefix for visible skill chip labels", () => {
    expect(
      getComposerInlineItemChipLabelText({
        kind: "skill",
        name: "very-long-skill-name",
        path: "/skills/very-long-skill-name",
      }),
    ).toBe("very-long-skill-name");
  });

  it("keeps mention chip labels unchanged", () => {
    expect(
      getComposerInlineItemChipLabelText({
        kind: "mention",
        name: "src/lib/example.ts",
        path: "src/lib/example.ts",
      }),
    ).toBe("example.ts");
  });
});

describe("getComposerInlineItemChipLabelClassName", () => {
  it("keeps skill chip labels on a single line without truncation", () => {
    const className = getComposerInlineItemChipLabelClassName({
      kind: "skill",
      name: "very-long-skill-name",
      path: "/skills/very-long-skill-name",
    });

    expect(className).not.toContain("truncate");
    expect(className).toContain("whitespace-nowrap");
  });

  it("keeps mention chip truncation behavior unchanged", () => {
    expect(
      getComposerInlineItemChipLabelClassName({
        kind: "mention",
        name: "src/lib/example.ts",
        path: "src/lib/example.ts",
      }),
    ).toContain("truncate");
  });
});
