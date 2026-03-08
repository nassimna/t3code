import type { ComposerInlineItem } from "@t3tools/contracts";

function trimComposerSubmission(input: {
  text: string;
  inlineItems: ReadonlyArray<ComposerInlineItem>;
}): { text: string; inlineItems: ComposerInlineItem[] } {
  const text = input.text;
  const leadingTrimmedLength = text.length - text.trimStart().length;
  const trailingTrimmedLength = text.trimEnd().length;
  const trimmedText = text.slice(leadingTrimmedLength, trailingTrimmedLength);
  if (trimmedText.length === text.length) {
    return {
      text: trimmedText,
      inlineItems: input.inlineItems.map((item) => ({ ...item })),
    };
  }
  const trimmedInlineItems = input.inlineItems.flatMap((item) => {
    if (item.start < leadingTrimmedLength || item.end > trailingTrimmedLength) {
      return [];
    }
    return [
      {
        ...item,
        start: item.start - leadingTrimmedLength,
        end: item.end - leadingTrimmedLength,
      },
    ];
  });
  return {
    text: trimmedText,
    inlineItems: trimmedInlineItems,
  };
}

function stripSkillPrefixesFromSubmission(input: {
  text: string;
  inlineItems: ReadonlyArray<ComposerInlineItem>;
}): { text: string; inlineItems: ComposerInlineItem[] } {
  if (input.inlineItems.length === 0) {
    return {
      text: input.text,
      inlineItems: [],
    };
  }

  const nextTextParts: string[] = [];
  const nextInlineItems: ComposerInlineItem[] = [];
  let cursor = 0;
  let nextOffset = 0;

  for (const item of input.inlineItems) {
    const beforeText = input.text.slice(cursor, item.start);
    nextTextParts.push(beforeText);
    nextOffset += beforeText.length;

    const inlineText = input.text.slice(item.start, item.end);
    const normalizedInlineText =
      item.kind === "skill" && inlineText.startsWith("$") ? inlineText.slice(1) : inlineText;
    const nextStart = nextOffset;
    nextTextParts.push(normalizedInlineText);
    nextOffset += normalizedInlineText.length;
    nextInlineItems.push({
      ...item,
      start: nextStart,
      end: nextOffset,
    });
    cursor = item.end;
  }

  const trailingText = input.text.slice(cursor);
  nextTextParts.push(trailingText);

  return {
    text: nextTextParts.join(""),
    inlineItems: nextInlineItems,
  };
}

export function prepareComposerSubmissionForSend(input: {
  text: string;
  inlineItems: ReadonlyArray<ComposerInlineItem>;
}): { text: string; inlineItems: ComposerInlineItem[] } {
  const trimmed = trimComposerSubmission(input);
  return stripSkillPrefixesFromSubmission(trimmed);
}
