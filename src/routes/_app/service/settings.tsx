import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { db } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { RoleGate } from "@/components/dev/RoleGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/service/settings")({ component: () => <RoleGate allow={["org_admin"]}><Inner /></RoleGate> });

function Inner() {
  const { role } = useApp();
  const [mode, setMode] = useState<"realtime" | "review">("realtime");
  const [pending, setPending] = useState<"realtime" | "review" | null>(null);
  useEffect(() => { setMode(db.auditMode()); }, []);

  const apply = () => {
    if (!pending) return;
    db.setAuditMode(pending);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "服务记录", action: "切换审核模式", detail: `${mode} → ${pending}` });
    setMode(pending); setPending(null);
    toast.success(`审核模式已切换为「${pending === "realtime" ? "实时监控" : "需要审核"}」`);
  };

  return (
    <div>
      <PageHeader title="服务审核模式" subtitle="全局配置：所有服务记录是否需要审核才对外展示" />
      <DevNote prd="§6.4" title="审核模式配置">
        <div>· 默认：实时监控（最友好，无需主动审核）</div>
        <div>· 切换为「需要审核」后，新提交的服务记录需机构管理员审核通过才生效</div>
        <div>· 操作记入审计日志</div>
      </DevNote>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={`p-5 cursor-pointer transition ${mode === "realtime" ? "border-primary ring-2 ring-primary/20" : ""}`} onClick={() => mode !== "realtime" && setPending("realtime")}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">实时监控模式</h3>
            {mode === "realtime" && <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">当前生效</span>}
          </div>
          <p className="text-sm text-muted-foreground">服务记录实时展示，机构可随时查看。命中预设规则时自动触发预警和标记，记录本身不阻塞展示。</p>
        </Card>
        <Card className={`p-5 cursor-pointer transition ${mode === "review" ? "border-primary ring-2 ring-primary/20" : ""}`} onClick={() => mode !== "review" && setPending("review")}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">需要审核模式</h3>
            {mode === "review" && <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">当前生效</span>}
          </div>
          <p className="text-sm text-muted-foreground">命中规则的服务记录需机构管理员审核通过后才对外展示或生效。</p>
        </Card>
      </div>
      <AlertDialog open={!!pending} onOpenChange={(v) => !v && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认切换审核模式？</AlertDialogTitle>
            <AlertDialogDescription>将从「{mode === "realtime" ? "实时监控" : "需要审核"}」切换为「{pending === "realtime" ? "实时监控" : "需要审核"}」，操作将记入审计日志。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction asChild><Button onClick={apply}>确认切换</Button></AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}