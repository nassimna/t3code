import { AppearanceConfig, type AppearanceConfigIssue } from "@t3tools/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { Effect, Fiber, FileSystem, Layer, Path, Schema, Stream } from "effect";
import { ServerConfig, type ServerConfigShape } from "./config";

import { Appearance, AppearanceLive, DEFAULT_APPEARANCE_CONFIG } from "./appearance";

const AppearanceConfigJson = Schema.fromJsonString(AppearanceConfig);

const makeAppearanceLayer = (
  resolveAppearanceConfigPath?: (stateDir: string, join: Path.Path["join"]) => string,
) =>
  AppearanceLive.pipe(
    Layer.provideMerge(
      Layer.effect(
        ServerConfig,
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const { join } = yield* Path.Path;
          const dir = yield* fs.makeTempDirectoryScoped({ prefix: "t3code-appearance-test-" });
          const appearanceConfigPath =
            resolveAppearanceConfigPath?.(dir, join) ?? join(dir, "appearance.json");
          return { appearanceConfigPath } as ServerConfigShape;
        }),
      ),
    ),
  );

const readAppearanceConfig = (configPath: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const rawConfig = yield* fileSystem.readFileString(configPath);
    return yield* Schema.decodeUnknownEffect(AppearanceConfigJson)(rawConfig);
  });

it.layer(NodeServices.layer)("appearance", (it) => {
  it.effect("bootstraps default appearance when config file is missing", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { appearanceConfigPath } = yield* ServerConfig;
      assert.isFalse(yield* fs.exists(appearanceConfigPath));

      yield* Effect.gen(function* () {
        const appearance = yield* Appearance;
        yield* appearance.syncDefaultAppearanceOnStartup;
      });

      const persisted = yield* readAppearanceConfig(appearanceConfigPath);
      assert.deepEqual(persisted, DEFAULT_APPEARANCE_CONFIG);
    }).pipe(Effect.provide(makeAppearanceLayer())),
  );

  it.effect("bootstraps default appearance when parent directory is missing", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { appearanceConfigPath } = yield* ServerConfig;
      assert.isFalse(yield* fs.exists(appearanceConfigPath));

      yield* Effect.gen(function* () {
        const appearance = yield* Appearance;
        yield* appearance.syncDefaultAppearanceOnStartup;
      });

      const persisted = yield* readAppearanceConfig(appearanceConfigPath);
      assert.deepEqual(persisted, DEFAULT_APPEARANCE_CONFIG);
    }).pipe(
      Effect.provide(
        makeAppearanceLayer((dir, join) => join(dir, "nested", "state", "appearance.json")),
      ),
    ),
  );

  it.effect("uses defaults in runtime when config is malformed without overriding file", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { appearanceConfigPath } = yield* ServerConfig;
      yield* fs.writeFileString(appearanceConfigPath, "{ not-json");

      const configState = yield* Effect.gen(function* () {
        const appearance = yield* Appearance;
        return yield* appearance.loadConfigState;
      });

      assert.deepEqual(configState.appearance, DEFAULT_APPEARANCE_CONFIG);
      assert.deepEqual(configState.issues, [
        {
          kind: "appearance.malformed-config",
          message: configState.issues[0]?.message ?? "",
        },
      ]);
      assert.equal(yield* fs.readFileString(appearanceConfigPath), "{ not-json");
    }).pipe(Effect.provide(makeAppearanceLayer())),
  );

  it.effect("keeps valid appearance fields and reports invalid ones", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { appearanceConfigPath } = yield* ServerConfig;
      yield* fs.writeFileString(
        appearanceConfigPath,
        JSON.stringify({
          uiFontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          uiFontSizePx: 30,
          monoFontFamily: '"Iosevka", monospace',
          terminalFontSizePx: "big",
        }),
      );

      const configState = yield* Effect.gen(function* () {
        const appearance = yield* Appearance;
        return yield* appearance.loadConfigState;
      });

      assert.deepEqual(configState.appearance, {
        uiFontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        uiFontSizePx: DEFAULT_APPEARANCE_CONFIG.uiFontSizePx,
        monoFontFamily: '"Iosevka", monospace',
        terminalFontSizePx: DEFAULT_APPEARANCE_CONFIG.terminalFontSizePx,
      });
      assert.deepEqual(configState.issues, [
        {
          kind: "appearance.invalid-value",
          field: "uiFontSizePx",
          message: configState.issues[0]?.message ?? "",
        },
        {
          kind: "appearance.invalid-value",
          field: "terminalFontSizePx",
          message: configState.issues[1]?.message ?? "",
        },
      ] satisfies AppearanceConfigIssue[]);
    }).pipe(Effect.provide(makeAppearanceLayer())),
  );

  it.effect("emits change events when appearance config changes on disk", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const { appearanceConfigPath } = yield* ServerConfig;
      const appearance = yield* Appearance;

      yield* appearance.syncDefaultAppearanceOnStartup;

      const changeFiber = yield* Stream.runHead(appearance.changes).pipe(Effect.forkChild);
      yield* fs.writeFileString(appearanceConfigPath, "{ not-json");
      const change = yield* Fiber.join(changeFiber);

      assert.equal(change._tag, "Some");
      if (change._tag !== "Some") {
        return;
      }

      assert.deepEqual(change.value, {
        changedSections: ["appearance"],
        issues: [
          {
            kind: "appearance.malformed-config",
            message: change.value.issues[0]?.message ?? "",
          },
        ],
      });
    }).pipe(Effect.provide(makeAppearanceLayer())),
  );
});
