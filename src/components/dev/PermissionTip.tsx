import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ROLE_META, type Role } from "@/lib/roles";
import { useApp } from "@/lib/store";
import { Info } from "lucide-react";

/** 包裹按钮 — 鼠标悬停展示按钮权限说明（PRD 锚点 + 4 角色可用性） */
export function PermissionTip({
  action,
  prd,
  allow,
  desc,
  children,
}: {
  action: string;
  prd: string;
  allow: Role[];
  desc?: string;
  children: ReactNode;
}) {
  const { showDevNote } = useApp();
  if (!showDevNote) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="relative inline-flex">
            {children}
            <Info className="pointer-events-none absolute -right-1 -top-1 h-3 w-3 rounded-full bg-info text-info-foreground p-[1px]" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs space-y-1">
          <div className="font-medium">权限：{action}</div>
          <div className="text-xs opacity-80 font-mono">PRD {prd}</div>
          {desc && <div className="text-xs">{desc}</div>}
          <div className="mt-1 flex flex-wrap gap-1">
            {(["org_admin", "super_admin", "planner", "tutor"] as Role[]).map((r) => (
              <span
                key={r}
                className={`rounded px-1.5 py-0.5 text-[10px] ${
                  allow.includes(r) ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground line-through"
                }`}
              >
                {ROLE_META[r].short}
              </span>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}