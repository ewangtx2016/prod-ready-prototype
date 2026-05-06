import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type LedgerItem } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { maskName } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/ledger/refund")({ component: Page });

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<LedgerItem[]>([]);
  const [tab, setTab] = useState("all");
  useEffect(() => { setList(db.ledger().filter(l => l.status === "refund_pending" || l.status === "refund_settled")); }, []);
  const filtered = list.filter(l => tab === "all" ? true : l.status === tab);
  return (
    <div>
      <PageHeader title="分账退回" subtitle="逆向分账：退费触发资金按原比例退回" />
      <DevNote prd="§10" title="分账退回"><div>· 触发：源系统退费回调</div><div>· 逆向分账：按订单原分成比例退回各账户</div><div>· 不支持部分退费</div></DevNote>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="all">全部</TabsTrigger><TabsTrigger value="refund_pending">待退回</TabsTrigger><TabsTrigger value="refund_settled">已退回</TabsTrigger></TabsList>
        <TabsContent value={tab}>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>订单号</TableHead><TableHead>用户</TableHead><TableHead>课程</TableHead><TableHead>金额</TableHead><TableHead>机构退回</TableHead><TableHead>规划师退回</TableHead><TableHead>状态</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">{l.orderId}</TableCell>
                    <TableCell>{maskName(l.userName, role)}</TableCell>
                    <TableCell>{l.course}</TableCell>
                    <TableCell>¥{l.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-destructive">-¥{l.orgAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-destructive">-¥{l.plannerAmount.toLocaleString()}</TableCell>
                    <TableCell><Badge variant={l.status === "refund_settled" ? "destructive" : "secondary"}>{l.status === "refund_settled" ? "已退回" : "退回中"}</Badge></TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">暂无退费数据</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
