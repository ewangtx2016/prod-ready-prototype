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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SalesServicesSheet } from "@/components/sales/SalesServicesSheet";
import { usePagination } from "@/components/dev/TablePagination";

export const Route = createFileRoute("/_app/sales/")({ component: () => <RoleGate allow={["org_admin", "super_admin", "planner"]}><Inner /></RoleGate> });

function Inner() {
  const { role } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<string>("all");
  const [productType, setProductType] = useState<string>("all");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [keyword, setKeyword] = useState("");
  const [channel, setChannel] = useState<string>("all");
  const [planner, setPlanner] = useState<string>("all");
  const [org, setOrg] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  useEffect(() => { setOrders(db.orders()); }, []);

  const plannerOptions = Array.from(new Set(orders.map((o) => o.plannerName)));
  const orgOptions = Array.from(new Set(orders.map((o) => o.orgName)));
  const productTypeOptions = ["学科课", "素养课", "体验课", "学习机", "会员服务"];

  const kw = keyword.trim().toLowerCase();
  const filtered = orders.filter((o) => {
    if (tab !== "all" && o.status !== tab) return false;
    if (productType !== "all" && o.courseType !== productType) return false;
    if (channel !== "all" && o.channel !== channel) return false;
    if (planner !== "all" && o.plannerName !== planner) return false;
    if (org !== "all" && o.orgName !== org) return false;
    if (kw && !(
      o.id.toLowerCase().includes(kw) ||
      o.userName.toLowerCase().includes(kw) ||
      o.userPhone.includes(kw) ||
      o.course.toLowerCase().includes(kw) ||
      o.plannerName.toLowerCase().includes(kw) ||
      o.orgName.toLowerCase().includes(kw)
    )) return false;
    if (startDate && o.createdAt.slice(0, 10) < startDate) return false;
    if (endDate && o.createdAt.slice(0, 10) > endDate) return false;
    return true;
  });
  const { paged, Pagination } = usePagination(filtered, 10);
  const resetFilters = () => { setKeyword(""); setProductType("all"); setChannel("all"); setPlanner("all"); setOrg("all"); setStartDate(""); setEndDate(""); };

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
      <div className="mb-3 grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 md:grid-cols-8">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs text-muted-foreground">关键词</Label>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索订单号 / 用户 / 手机号" className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">产品类型</Label>
          <Select value={productType} onValueChange={setProductType}>
            <SelectTrigger className="h-8"><SelectValue placeholder="产品类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {productTypeOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">渠道</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-8"><SelectValue placeholder="渠道" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部渠道</SelectItem>
              <SelectItem value="鼎团团">鼎团团</SelectItem>
              <SelectItem value="甄选">甄选</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">机构</Label>
          <Select value={org} onValueChange={setOrg}>
            <SelectTrigger className="h-8"><SelectValue placeholder="机构" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部机构</SelectItem>
              {orgOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">规划师</Label>
          <Select value={planner} onValueChange={setPlanner}>
            <SelectTrigger className="h-8"><SelectValue placeholder="规划师" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部规划师</SelectItem>
              {plannerOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">状态</Label>
          <Select value={tab} onValueChange={setTab}>
            <SelectTrigger className="h-8"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="待支付">待支付</SelectItem>
              <SelectItem value="已支付">已支付</SelectItem>
              <SelectItem value="退费中">退费中</SelectItem>
              <SelectItem value="已退费">已退费</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">开始日期</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">结束日期</Label>
          <div className="flex gap-2">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8" />
            <Button variant="ghost" size="sm" className="h-8" onClick={resetFilters}>重置</Button>
          </div>
        </div>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
            <TableHeader><TableRow>
              <TableHead>订单号</TableHead><TableHead>用户</TableHead><TableHead>手机号</TableHead>
              <TableHead>产品名称</TableHead><TableHead>产品类型</TableHead><TableHead>金额</TableHead>
              <TableHead>机构</TableHead><TableHead>规划师</TableHead>
              <TableHead>渠道</TableHead><TableHead>状态</TableHead><TableHead>下单时间</TableHead><TableHead className="text-right">操作</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {paged.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell>{maskName(o.userName, role)}</TableCell>
                  <TableCell className="font-mono text-xs">{maskPhone(o.userPhone, role)}</TableCell>
                  <TableCell>{o.course}</TableCell>
                  <TableCell><Badge variant="outline">{o.courseType}</Badge></TableCell>
                  <TableCell className="font-medium">¥{o.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{o.orgName}</TableCell>
                  <TableCell className="text-xs">{o.plannerName}</TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{o.channel}</span></TableCell>
                  <TableCell><Badge variant={o.status === "已退费" ? "destructive" : o.status === "退费中" ? "secondary" : "default"}>{o.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.createdAt}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={12} className="py-12 text-center text-muted-foreground">暂无数据</TableCell></TableRow>}
            </TableBody>
        </Table>
        <Pagination />
      </div>
      <SalesServicesSheet order={viewOrder} onOpenChange={(v) => !v && setViewOrder(null)} />
    </div>
  );
}
