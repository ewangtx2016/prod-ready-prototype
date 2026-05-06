import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { db, type ServiceRecord } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { maskName, maskPhone } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { RoleGate } from "@/components/dev/RoleGate";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/service/audit")({ component: Page });

function Page() {
  return (
    <RoleGate allow={["org_admin"]}>
      <Inner />
    </RoleGate>
  );
}

function Inner() {
  const { role } = useApp();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [rejecting, setRejecting] = useState<ServiceRecord | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => { setRecords(db.services()); }, []);
  const refresh = () => setRecords(db.services());
  const pending = records.filter((r) => r.status === "pending_audit");

  const approve = (r: ServiceRecord) => {
    const list = db.services();
    const idx = list.findIndex((x) => x.id === r.id);
    list[idx] = { ...list[idx], status: "approved", content: list[idx].pendingChange?.newContent ?? list[idx].content, pendingChange: undefined };
    db.setServices(list);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "服务记录", action: "审核通过", detail: `#${r.id}` });
    toast.success("审核通过");
    refresh();
  };
  const reject = () => {
    if (!reason.trim()) { toast.error("请填写驳回原因"); return; }
    if (!rejecting) return;
    const list = db.services();
    const idx = list.findIndex((x) => x.id === rejecting.id);
    list[idx] = { ...list[idx], status: "rejected", rejectReason: reason, pendingChange: undefined };
    db.setServices(list);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "服务记录", action: "审核驳回", detail: `#${rejecting.id} - ${reason}` });
    toast.success("已驳回");
    setRejecting(null); setReason(""); refresh();
  };

  return (
    <div>
      <PageHeader title="服务审核" subtitle="机构管理员审核规划师/学管师提交的服务记录与修改申请" />
      <DevNote prd="§6.3" title="服务审核">
        <div>· 仅机构管理员可审核（按 PRD §14 权限矩阵）</div>
        <div>· 通过：原记录被新版本覆盖；驳回：必填原因，回到「未通过」列表</div>
        <div>· 当前待审核条数：{pending.length}</div>
      </DevNote>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>用户</TableHead><TableHead>手机号</TableHead><TableHead>类型</TableHead>
            <TableHead>原内容 → 新内容</TableHead><TableHead>提交人</TableHead><TableHead>提交时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {pending.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{maskName(r.userName, role)}</TableCell>
                <TableCell className="font-mono text-xs">{maskPhone(r.userPhone, role)}</TableCell>
                <TableCell>{r.serviceType}</TableCell>
                <TableCell className="text-xs"><span className="line-through text-muted-foreground">{r.content}</span><br /><span className="text-foreground">→ {r.pendingChange?.newContent ?? r.content}</span><br /><span className="text-info">原因：{r.pendingChange?.reason ?? "新建提交"}</span></TableCell>
                <TableCell>{r.createdBy}</TableCell>
                <TableCell className="text-xs">{r.pendingChange?.submittedAt ?? r.createdAt}</TableCell>
                <TableCell className="text-right space-x-2">
                  <PermissionTip action="审核通过" prd="§6.3" allow={["org_admin"]}>
                    <Button size="sm" onClick={() => approve(r)}>通过</Button>
                  </PermissionTip>
                  <PermissionTip action="审核驳回" prd="§6.3" allow={["org_admin"]}>
                    <Button size="sm" variant="outline" onClick={() => setRejecting(r)}>驳回</Button>
                  </PermissionTip>
                </TableCell>
              </TableRow>
            ))}
            {pending.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">暂无待审核记录</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!rejecting} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>驳回服务记录</DialogTitle></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请填写驳回原因（必填）" />
          <DialogFooter><Button variant="outline" onClick={() => setRejecting(null)}>取消</Button><Button variant="destructive" onClick={reject}>确认驳回</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}