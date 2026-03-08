import { Schema } from "effect";
import { assert, it } from "@effect/vitest";
import { Effect } from "effect";

import {
  AppearanceConfig,
  AppearanceConfigIssue,
  ResolvedAppearanceConfig,
} from "./appearance";

const decode = <S extends Schema.Top>(
  schema: S,
  input: unknown,
): Effect.Effect<Schema.Schema.Type<S>, Schema.SchemaError, never> =>
  Schema.decodeUnknownEffect(schema as never)(input) as Effect.Effect<
    Schema.Schema.Type<S>,
    Schema.SchemaError,
    never
  >;

it.effect("parses appearance config payloads", () =>
  Effect.gen(function* () {
    const parsed = yield* decode(AppearanceConfig, {
      uiFontFamily: '"DM Sans", system-ui, sans-serif',
      uiFontSizePx: 16,
      monoFontFamily: '"SF Mono", monospace',
      terminalFontSizePx: 12,
    });

    assert.strictEqual(parsed.uiFontSizePx, 16);
    assert.strictEqual(parsed.terminalFontSizePx, 12);
  }),
);

it.effect("rejects invalid appearance config values", () =>
  Effect.gen(function* () {
    const result = yield* Effect.exit(
      decode(AppearanceConfig, {
        uiFontFamily: "",
        uiFontSizePx: 9,
        monoFontFamily: '"SF Mono", monospace',
        terminalFontSizePx: 12,
      }),
    );

    assert.strictEqual(result._tag, "Failure");
  }),
);

it.effect("parses resolved appearance configs", () =>
  Effect.gen(function* () {
    const parsed = yield* decode(ResolvedAppearanceConfig, {
      uiFontFamily: '"DM Sans", system-ui, sans-serif',
      uiFontSizePx: 18,
      monoFontFamily: '"SF Mono", monospace',
      terminalFontSizePx: 14,
    });

    assert.strictEqual(parsed.uiFontSizePx, 18);
  }),
);

it.effect("parses appearance config issues", () =>
  Effect.gen(function* () {
    const malformed = yield* decode(AppearanceConfigIssue, {
      kind: "appearance.malformed-config",
      message: "Expected a JSON object.",
    });
    const invalid = yield* decode(AppearanceConfigIssue, {
      kind: "appearance.invalid-value",
      field: "uiFontSizePx",
      message: "Expected an integer between 12 and 24.",
    });

    assert.strictEqual(malformed.kind, "appearance.malformed-config");
    if (invalid.kind !== "appearance.invalid-value") {
      throw new Error("expected appearance.invalid-value issue");
    }
    assert.strictEqual(invalid.field, "uiFontSizePx");
  }),
);
