import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type LedgerItem } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { maskName } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/ledger/estimated")({ component: Page });

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<LedgerItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => { setList(db.ledger().filter(l => l.status === "estimated" || l.status === "pending")); }, [refreshKey]);
  const orgEst = list.reduce((s, x) => s + x.orgAmount, 0);
  const planEst = list.reduce((s, x) => s + x.plannerAmount, 0);
  return (
    <div>
      <PageHeader title="预估收入" subtitle="按当前生效规则对待结算订单的预估" actions={<Button size="sm" variant="outline" onClick={() => setRefreshKey(k => k + 1)}><RefreshCw className="h-4 w-4" /> 刷新</Button>} />
      <DevNote prd="§10" title="预估收入"><div>· 数据刷新：≤ 10 秒</div><div>· 仅按当前生效规则预估，规则变更或退款会导致实际差异</div></DevNote>
      <Alert className="mb-4 border-warning/40 bg-warning/10"><AlertTriangle className="h-4 w-4 text-warning" /><AlertDescription>仅供参考 — 实际结算金额以分账完成时为准</AlertDescription></Alert>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">机构预估</div><div className="text-2xl font-semibold mt-1 text-info">¥{orgEst.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">规划师预估</div><div className="text-2xl font-semibold mt-1 text-success">¥{planEst.toLocaleString()}</div></Card>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>订单号</TableHead><TableHead>用户</TableHead><TableHead>课程</TableHead><TableHead>金额</TableHead><TableHead>预估机构</TableHead><TableHead>预估规划师</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.orderId}</TableCell>
                <TableCell>{maskName(l.userName, role)}</TableCell>
                <TableCell>{l.course}</TableCell>
                <TableCell>¥{l.amount.toLocaleString()}</TableCell>
                <TableCell>¥{l.orgAmount.toLocaleString()}</TableCell>
                <TableCell>¥{l.plannerAmount.toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">暂无预估数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
