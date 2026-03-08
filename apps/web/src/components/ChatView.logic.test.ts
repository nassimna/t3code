import { describe, expect, it } from "vitest";

import {
  getComposerCommandItemLabelClassName,
  getComposerCommandItemLabelContainerClassName,
} from "./composerCommandItemDisplay";

describe("composer command item skill label classes", () => {
  it("keeps skill labels on a single line without truncating them", () => {
    expect(getComposerCommandItemLabelContainerClassName("skill")).toContain("whitespace-nowrap");
    expect(getComposerCommandItemLabelClassName("skill")).not.toContain("truncate");
    expect(getComposerCommandItemLabelClassName("skill")).toContain("whitespace-nowrap");
  });

  it("keeps non-skill labels on the existing truncation path", () => {
    expect(getComposerCommandItemLabelContainerClassName("path")).toContain("truncate");
    expect(getComposerCommandItemLabelClassName("path")).toContain("truncate");
  });
});
