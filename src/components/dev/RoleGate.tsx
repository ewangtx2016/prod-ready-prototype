import type { ReactNode } from "react";
import { useApp } from "@/lib/store";
import type { Role } from "@/lib/roles";
import { ShieldAlert } from "lucide-react";

/** 数据范围/菜单守卫：当前角色不在 allow 时展示 403 占位 */
export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { role } = useApp();
  if (!allow.includes(role)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <ShieldAlert className="h-10 w-10 text-warning" />
        <h2 className="text-lg font-semibold">403 — 当前角色无权访问该页面</h2>
        <p className="text-sm text-muted-foreground">
          此页面仅对以下角色开放：{allow.join("、")}
          <br />可使用顶栏「角色切换」演示其他角色视角。
        </p>
      </div>
    );
  }
  return <>{children}</>;
}