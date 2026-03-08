import { useSyncExternalStore } from "react";
import type { ResolvedAppearanceConfig } from "@t3tools/contracts";

export const DEFAULT_APPEARANCE: ResolvedAppearanceConfig = Object.freeze({
  uiFontFamily:
    '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  uiFontSizePx: 16,
  monoFontFamily: '"SF Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  terminalFontSizePx: 12,
});

let listeners: Array<() => void> = [];
let currentAppearance: ResolvedAppearanceConfig = DEFAULT_APPEARANCE;

function applyAppearanceToDom(appearance: ResolvedAppearanceConfig): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.style.setProperty("--app-font-sans", appearance.uiFontFamily);
  root.style.setProperty("--app-font-mono", appearance.monoFontFamily);
  root.style.setProperty("--app-root-font-size", `${appearance.uiFontSizePx}px`);
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function appearancesEqual(
  left: ResolvedAppearanceConfig,
  right: ResolvedAppearanceConfig,
): boolean {
  return (
    left.uiFontFamily === right.uiFontFamily &&
    left.uiFontSizePx === right.uiFontSizePx &&
    left.monoFontFamily === right.monoFontFamily &&
    left.terminalFontSizePx === right.terminalFontSizePx
  );
}

applyAppearanceToDom(DEFAULT_APPEARANCE);

export function setResolvedAppearance(appearance: ResolvedAppearanceConfig): void {
  if (appearancesEqual(currentAppearance, appearance)) {
    applyAppearanceToDom(appearance);
    return;
  }

  currentAppearance = appearance;
  applyAppearanceToDom(appearance);
  emitChange();
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

export function getResolvedAppearanceSnapshot(): ResolvedAppearanceConfig {
  return currentAppearance;
}

export function useResolvedAppearance(): ResolvedAppearanceConfig {
  return useSyncExternalStore(subscribe, getResolvedAppearanceSnapshot, () => DEFAULT_APPEARANCE);
}
