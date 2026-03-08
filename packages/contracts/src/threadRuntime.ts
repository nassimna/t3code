import { Schema } from "effect";
import { ProviderItemId, ThreadId, TrimmedNonEmptyString, TurnId } from "./baseSchemas";

export const ThreadBackgroundCommandSummary = Schema.Struct({
  id: ProviderItemId,
  turnId: TurnId,
  command: TrimmedNonEmptyString,
  cwd: Schema.NullOr(TrimmedNonEmptyString),
  processId: Schema.NullOr(Schema.Number),
  previewLine: Schema.NullOr(Schema.String),
});
export type ThreadBackgroundCommandSummary = typeof ThreadBackgroundCommandSummary.Type;

export const ThreadRuntimeReadInput = Schema.Struct({
  threadId: ThreadId,
});
export type ThreadRuntimeReadInput = typeof ThreadRuntimeReadInput.Type;

export const ThreadRuntimeReadResult = Schema.Struct({
  threadId: ThreadId,
  backgroundCommands: Schema.Array(ThreadBackgroundCommandSummary),
});
export type ThreadRuntimeReadResult = typeof ThreadRuntimeReadResult.Type;

export const ThreadRuntimeCleanBackgroundCommandsInput = Schema.Struct({
  threadId: ThreadId,
});
export type ThreadRuntimeCleanBackgroundCommandsInput =
  typeof ThreadRuntimeCleanBackgroundCommandsInput.Type;
