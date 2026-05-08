import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type Order } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { maskName, maskPhone } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { RoleGate } from "@/components/dev/RoleGate";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { SalesServicesSheet } from "@/components/sales/SalesServicesSheet";

export const Route = createFileRoute("/_app/sales/")({ component: () => <RoleGate allow={["org_admin", "super_admin", "planner"]}><Inner /></RoleGate> });

function Inner() {
  const { role } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<string>("all");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  useEffect(() => { setOrders(db.orders()); }, []);

  const filtered = orders.filter((o) => tab === "all" ? true : o.status === tab);

  return (
    <div>
      <PageHeader title="销售明细" subtitle="订单数据由 鼎团团 / 甄选 平台 Webhook 推送同步" actions={
        <PermissionTip action="导出销售明细" prd="§8.2 / §14" allow={["org_admin"]}>
          <Button size="sm" disabled={role !== "org_admin"} onClick={() => { db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "销售明细", action: "导出", detail: `${filtered.length} 条 (脱敏)` }); toast.success("已导出 sales.xlsx (mock)"); }}><Download className="h-4 w-4" /> 导出</Button>
        </PermissionTip>
      } />
      <DevNote prd="§8" title="销售明细">
        <div>· 数据来源：鼎团团 / 甄选 (Webhook 推送，准实时 ≤1 分钟，失败重试 3 次)</div>
        <div>· 用户来源标记：首次下单=规划师新拓；有历史订单=机构老用户</div>
        <div>· 退费仅在源系统发起，本系统只读；不支持部分退费</div>
        <div>· <b>待确认</b>：字段映射 Q9-Q14（接口设计阻塞中）</div>
      </DevNote>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="待支付">待支付</TabsTrigger>
          <TabsTrigger value="已支付">已支付</TabsTrigger>
          <TabsTrigger value="退费中">退费中</TabsTrigger>
          <TabsTrigger value="已退费">已退费</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow>
              <TableHead>订单号</TableHead><TableHead>用户</TableHead><TableHead>手机号</TableHead>
              <TableHead>课程</TableHead><TableHead>类型</TableHead><TableHead>金额</TableHead>
              <TableHead>来源</TableHead><TableHead>渠道</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell>{maskName(o.userName, role)}</TableCell>
                  <TableCell className="font-mono text-xs">{maskPhone(o.userPhone, role)}</TableCell>
                  <TableCell>{o.course}</TableCell>
                  <TableCell><Badge variant="outline">{o.courseType}</Badge></TableCell>
                  <TableCell className="font-medium">¥{o.amount.toLocaleString()}</TableCell>
                  <TableCell><Badge className={o.source === "机构老用户" ? "bg-info text-info-foreground" : "bg-success text-success-foreground"}>{o.source}</Badge></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{o.channel}</span></TableCell>
                  <TableCell><Badge variant={o.status === "已退费" ? "destructive" : o.status === "退费中" ? "secondary" : "default"}>{o.status}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setViewOrder(o)}><FileText className="h-3.5 w-3.5" /> 服务记录</Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={10} className="py-12 text-center text-muted-foreground">暂无数据</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
      <SalesServicesSheet order={viewOrder} onOpenChange={(v) => !v && setViewOrder(null)} />
    </div>
  );
}