import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import {
  ProviderComposerCapabilitiesInput,
  ProviderListSkillsInput,
  ProviderSendTurnInput,
  ProviderSessionStartInput,
} from "./provider";

const decodeProviderSessionStartInput = Schema.decodeUnknownSync(ProviderSessionStartInput);
const decodeProviderSendTurnInput = Schema.decodeUnknownSync(ProviderSendTurnInput);
const decodeProviderComposerCapabilitiesInput = Schema.decodeUnknownSync(
  ProviderComposerCapabilitiesInput,
);
const decodeProviderListSkillsInput = Schema.decodeUnknownSync(ProviderListSkillsInput);

describe("ProviderSessionStartInput", () => {
  it("accepts codex-compatible payloads", () => {
    const parsed = decodeProviderSessionStartInput({
      threadId: "thread-1",
      provider: "codex",
      cwd: "/tmp/workspace",
      model: "gpt-5.3-codex",
      modelOptions: {
        codex: {
          reasoningEffort: "high",
          fastMode: true,
        },
      },
      runtimeMode: "full-access",
      providerOptions: {
        codex: {
          binaryPath: "/usr/local/bin/codex",
          homePath: "/tmp/.codex",
        },
      },
    });
    expect(parsed.runtimeMode).toBe("full-access");
    expect(parsed.modelOptions?.codex?.reasoningEffort).toBe("high");
    expect(parsed.modelOptions?.codex?.fastMode).toBe(true);
    expect(parsed.providerOptions?.codex?.binaryPath).toBe("/usr/local/bin/codex");
    expect(parsed.providerOptions?.codex?.homePath).toBe("/tmp/.codex");
  });

  it("rejects payloads without runtime mode", () => {
    expect(() =>
      decodeProviderSessionStartInput({
        threadId: "thread-1",
        provider: "codex",
      }),
    ).toThrow();
  });
});

describe("ProviderSendTurnInput", () => {
  it("accepts provider-scoped model options", () => {
    const parsed = decodeProviderSendTurnInput({
      threadId: "thread-1",
      model: "gpt-5.3-codex",
      modelOptions: {
        codex: {
          reasoningEffort: "xhigh",
          fastMode: true,
        },
      },
    });

    expect(parsed.model).toBe("gpt-5.3-codex");
    expect(parsed.modelOptions?.codex?.reasoningEffort).toBe("xhigh");
    expect(parsed.modelOptions?.codex?.fastMode).toBe(true);
  });

  it("defaults inline items to an empty list", () => {
    const parsed = decodeProviderSendTurnInput({
      threadId: "thread-1",
      input: "hello",
    });

    expect(parsed.inlineItems).toEqual([]);
  });
});

describe("Provider composer inputs", () => {
  it("accepts provider composer capabilities input", () => {
    const parsed = decodeProviderComposerCapabilitiesInput({
      threadId: "thread-1",
      provider: "codex",
      cwd: "/tmp/workspace",
      providerOptions: {
        codex: {
          binaryPath: "/usr/local/bin/codex",
        },
      },
    });

    expect(parsed.provider).toBe("codex");
    expect(parsed.cwd).toBe("/tmp/workspace");
    expect(parsed.providerOptions?.codex?.binaryPath).toBe("/usr/local/bin/codex");
  });

  it("accepts provider skills list input", () => {
    const parsed = decodeProviderListSkillsInput({
      threadId: "thread-1",
      provider: "codex",
      cwd: "/tmp/workspace",
      forceReload: true,
    });

    expect(parsed.provider).toBe("codex");
    expect(parsed.cwd).toBe("/tmp/workspace");
    expect(parsed.forceReload).toBe(true);
  });
});
