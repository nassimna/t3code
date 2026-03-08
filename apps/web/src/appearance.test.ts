import { describe, expect, it } from "vitest";

import {
  DEFAULT_APPEARANCE,
  getResolvedAppearanceSnapshot,
  setResolvedAppearance,
} from "./appearance";

describe("appearance runtime", () => {
  it("starts with the bundled default appearance", () => {
    expect(getResolvedAppearanceSnapshot()).toEqual(DEFAULT_APPEARANCE);
  });

  it("updates the in-memory snapshot when resolved appearance changes", () => {
    const nextAppearance = {
      ...DEFAULT_APPEARANCE,
      uiFontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      uiFontSizePx: 18,
    };

    setResolvedAppearance(nextAppearance);
    expect(getResolvedAppearanceSnapshot()).toEqual(nextAppearance);

    setResolvedAppearance(DEFAULT_APPEARANCE);
  });
});
