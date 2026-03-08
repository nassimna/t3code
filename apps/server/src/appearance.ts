import {
  AppearanceConfig,
  type AppearanceConfigField,
  type AppearanceConfigIssue,
  type ResolvedAppearanceConfig,
  type ServerConfigSection,
} from "@t3tools/contracts";
import {
  Cache,
  Cause,
  Effect,
  FileSystem,
  Layer,
  Path,
  PubSub,
  Schema,
  ServiceMap,
  Stream,
} from "effect";
import * as Semaphore from "effect/Semaphore";
import { Mutable } from "effect/Types";
import { ServerConfig } from "./config";

export const DEFAULT_APPEARANCE_CONFIG: ResolvedAppearanceConfig = {
  uiFontFamily:
    '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  uiFontSizePx: 16,
  monoFontFamily: '"SF Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  terminalFontSizePx: 12,
};

export class AppearanceConfigError extends Schema.TaggedErrorClass<AppearanceConfigError>()(
  "AppearanceConfigError",
  {
    configPath: Schema.String,
    detail: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  override get message(): string {
    return `Unable to parse appearance config at ${this.configPath}: ${this.detail}`;
  }
}

type AppearanceConfigInput = Partial<Record<AppearanceConfigField, unknown>>;
const appearanceFieldSchemas = {
  uiFontFamily: AppearanceConfig.fields.uiFontFamily,
  uiFontSizePx: AppearanceConfig.fields.uiFontSizePx,
  monoFontFamily: AppearanceConfig.fields.monoFontFamily,
  terminalFontSizePx: AppearanceConfig.fields.terminalFontSizePx,
} as const;

export interface AppearanceConfigState {
  readonly appearance: ResolvedAppearanceConfig;
  readonly issues: readonly AppearanceConfigIssue[];
}

export interface AppearanceChangeEvent {
  readonly changedSections: readonly ServerConfigSection[];
  readonly issues: readonly AppearanceConfigIssue[];
}

export interface AppearanceShape {
  readonly syncDefaultAppearanceOnStartup: Effect.Effect<void, AppearanceConfigError>;
  readonly loadConfigState: Effect.Effect<AppearanceConfigState, AppearanceConfigError>;
  readonly changes: Stream.Stream<AppearanceChangeEvent>;
}

export class Appearance extends ServiceMap.Service<Appearance, AppearanceShape>()("t3/appearance") {}

function trimIssueMessage(message: string): string {
  const trimmed = message.trim();
  return trimmed.length > 0 ? trimmed : "Invalid appearance configuration.";
}

function malformedConfigIssue(detail: string): AppearanceConfigIssue {
  return {
    kind: "appearance.malformed-config",
    message: trimIssueMessage(detail),
  };
}

function invalidValueIssue(field: AppearanceConfigField, detail: string): AppearanceConfigIssue {
  return {
    kind: "appearance.invalid-value",
    field,
    message: trimIssueMessage(detail),
  };
}

function decodeAppearanceField<K extends AppearanceConfigField>(
  field: K,
  value: unknown,
): ResolvedAppearanceConfig[K] | AppearanceConfigIssue {
  const schema = appearanceFieldSchemas[field];
  const decoded = Schema.decodeUnknownExit(schema)(value);
  if (decoded._tag === "Failure") {
    return invalidValueIssue(field, Cause.pretty(decoded.cause));
  }
  return decoded.value as ResolvedAppearanceConfig[K];
}

function resolveAppearanceConfig(input: AppearanceConfigInput): AppearanceConfigState {
  const issues: AppearanceConfigIssue[] = [];
  const appearance: Mutable<ResolvedAppearanceConfig> = { ...DEFAULT_APPEARANCE_CONFIG };

  for (const field of Object.keys(DEFAULT_APPEARANCE_CONFIG) as AppearanceConfigField[]) {
    if (!(field in input)) {
      continue;
    }

    switch (field) {
      case "uiFontFamily": {
        const result = decodeAppearanceField("uiFontFamily", input[field]);
        if (typeof result === "object" && result !== null && "kind" in result) {
          issues.push(result);
          continue;
        }
        appearance.uiFontFamily = result;
        break;
      }
      case "uiFontSizePx": {
        const result = decodeAppearanceField("uiFontSizePx", input[field]);
        if (typeof result === "object" && result !== null && "kind" in result) {
          issues.push(result);
          continue;
        }
        appearance.uiFontSizePx = result;
        break;
      }
      case "monoFontFamily": {
        const result = decodeAppearanceField("monoFontFamily", input[field]);
        if (typeof result === "object" && result !== null && "kind" in result) {
          issues.push(result);
          continue;
        }
        appearance.monoFontFamily = result;
        break;
      }
      case "terminalFontSizePx": {
        const result = decodeAppearanceField("terminalFontSizePx", input[field]);
        if (typeof result === "object" && result !== null && "kind" in result) {
          issues.push(result);
          continue;
        }
        appearance.terminalFontSizePx = result;
        break;
      }
    }
  }

  return { appearance, issues };
}

const makeAppearance = Effect.gen(function* () {
  const { appearanceConfigPath } = yield* ServerConfig;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const revalidateSemaphore = yield* Semaphore.make(1);
  const resolvedConfigCacheKey = "resolved" as const;
  const changesPubSub = yield* PubSub.unbounded<AppearanceChangeEvent>();

  const emitChange = (issues: readonly AppearanceConfigIssue[]) =>
    PubSub.publish(changesPubSub, {
      changedSections: ["appearance"],
      issues,
    }).pipe(Effect.asVoid);

  const readConfigExists = fs.exists(appearanceConfigPath).pipe(
    Effect.mapError(
      (cause) =>
        new AppearanceConfigError({
          configPath: appearanceConfigPath,
          detail: "failed to access appearance config",
          cause,
        }),
    ),
  );

  const readRawConfig = fs.readFileString(appearanceConfigPath).pipe(
    Effect.mapError(
      (cause) =>
        new AppearanceConfigError({
          configPath: appearanceConfigPath,
          detail: "failed to read appearance config",
          cause,
        }),
    ),
  );

  const writeConfigAtomically = (config: ResolvedAppearanceConfig) => {
    const tempPath = `${appearanceConfigPath}.${process.pid}.${Date.now()}.tmp`;

    return Schema.encodeEffect(AppearanceConfig)(config).pipe(
      Effect.map((encoded) => `${JSON.stringify(encoded, null, 2)}\n`),
      Effect.tap(() => fs.makeDirectory(path.dirname(appearanceConfigPath), { recursive: true })),
      Effect.tap((encoded) => fs.writeFileString(tempPath, encoded)),
      Effect.flatMap(() => fs.rename(tempPath, appearanceConfigPath)),
      Effect.mapError(
        (cause) =>
          new AppearanceConfigError({
            configPath: appearanceConfigPath,
            detail: "failed to write appearance config",
            cause,
          }),
      ),
    );
  };

  const loadConfigStateFromDisk = Effect.gen(function* () {
    if (!(yield* readConfigExists)) {
      return { appearance: DEFAULT_APPEARANCE_CONFIG, issues: [] };
    }

    const rawConfig = yield* readRawConfig;
    const decoded = yield* Effect.try({
      try: () => JSON.parse(rawConfig) as unknown,
      catch: (cause) =>
        new AppearanceConfigError({
          configPath: appearanceConfigPath,
          detail: `expected JSON object (${String(cause)})`,
          cause,
        }),
    }).pipe(Effect.exit);
    if (decoded._tag === "Failure") {
      return {
        appearance: DEFAULT_APPEARANCE_CONFIG,
        issues: [malformedConfigIssue(messageFromCause(decoded.cause))],
      };
    }

    if (typeof decoded.value !== "object" || decoded.value === null || Array.isArray(decoded.value)) {
      return {
        appearance: DEFAULT_APPEARANCE_CONFIG,
        issues: [malformedConfigIssue("Expected a JSON object.")],
      };
    }

    return resolveAppearanceConfig(decoded.value as AppearanceConfigInput);
  });

  const resolvedConfigCache = yield* Cache.make<
    typeof resolvedConfigCacheKey,
    AppearanceConfigState,
    AppearanceConfigError
  >({
    capacity: 1,
    lookup: () => loadConfigStateFromDisk,
  });

  const loadConfigStateFromCacheOrDisk = Cache.get(resolvedConfigCache, resolvedConfigCacheKey);

  const revalidateAndEmit = revalidateSemaphore.withPermits(1)(
    Effect.gen(function* () {
      yield* Cache.invalidate(resolvedConfigCache, resolvedConfigCacheKey);
      const configState = yield* loadConfigStateFromCacheOrDisk;
      yield* emitChange(configState.issues);
    }),
  );

  const appearanceConfigDir = path.dirname(appearanceConfigPath);
  const appearanceConfigFile = path.basename(appearanceConfigPath);
  const appearanceConfigPathResolved = path.resolve(appearanceConfigPath);
  yield* fs.makeDirectory(appearanceConfigDir, { recursive: true }).pipe(
    Effect.orElseSucceed(() => undefined),
  );
  yield* Stream.runForEach(fs.watch(appearanceConfigDir), (event) => {
    const isTargetConfigEvent =
      event.path === appearanceConfigFile ||
      event.path === appearanceConfigPath ||
      path.resolve(appearanceConfigDir, event.path) === appearanceConfigPathResolved;
    if (!isTargetConfigEvent) {
      return Effect.void;
    }
    return revalidateAndEmit.pipe(
      Effect.catch((error) =>
        Effect.logWarning("failed to revalidate appearance config after file update", {
          path: appearanceConfigPath,
          detail: error.detail,
          cause: error.cause,
        }),
      ),
    );
  }).pipe(
    Effect.catch((cause) =>
      Effect.logWarning("appearance config watcher stopped unexpectedly", {
        path: appearanceConfigPath,
        cause,
      }),
    ),
    Effect.forkScoped,
  );

  const syncDefaultAppearanceOnStartup = revalidateSemaphore.withPermits(1)(
    Effect.gen(function* () {
      if (yield* readConfigExists) {
        yield* Cache.invalidate(resolvedConfigCache, resolvedConfigCacheKey);
        return;
      }

      yield* writeConfigAtomically(DEFAULT_APPEARANCE_CONFIG);
      yield* Cache.invalidate(resolvedConfigCache, resolvedConfigCacheKey);
    }),
  );

  return {
    syncDefaultAppearanceOnStartup,
    loadConfigState: loadConfigStateFromCacheOrDisk,
    changes: Stream.fromPubSub(changesPubSub),
  } satisfies AppearanceShape;
});

export const AppearanceLive = Layer.effect(Appearance, makeAppearance);

function messageFromCause(cause: Cause.Cause<unknown>): string {
  const squashed = Cause.squash(cause);
  if (typeof squashed === "object" && squashed !== null && "detail" in squashed) {
    return String((squashed as { detail: unknown }).detail);
  }
  return String(squashed);
}
