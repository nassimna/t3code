import type { ComposerInlineItem } from "@t3tools/contracts";

import { basenameOfPath } from "./vscode-icons";

export function getComposerInlineItemChipLabelText(
  inlineItem: Pick<ComposerInlineItem, "kind" | "name" | "path">,
): string {
  return inlineItem.kind === "skill" ? inlineItem.name : basenameOfPath(inlineItem.path);
}

export function getComposerInlineItemChipLabelClassName(
  inlineItem: Pick<ComposerInlineItem, "kind" | "name" | "path">,
): string {
  return inlineItem.kind === "skill"
    ? "max-w-full whitespace-nowrap select-none leading-tight"
    : "truncate select-none leading-tight";
}
