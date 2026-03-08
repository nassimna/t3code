import { Schema } from "effect";
import { AppearanceConfigIssue, ResolvedAppearanceConfig } from "./appearance";
import { IsoDateTime, TrimmedNonEmptyString } from "./baseSchemas";
import { KeybindingRule, ResolvedKeybindingsConfig } from "./keybindings";
import { EditorId } from "./editor";
import { ProviderKind } from "./orchestration";

export const KeybindingsMalformedConfigIssue = Schema.Struct({
  kind: Schema.Literal("keybindings.malformed-config"),
  message: TrimmedNonEmptyString,
});

export const KeybindingsInvalidEntryIssue = Schema.Struct({
  kind: Schema.Literal("keybindings.invalid-entry"),
  message: TrimmedNonEmptyString,
  index: Schema.Number,
});

export const KeybindingsConfigIssue = Schema.Union([
  KeybindingsMalformedConfigIssue,
  KeybindingsInvalidEntryIssue,
]);
export type KeybindingsConfigIssue = typeof KeybindingsConfigIssue.Type;
export const ServerConfigIssue = KeybindingsConfigIssue;
export type ServerConfigIssue = KeybindingsConfigIssue;

const KeybindingsConfigIssues = Schema.Array(KeybindingsConfigIssue);
const AppearanceConfigIssues = Schema.Array(AppearanceConfigIssue);
export const ServerConfigSection = Schema.Literals(["keybindings", "appearance"]);
export type ServerConfigSection = typeof ServerConfigSection.Type;

export const ServerProviderStatusState = Schema.Literals(["ready", "warning", "error"]);
export type ServerProviderStatusState = typeof ServerProviderStatusState.Type;

export const ServerProviderAuthStatus = Schema.Literals([
  "authenticated",
  "unauthenticated",
  "unknown",
]);
export type ServerProviderAuthStatus = typeof ServerProviderAuthStatus.Type;

export const ServerProviderStatus = Schema.Struct({
  provider: ProviderKind,
  status: ServerProviderStatusState,
  available: Schema.Boolean,
  authStatus: ServerProviderAuthStatus,
  checkedAt: IsoDateTime,
  message: Schema.optional(TrimmedNonEmptyString),
});
export type ServerProviderStatus = typeof ServerProviderStatus.Type;

const ServerProviderStatuses = Schema.Array(ServerProviderStatus);

export const ServerConfig = Schema.Struct({
  cwd: TrimmedNonEmptyString,
  keybindingsConfigPath: TrimmedNonEmptyString,
  appearanceConfigPath: TrimmedNonEmptyString,
  keybindings: ResolvedKeybindingsConfig,
  appearance: ResolvedAppearanceConfig,
  keybindingsIssues: KeybindingsConfigIssues,
  appearanceIssues: AppearanceConfigIssues,
  providers: ServerProviderStatuses,
  availableEditors: Schema.Array(EditorId),
});
export type ServerConfig = typeof ServerConfig.Type;

export const ServerUpsertKeybindingInput = KeybindingRule;
export type ServerUpsertKeybindingInput = typeof ServerUpsertKeybindingInput.Type;

export const ServerUpsertKeybindingResult = Schema.Struct({
  keybindings: ResolvedKeybindingsConfig,
  keybindingsIssues: KeybindingsConfigIssues,
});
export type ServerUpsertKeybindingResult = typeof ServerUpsertKeybindingResult.Type;

export const ServerConfigUpdatedPayload = Schema.Struct({
  changedSections: Schema.Array(ServerConfigSection),
  keybindingsIssues: KeybindingsConfigIssues,
  appearanceIssues: AppearanceConfigIssues,
  providers: ServerProviderStatuses,
});
export type ServerConfigUpdatedPayload = typeof ServerConfigUpdatedPayload.Type;
