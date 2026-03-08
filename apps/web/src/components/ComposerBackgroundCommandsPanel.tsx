import type { ThreadBackgroundCommandSummary } from "@t3tools/contracts";
import { ChevronDownIcon, LoaderCircleIcon, SquareIcon, SquareTerminal } from "lucide-react";
import { memo, useMemo, useState } from "react";

import { Button } from "./ui/button";
import { cn } from "~/lib/utils";

interface ComposerBackgroundCommandsPanelProps {
  readonly commands: ReadonlyArray<ThreadBackgroundCommandSummary>;
  readonly isCleaning: boolean;
  readonly onClean: () => void;
}

const ROW_PREVIEW_LIMIT = 2;

const ComposerBackgroundCommandsPanel = memo(function ComposerBackgroundCommandsPanel({
  commands,
  isCleaning,
  onClean,
}: ComposerBackgroundCommandsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const visibleCommands = useMemo(
    () => (showAll ? commands : commands.slice(0, ROW_PREVIEW_LIMIT)),
    [commands, showAll],
  );

  if (commands.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-t-[20px] border border-border/80 border-b-0 bg-card/92 shadow-[0_10px_35px_-24px_rgba(0,0,0,0.6)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <SquareTerminal className="size-3.5 shrink-0" />
          <span className="truncate text-xs font-medium tracking-[0.01em]">
            {commands.length === 1 ? "Running 1 terminal" : `Running ${commands.length} terminals`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-7 rounded-full text-muted-foreground hover:text-foreground"
            onClick={onClean}
            disabled={isCleaning}
            aria-label="Stop background terminals"
          >
            {isCleaning ? (
              <LoaderCircleIcon className="size-3.5 animate-spin" />
            ) : (
              <SquareIcon className="size-3.5" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-7 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((current) => !current)}
            aria-label={expanded ? "Collapse running terminals" : "Expand running terminals"}
          >
            <ChevronDownIcon className={cn("size-4 transition-transform", expanded && "rotate-180")} />
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-border/70 px-3 py-2 sm:px-4">
          <div className="space-y-1.5">
            {visibleCommands.map((command) => (
              <div
                key={command.id}
                className="rounded-xl border border-white/4 bg-background/28 px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
                    {command.command}
                  </code>
                  {typeof command.processId === "number" ? (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      pid {command.processId}
                    </span>
                  ) : null}
                </div>
                {command.previewLine ? (
                  <p className="mt-1 truncate text-muted-foreground text-xs">{command.previewLine}</p>
                ) : command.cwd ? (
                  <p className="mt-1 truncate text-muted-foreground text-xs">{command.cwd}</p>
                ) : null}
              </div>
            ))}
          </div>

          {!showAll && commands.length > ROW_PREVIEW_LIMIT ? (
            <button
              type="button"
              className="mt-2 text-muted-foreground text-xs transition-colors hover:text-foreground"
              onClick={() => setShowAll(true)}
            >
              Show {commands.length - ROW_PREVIEW_LIMIT} more
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
});

export default ComposerBackgroundCommandsPanel;
