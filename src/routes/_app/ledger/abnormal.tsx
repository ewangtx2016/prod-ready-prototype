import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type LedgerItem } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { maskName } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, RefreshCw, Coins } from "lucide-react";
import { SplitDetailSheet } from "@/components/ledger/SplitDetailSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ledger/abnormal")({ component: Page });

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<LedgerItem[]>([]);
  const [retrying, setRetrying] = useState<LedgerItem | null>(null);
  const [detail, setDetail] = useState<LedgerItem | null>(null);
  useEffect(() => {
    let arr = db.ledger().filter(l => l.status === "abnormal");
    if (role === "planner") arr = arr.filter(l => l.plannerName === "李规划");
    setList(arr);
  }, [role]);

  const doRetry = () => {
    if (!retrying) return;
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "异常台账", action: "重试分账", detail: retrying.orderId });
    toast.success("已触发重试，请稍后查看结果");
    setRetrying(null);
  };

  return (
    <div>
      <PageHeader title="异常台账" subtitle="分账失败 / 金额异常 / 账户异常 / 退回失败" />
      <DevNote prd="§10.3" title="异常台账"><div>· 实时预警：机构管理员 + 鼎校运营 (站内信 + 短信)</div><div>· 重试：人工触发，失败将再次进入异常队列</div></DevNote>
      <Alert className="mb-4 border-destructive/40 bg-destructive/10"><AlertTriangle className="h-4 w-4 text-destructive" /><AlertDescription>共 <b>{list.length}</b> 条异常待处理 — 请及时核实账户状态后重试</AlertDescription></Alert>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>订单号</TableHead><TableHead>用户</TableHead><TableHead>金额</TableHead><TableHead>异常原因</TableHead><TableHead>规划师</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.orderId}</TableCell>
                <TableCell>{maskName(l.userName, role)}</TableCell>
                <TableCell>¥{l.amount.toLocaleString()}</TableCell>
                <TableCell className="text-destructive text-sm">{l.abnormalReason}</TableCell>
                <TableCell>{l.plannerName}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setDetail(l)}><Coins className="h-3.5 w-3.5" /> 分成明细</Button>
                  <PermissionTip action="重试分账" prd="§10.3" allow={["org_admin", "super_admin"]}>
                    <Button size="sm" variant="outline" disabled={role !== "org_admin" && role !== "super_admin"} onClick={() => setRetrying(l)}><RefreshCw className="h-3.5 w-3.5" /> 重试</Button>
                  </PermissionTip>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">暂无异常</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={!!retrying} onOpenChange={(v) => !v && setRetrying(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认重试分账？</DialogTitle><DialogDescription>订单 {retrying?.orderId} — ¥{retrying?.amount.toLocaleString()}<br />原因：{retrying?.abnormalReason}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setRetrying(null)}>取消</Button><Button onClick={doRetry}>确认重试</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <SplitDetailSheet item={detail} onOpenChange={(v) => !v && setDetail(null)} />
    </div>
  );
}
