import { Schema } from "effect";

export const AppearanceConfigField = Schema.Literals([
  "uiFontFamily",
  "uiFontSizePx",
  "monoFontFamily",
  "terminalFontSizePx",
]);
export type AppearanceConfigField = typeof AppearanceConfigField.Type;

const FontFamilyString = Schema.String.pipe(
  Schema.check(
    Schema.isNonEmpty(),
    Schema.isMaxLength(1024),
  ),
);

const UiFontSizePx = Schema.Int.check(Schema.isBetween({ minimum: 12, maximum: 24 }));

const TerminalFontSizePx = Schema.Int.check(Schema.isBetween({ minimum: 10, maximum: 24 }));

export const AppearanceConfig = Schema.Struct({
  uiFontFamily: FontFamilyString,
  uiFontSizePx: UiFontSizePx,
  monoFontFamily: FontFamilyString,
  terminalFontSizePx: TerminalFontSizePx,
});
export type AppearanceConfig = typeof AppearanceConfig.Type;

export const ResolvedAppearanceConfig = AppearanceConfig;
export type ResolvedAppearanceConfig = typeof ResolvedAppearanceConfig.Type;

const AppearanceMalformedConfigIssue = Schema.Struct({
  kind: Schema.Literal("appearance.malformed-config"),
  message: Schema.String,
});

const AppearanceInvalidValueIssue = Schema.Struct({
  kind: Schema.Literal("appearance.invalid-value"),
  field: AppearanceConfigField,
  message: Schema.String,
});

export const AppearanceConfigIssue = Schema.Union([
  AppearanceMalformedConfigIssue,
  AppearanceInvalidValueIssue,
]);
export type AppearanceConfigIssue = typeof AppearanceConfigIssue.Type;
