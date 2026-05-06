import { useState, type ReactNode } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

/** 开发注释卡片 — 仅当全局 showDevNote 开启时展示，方便研发对照 PRD */
export function DevNote({
  prd,
  title,
  children,
  defaultOpen = true,
}: {
  prd: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const { showDevNote } = useApp();
  const [open, setOpen] = useState(defaultOpen);
  if (!showDevNote) return null;
  return (
    <div className="mb-4 rounded-md border border-dashed border-info/40 bg-info/5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-info"
      >
        <FileText className="h-3.5 w-3.5" />
        <span className="rounded bg-info/15 px-1.5 py-0.5 font-mono">{prd}</span>
        <span className="text-foreground/80">{title}</span>
        <span className="ml-auto text-muted-foreground">[开发注释 · 可关闭]</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && <div className="border-t border-info/20 px-3 py-2 text-xs text-muted-foreground space-y-1">{children}</div>}
    </div>
  );
}