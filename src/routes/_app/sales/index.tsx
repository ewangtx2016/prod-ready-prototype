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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SalesServicesSheet } from "@/components/sales/SalesServicesSheet";
import { usePagination } from "@/components/dev/TablePagination";

export const Route = createFileRoute("/_app/sales/")({ component: () => <RoleGate allow={["org_admin", "super_admin", "planner"]}><Inner /></RoleGate> });

function Inner() {
  const { role } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<string>("all");
  const [productTab, setProductTab] = useState<string>("course");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [keyword, setKeyword] = useState("");
  const [courseType, setCourseType] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  useEffect(() => { setOrders(db.orders()); }, []);

  const kw = keyword.trim().toLowerCase();
  const filtered = orders.filter((o) => {
    if (tab !== "all" && o.status !== tab) return false;
    if (courseType !== "all" && o.courseType !== courseType) return false;
    if (source !== "all" && o.source !== source) return false;
    if (channel !== "all" && o.channel !== channel) return false;
    if (kw && !(
      o.id.toLowerCase().includes(kw) ||
      o.userName.toLowerCase().includes(kw) ||
      o.userPhone.includes(kw) ||
      o.course.toLowerCase().includes(kw) ||
      o.plannerName.toLowerCase().includes(kw)
    )) return false;
    if (startDate && o.createdAt.slice(0, 10) < startDate) return false;
    if (endDate && o.createdAt.slice(0, 10) > endDate) return false;
    return true;
  });
  const { paged, Pagination } = usePagination(filtered, 10);
  const hasFilter = !!(kw || courseType !== "all" || source !== "all" || channel !== "all" || startDate || endDate);
  const resetFilters = () => { setKeyword(""); setCourseType("all"); setSource("all"); setChannel("all"); setStartDate(""); setEndDate(""); };

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
      <Tabs value={productTab} onValueChange={setProductTab} className="mb-3">
        <TabsList>
          <TabsTrigger value="course">课程</TabsTrigger>
          <TabsTrigger value="device">学习机</TabsTrigger>
          <TabsTrigger value="benefit">服务权益</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mb-3 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索订单号 / 用户 / 手机号 / 课程 / 规划师" className="h-9 pl-7" />
          </div>
          <Select value={courseType} onValueChange={setCourseType}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="课程类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="学科课">学科课</SelectItem>
              <SelectItem value="素养课">素养课</SelectItem>
              <SelectItem value="体验课">体验课</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="用户来源" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部来源</SelectItem>
              <SelectItem value="机构老用户">机构老用户</SelectItem>
              <SelectItem value="规划师新拓">规划师新拓</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="渠道" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部渠道</SelectItem>
              <SelectItem value="鼎团团">鼎团团</SelectItem>
              <SelectItem value="甄选">甄选</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-[150px]" />
          <span className="text-xs text-muted-foreground">至</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-[150px]" />
          <Select value={tab} onValueChange={setTab}>
            <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="待支付">待支付</SelectItem>
              <SelectItem value="已支付">已支付</SelectItem>
              <SelectItem value="退费中">退费中</SelectItem>
              <SelectItem value="已退费">已退费</SelectItem>
            </SelectContent>
          </Select>
          {hasFilter && (
            <Button size="sm" variant="ghost" onClick={resetFilters}><X className="h-3.5 w-3.5" /> 清空</Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">共 {filtered.length} 条</span>
        </div>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
            <TableHeader><TableRow>
              <TableHead>订单号</TableHead><TableHead>用户</TableHead><TableHead>手机号</TableHead>
              <TableHead>产品</TableHead><TableHead>类型</TableHead><TableHead>金额</TableHead>
              <TableHead>来源</TableHead><TableHead>渠道</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead>
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
                  <TableCell><Badge className={o.source === "机构老用户" ? "bg-info text-info-foreground" : "bg-success text-success-foreground"}>{o.source}</Badge></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{o.channel}</span></TableCell>
                  <TableCell><Badge variant={o.status === "已退费" ? "destructive" : o.status === "退费中" ? "secondary" : "default"}>{o.status}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setViewOrder(o)}><FileText className="h-3.5 w-3.5" /> 服务记录</Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={10} className="py-12 text-center text-muted-foreground">暂无数据</TableCell></TableRow>}
            </TableBody>
        </Table>
        <Pagination />
      </div>
      <SalesServicesSheet order={viewOrder} onOpenChange={(v) => !v && setViewOrder(null)} />
    </div>
  );
}