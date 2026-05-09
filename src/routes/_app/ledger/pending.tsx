import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type LedgerItem } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { maskName } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { SplitDetailSheet } from "@/components/ledger/SplitDetailSheet";
import { usePagination } from "@/components/dev/TablePagination";

export const Route = createFileRoute("/_app/ledger/pending")({ component: Page });

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<LedgerItem[]>([]);
  const [detail, setDetail] = useState<LedgerItem | null>(null);
  useEffect(() => {
    let arr = db.ledger().filter(l => l.status === "pending");
    if (role === "planner") arr = arr.filter(l => l.plannerName === "李规划");
    setList(arr);
  }, [role]);
  const total = list.reduce((s, x) => s + x.amount, 0);
  const { paged, Pagination } = usePagination(list, 10);
  return (
    <div>
      <PageHeader title="待结算台账" subtitle="已支付但尚未达到结算条件（如未过退款冷静期）的订单" />
      <DevNote prd="§10" title="待结算台账"><div>· 触发结算：订单完成 + 过退款冷静期 (T+7)</div><div>· 不可手动结算，只能等待自动触发</div></DevNote>
      <Card className="p-4 mb-4"><div className="text-xs text-muted-foreground">待结算总额</div><div className="text-2xl font-semibold text-warning mt-1">¥{total.toLocaleString()}</div></Card>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>订单号</TableHead><TableHead>用户</TableHead><TableHead>课程</TableHead><TableHead>金额</TableHead><TableHead>机构(预)</TableHead><TableHead>规划师(预)</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {paged.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.orderId}</TableCell>
                <TableCell>{maskName(l.userName, role)}</TableCell>
                <TableCell>{l.course}</TableCell>
                <TableCell>¥{l.amount.toLocaleString()}</TableCell>
                <TableCell>¥{l.orgAmount.toLocaleString()}</TableCell>
                <TableCell>¥{l.plannerAmount.toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline" className="text-warning">待结算</Badge></TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setDetail(l)}><Coins className="h-3.5 w-3.5" /> 分成明细</Button></TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">暂无待结算数据</TableCell></TableRow>}
          </TableBody>
        </Table>
        <Pagination />
      </Card>
      <SplitDetailSheet item={detail} onOpenChange={(v) => !v && setDetail(null)} />
    </div>
  );
}
