import type { ComposerInlineItem, ComposerInlineItemKind } from "@t3tools/contracts";

export type ComposerPromptSegment =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "inline-item";
      inlineItem: ComposerInlineItem;
      text: string;
    };

function pushTextSegment(segments: ComposerPromptSegment[], text: string): void {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last && last.type === "text") {
    last.text += text;
    return;
  }
  segments.push({ type: "text", text });
}

export function inlineItemDisplayText(
  inlineItem: Pick<ComposerInlineItem, "kind" | "name" | "path">,
): string {
  return inlineItem.kind === "skill" ? `$${inlineItem.name}` : `@${inlineItem.path}`;
}

export function normalizeComposerInlineItems(
  prompt: string,
  inlineItems: ReadonlyArray<ComposerInlineItem> | undefined,
): ComposerInlineItem[] {
  if (!inlineItems || inlineItems.length === 0) {
    return [];
  }

  const normalized = inlineItems
    .filter((item) => item.start >= 0 && item.end > item.start && item.end <= prompt.length)
    .map((item) => ({
      kind: item.kind,
      name: item.name,
      path: item.path,
      start: item.start,
      end: item.end,
    }))
    .toSorted((left, right) => left.start - right.start || right.end - left.end);
  const deduped: ComposerInlineItem[] = [];
  let previousEnd = -1;
  for (const inlineItem of normalized) {
    const displayText = inlineItemDisplayText(inlineItem);
    if (prompt.slice(inlineItem.start, inlineItem.end) !== displayText) {
      continue;
    }
    if (inlineItem.start < previousEnd) {
      continue;
    }
    deduped.push(inlineItem);
    previousEnd = inlineItem.end;
  }
  return deduped;
}

export function splitPromptIntoComposerSegments(
  prompt: string,
  inlineItems: ReadonlyArray<ComposerInlineItem> | undefined,
): ComposerPromptSegment[] {
  const normalizedInlineItems = normalizeComposerInlineItems(prompt, inlineItems);
  const segments: ComposerPromptSegment[] = [];
  if (prompt.length === 0) {
    return segments;
  }

  let cursor = 0;
  for (const inlineItem of normalizedInlineItems) {
    if (inlineItem.start > cursor) {
      pushTextSegment(segments, prompt.slice(cursor, inlineItem.start));
    }
    segments.push({
      type: "inline-item",
      inlineItem,
      text: prompt.slice(inlineItem.start, inlineItem.end),
    });
    cursor = inlineItem.end;
  }

  if (cursor < prompt.length) {
    pushTextSegment(segments, prompt.slice(cursor));
  }

  return segments;
}

export function buildComposerInlineItem(
  kind: ComposerInlineItemKind,
  input: { name: string; path: string; start: number; end: number },
): ComposerInlineItem {
  return {
    kind,
    name: input.name,
    path: input.path,
    start: input.start,
    end: input.end,
  };
}
