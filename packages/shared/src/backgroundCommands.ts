import type { ProviderItemId, ThreadId, TurnId } from "@t3tools/contracts";

export interface BackgroundCommandTurnSnapshot {
  readonly id: TurnId | string;
  readonly status?: string | null;
  readonly interruptedCommandExecutionItemIds?: ReadonlyArray<ProviderItemId | string>;
  readonly items: ReadonlyArray<unknown>;
}

export interface BackgroundCommandThreadSnapshot {
  readonly threadId: ThreadId | string;
  readonly turns: ReadonlyArray<BackgroundCommandTurnSnapshot>;
}

export interface BackgroundCommandSummary {
  readonly id: ProviderItemId | string;
  readonly turnId: TurnId | string;
  readonly command: string;
  readonly cwd: string | null;
  readonly processId: number | null;
  readonly previewLine: string | null;
}

export interface MergeableBackgroundCommandSummary extends BackgroundCommandSummary {}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function previewLineFromOutput(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  const lines = value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.at(-1) ?? null;
}

function isRunningBackgroundCommandItem(item: unknown): item is Record<string, unknown> {
  const record = asObject(item);
  return record?.type === "commandExecution" && record.status === "inProgress";
}

export function listBackgroundCommands(
  snapshot: BackgroundCommandThreadSnapshot | null | undefined,
): ReadonlyArray<BackgroundCommandSummary> {
  if (!snapshot || snapshot.turns.length === 0) {
    return [];
  }

  const runningCommands: BackgroundCommandSummary[] = [];
  const lastTurnIndex = snapshot.turns.length - 1;

  for (let turnIndex = lastTurnIndex; turnIndex >= 0; turnIndex -= 1) {
    const turn = snapshot.turns[turnIndex];
    if (!turn || (turnIndex === lastTurnIndex && turn.status === "inProgress")) {
      continue;
    }

    const interruptedIds = new Set(
      (turn.interruptedCommandExecutionItemIds ?? []).map((itemId) => String(itemId)),
    );

    for (const item of turn.items) {
      if (!isRunningBackgroundCommandItem(item)) {
        continue;
      }

      const id = asString(item.id);
      if (!id || interruptedIds.has(id)) {
        continue;
      }

      runningCommands.push({
        id,
        turnId: turn.id,
        command: asString(item.command) ?? "Command",
        cwd: asString(item.cwd),
        processId: asNumber(item.processId),
        previewLine: previewLineFromOutput(item.aggregatedOutput),
      });
    }
  }

  return runningCommands;
}

export function mergeBackgroundCommands<T extends MergeableBackgroundCommandSummary>(
  snapshotCommands: ReadonlyArray<T>,
  runtimeCommands: ReadonlyArray<T>,
): ReadonlyArray<T> {
  if (snapshotCommands.length === 0) {
    return runtimeCommands;
  }
  if (runtimeCommands.length === 0) {
    return snapshotCommands;
  }

  const snapshotById = new Map(snapshotCommands.map((command) => [String(command.id), command]));
  const merged: T[] = [];
  const seenIds = new Set<string>();

  for (const runtimeCommand of runtimeCommands) {
    const key = String(runtimeCommand.id);
    const snapshotCommand = snapshotById.get(key);
    seenIds.add(key);
    if (!snapshotCommand) {
      merged.push(runtimeCommand);
      continue;
    }
    merged.push({
      ...snapshotCommand,
      ...runtimeCommand,
      command: runtimeCommand.command || snapshotCommand.command,
      cwd: runtimeCommand.cwd ?? snapshotCommand.cwd,
      processId: runtimeCommand.processId ?? snapshotCommand.processId,
      previewLine: runtimeCommand.previewLine ?? snapshotCommand.previewLine,
    });
  }

  for (const snapshotCommand of snapshotCommands) {
    if (seenIds.has(String(snapshotCommand.id))) {
      continue;
    }
    merged.push(snapshotCommand);
  }

  return merged;
}
