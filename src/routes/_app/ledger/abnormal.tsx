import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type LedgerItem } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { maskName } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Coins } from "lucide-react";
import { SplitDetailSheet } from "@/components/ledger/SplitDetailSheet";
import { usePagination } from "@/components/dev/TablePagination";

export const Route = createFileRoute("/_app/ledger/abnormal")({ component: Page });

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<LedgerItem[]>([]);
  const [detail, setDetail] = useState<LedgerItem | null>(null);
  useEffect(() => {
    let arr = db.ledger().filter(l => l.status === "abnormal");
    if (role === "planner") arr = arr.filter(l => l.plannerName === "李规划");
    setList(arr);
  }, [role]);
  const { paged, Pagination } = usePagination(list, 10);

  return (
    <div>
      <PageHeader title="异常台账" subtitle="分账失败 / 金额异常 / 账户异常 / 退回失败" />
      <DevNote prd="§10.3" title="异常台账"><div>· 实时预警：机构管理员 + 鼎校运营 (站内信 + 短信)</div><div>· 重试：人工触发，失败将再次进入异常队列</div></DevNote>
      <Alert className="mb-4 border-destructive/40 bg-destructive/10"><AlertTriangle className="h-4 w-4 text-destructive" /><AlertDescription>共 <b>{list.length}</b> 条异常待处理 — 请及时核实账户状态后重试</AlertDescription></Alert>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>订单号</TableHead><TableHead>用户</TableHead><TableHead>金额</TableHead><TableHead>异常原因</TableHead><TableHead>规划师</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {paged.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.orderId}</TableCell>
                <TableCell>{maskName(l.userName, role)}</TableCell>
                <TableCell>¥{l.amount.toLocaleString()}</TableCell>
                <TableCell className="text-destructive text-sm">{l.abnormalReason}</TableCell>
                <TableCell>{l.plannerName}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setDetail(l)}><Coins className="h-3.5 w-3.5" /> 分成明细</Button>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">暂无异常</TableCell></TableRow>}
          </TableBody>
        </Table>
        <Pagination />
      </Card>
      <SplitDetailSheet item={detail} onOpenChange={(v) => !v && setDetail(null)} />
    </div>
  );
}
