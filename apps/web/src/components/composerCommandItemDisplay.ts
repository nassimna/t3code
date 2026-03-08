export function getComposerCommandItemLabelContainerClassName(
  itemType: "path" | "skill" | "slash-command" | "model",
): string {
  return itemType === "skill"
    ? "flex shrink-0 items-center gap-1.5 whitespace-nowrap"
    : "flex min-w-0 items-center gap-1.5 truncate";
}

export function getComposerCommandItemLabelClassName(
  itemType: "path" | "skill" | "slash-command" | "model",
): string {
  return itemType === "skill" ? "whitespace-nowrap" : "truncate";
}
