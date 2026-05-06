import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { db, type ProfitRule } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profit/audit")({ component: Page });

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<ProfitRule[]>([]);
  const [rejecting, setRejecting] = useState<ProfitRule | null>(null);
  const [reason, setReason] = useState("");
  useEffect(() => { setList(db.rules().filter(r => r.status === "pending_audit")); }, []);
  const refresh = () => setList(db.rules().filter(r => r.status === "pending_audit"));

  const approve = (r: ProfitRule) => {
    const all = db.rules(); const idx = all.findIndex(x => x.id === r.id);
    all[idx] = { ...all[idx], status: "ready", history: [...all[idx].history, { time: new Date().toLocaleString("zh-CN"), action: "审核通过", operator: ROLE_META[role].name }] };
    db.setRules(all); db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "分成规则", action: "审核通过", detail: r.name });
    toast.success("审核通过"); refresh();
  };
  const doReject = () => {
    if (!rejecting || !reason.trim()) { toast.error("请填写驳回原因"); return; }
    const all = db.rules(); const idx = all.findIndex(x => x.id === rejecting.id);
    all[idx] = { ...all[idx], status: "rejected", rejectReason: reason, history: [...all[idx].history, { time: new Date().toLocaleString("zh-CN"), action: "审核驳回", operator: ROLE_META[role].name }] };
    db.setRules(all); db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "分成规则", action: "审核驳回", detail: `${rejecting.name} - ${reason}` });
    toast.success("已驳回"); setRejecting(null); setReason(""); refresh();
  };

  return (
    <div>
      <PageHeader title="规则审核" subtitle="机构管理员审核鼎校超管提交的分成规则" actions={<Link to="/profit/rules"><Button size="sm" variant="outline">查看全部规则</Button></Link>} />
      <DevNote prd="§9.3" title="规则审核"><div>· 仅机构管理员可审核</div><div>· 驳回必须填写原因，超管可在「分成规则」修改后重新提交</div></DevNote>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>规则名称</TableHead><TableHead>版本</TableHead><TableHead>提交人</TableHead><TableHead>提交时间</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="font-mono text-xs">{r.version}</TableCell>
                <TableCell>{r.createdBy}</TableCell>
                <TableCell className="text-xs">{r.createdAt}</TableCell>
                <TableCell><Badge className="bg-warning text-warning-foreground">待审核</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <PermissionTip action="审核通过" prd="§9.3" allow={["org_admin"]}><Button size="sm" disabled={role !== "org_admin"} onClick={() => approve(r)}>通过</Button></PermissionTip>
                  <PermissionTip action="审核驳回" prd="§9.3" allow={["org_admin"]}><Button size="sm" variant="outline" disabled={role !== "org_admin"} onClick={() => setRejecting(r)}>驳回</Button></PermissionTip>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">暂无待审核规则</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={!!rejecting} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>驳回 — {rejecting?.name}</DialogTitle></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请填写驳回原因（必填）" />
          <DialogFooter><Button variant="outline" onClick={() => setRejecting(null)}>取消</Button><Button variant="destructive" onClick={doReject}>确认驳回</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
