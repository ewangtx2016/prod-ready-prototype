import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { db, type LedgerItem } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { filterByDataPerm } from "@/lib/permissions";
import { maskName } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { usePagination } from "@/components/dev/TablePagination";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ledger/")({ component: Page });

const STATUS_META: Record<LedgerItem["status"], { label: string; tone: "default" | "secondary" | "outline" | "destructive"; cls?: string }> = {
  settled:        { label: "已结算",   tone: "default" },
  pending:        { label: "待结算",   tone: "outline", cls: "text-warning" },
  estimated:      { label: "预估收入", tone: "secondary" },
  refund_pending: { label: "退回中",   tone: "secondary" },
  refund_settled: { label: "已退回",   tone: "destructive" },
  abnormal:       { label: "异常",     tone: "destructive" },
};

function productTypeLabel(type: string) {
  return ["学科课", "素养课", "体验课"].includes(type) ? "课程" : type;
}

function money(v: number) {
  return `¥${v.toLocaleString()}`;
}

function defaultOrgValue(_role: string, _orgName: string) {
  return "all";
}

function Page() {
  const { role, orgName } = useApp();
  const [list, setList] = useState<LedgerItem[]>([]);
  const allOrders = useMemo(() => db.orders(), []);

  // Tab 分类：all | estimated | settlement | refund | abnormal
  const [activeTab, setActiveTab] = useState<"all" | "estimated" | "settlement" | "refund" | "abnormal">("all");
  const [keyword, setKeyword] = useState("");
  const [productType, setProductType] = useState<string>("all");
  const [org, setOrg] = useState<string>(() => defaultOrgValue(role, orgName));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const isPlanner = role === "planner";
  const currentUserName = ROLE_META[role].name;

  function toggleSort(field: string) {
    if (sortField !== field) {
      setSortField(field);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortField(null);
      setSortDir(null);
    }
  }
  const orders = allOrders;
  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);
  const getLedgerOrg = useCallback((item: LedgerItem) => orderById.get(item.orderId)?.orgName ?? "", [orderById]);
  const getLedgerProductType = useCallback((item: LedgerItem) => productTypeLabel(orderById.get(item.orderId)?.courseType ?? ""), [orderById]);
  const getLedgerTutor = useCallback((item: LedgerItem) => orderById.get(item.orderId)?.tutorName ?? "", [orderById]);
  const productTypeOptions = ["课程", "学习机", "会员服务"];

  useEffect(() => {
    let arr = db.ledger();
    arr = filterByDataPerm(arr, "ledger", role, currentUserName, orgName);
    setList(arr);
  }, [role, currentUserName, orgName]);

  const orgs = useMemo(() => {
    if (role === "org_admin") return [orgName];
    return Array.from(new Set(list.map(getLedgerOrg).filter(Boolean)));
  }, [list, getLedgerOrg, role, orgName]);

  const kw = keyword.trim().toLowerCase();
  const filtered = list.filter((l) => {
    if (activeTab === "estimated" && l.status !== "estimated") return false;
    if (activeTab === "settlement" && l.status !== "settled" && l.status !== "pending") return false;
    if (activeTab === "refund" && l.status !== "refund_pending" && l.status !== "refund_settled") return false;
    if (activeTab === "abnormal" && l.status !== "abnormal") return false;
    if (productType !== "all" && getLedgerProductType(l) !== productType) return false;
    if (org !== "all" && getLedgerOrg(l) !== org) return false;
    if (kw && !(
      l.id.toLowerCase().includes(kw) ||
      l.orderId.toLowerCase().includes(kw) ||
      l.userName.toLowerCase().includes(kw) ||
      l.course.toLowerCase().includes(kw) ||
      getLedgerProductType(l).toLowerCase().includes(kw) ||
      l.plannerName.toLowerCase().includes(kw) ||
      getLedgerTutor(l).toLowerCase().includes(kw) ||
      (l.abnormalReason ?? "").toLowerCase().includes(kw)
    )) return false;
    const dateVal = l.settledAt ?? "";
    if (startDate && dateVal && dateVal.slice(0, 10) < startDate) return false;
    if (endDate && dateVal && dateVal.slice(0, 10) > endDate) return false;
    if ((startDate || endDate) && !l.settledAt) return false;
    return true;
  });

  const { paged, Pagination } = usePagination(filtered, 10);

  const sum = (rows: LedgerItem[], pick: (x: LedgerItem) => number) => rows.reduce((s, x) => s + pick(x), 0);
  const summaryRows = (() => {
    const totalAmt = sum(filtered, (x) => x.amount);
    const orgAmt = sum(filtered, (x) => x.orgAmount);

    if (activeTab === "refund") {
      return [
        { label: "退回订单总额", value: money(totalAmt), className: "text-destructive" },
        { label: "影响机构分成", value: money(orgAmt), className: "text-destructive" },
      ];
    }
    if (activeTab === "abnormal") {
      return [
        { label: "异常台账总额", value: money(totalAmt), className: "text-destructive" },
        { label: "异常台账", value: `${filtered.length} 笔`, className: "text-destructive" },
        { label: "涉及机构分成", value: money(orgAmt), className: "text-info" },
      ];
    }
    if (activeTab === "all") {
      const refundAmt = sum(list.filter((x) => x.status === "refund_pending" || x.status === "refund_settled"), (x) => x.amount);
      const abnormalCnt = list.filter((x) => x.status === "abnormal").length;
      return [
        { label: "订单总额", value: money(totalAmt), className: "" },
        { label: "机构分成", value: money(orgAmt), className: "text-info" },
        { label: "异常台账", value: `${abnormalCnt} 笔`, className: abnormalCnt ? "text-destructive" : "" },
        { label: "退单金额", value: money(refundAmt), className: "text-destructive" },
      ];
    }
    return [
      { label: "订单总额", value: money(totalAmt), className: "" },
      { label: "机构分成", value: money(orgAmt), className: "text-info" },
    ];
  })();

  const reset = () => { setKeyword(""); setActiveTab("all"); setProductType("all"); setOrg(defaultOrgValue(role, orgName)); setStartDate(""); setEndDate(""); };

  const onExport = () => {
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "台账管理", action: "导出", detail: `${filtered.length} 条 (脱敏)` });
    toast.success(`已导出 ledger.xlsx (${filtered.length} 条，脱敏)`);
  };

  return (
    <div>
      <PageHeader title="台账管理" subtitle="结算 / 退回 / 异常台账统一查询" actions={
        <PermissionTip action="导出台账" prd="§10 / §16.5" allow={["org_admin", "planner"]} desc="导出走脱敏规则">
          <Button size="sm" onClick={onExport}><Download className="h-4 w-4" /> 导出</Button>
        </PermissionTip>
      } />
      <DevNote prd="§10" title="台账管理">
        <div>· Tab 分类：全部 / 预估收入 / 结算 / 退单 / 异常</div>
        <div>· 数据来源：分账成功事件回调（准实时 ≤10s）</div>
        <div>· 导出：按当前筛选项导出 .xlsx；非机构管理员仅看到脱敏数据</div>
      </DevNote>

      <div className={`mb-4 grid gap-3 ${activeTab === "all" ? "grid-cols-4" : "grid-cols-3"}`}>
        {summaryRows.map((item) => (
          <Card key={item.label} className="p-4">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className={`mt-1 text-2xl font-semibold ${item.className}`}>{item.value}</div>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-3">
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="estimated">预估收入</TabsTrigger>
          <TabsTrigger value="settlement">结算</TabsTrigger>
          <TabsTrigger value="refund">退单</TabsTrigger>
          <TabsTrigger value="abnormal">异常</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-3 grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 md:grid-cols-6">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs text-muted-foreground">关键词</Label>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索订单号 / 结算单号 / 用户" className="h-8" />
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
          <Label className="text-xs text-muted-foreground">机构</Label>
          <Select value={org} onValueChange={setOrg}>
            <SelectTrigger className="h-8"><SelectValue placeholder="机构" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部机构</SelectItem>
              {orgs.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
            <Button variant="ghost" size="sm" className="h-8" onClick={reset}>重置</Button>
          </div>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>结算单号</TableHead><TableHead>订单号</TableHead><TableHead>用户</TableHead><TableHead>产品名称</TableHead><TableHead>产品类型</TableHead>
            <TableHead>机构名称</TableHead><TableHead>规划师名称</TableHead><TableHead>学管师</TableHead><TableHead>订单金额</TableHead>
            <TableHead onClick={() => toggleSort("orgAmount")} className="cursor-pointer select-none"><div className="flex items-center gap-1">机构分成{sortField === "orgAmount" && sortDir === "asc" && <ArrowUp className="h-3 w-3" />}{sortField === "orgAmount" && sortDir === "desc" && <ArrowDown className="h-3 w-3" />}{sortField !== "orgAmount" && <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}</div></TableHead>
            <TableHead>状态</TableHead>
            <TableHead onClick={() => toggleSort("settledAt")} className="cursor-pointer select-none"><div className="flex items-center gap-1">结算时间{sortField === "settledAt" && sortDir === "asc" && <ArrowUp className="h-3 w-3" />}{sortField === "settledAt" && sortDir === "desc" && <ArrowDown className="h-3 w-3" />}{sortField !== "settledAt" && <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}</div></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {paged.map((l) => {
              const meta = STATUS_META[l.status];
              const isRefund = l.status === "refund_pending" || l.status === "refund_settled";
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.id}</TableCell>
                  <TableCell className="font-mono text-xs">{l.orderId}</TableCell>
                  <TableCell>{maskName(l.userName, role)}</TableCell>
                  <TableCell>{l.course}</TableCell>
                  <TableCell><Badge variant="outline">{getLedgerProductType(l) || "-"}</Badge></TableCell>
                  <TableCell>{getLedgerOrg(l) || "-"}</TableCell>
                  <TableCell>{l.plannerName}</TableCell>
                  <TableCell>{getLedgerTutor(l) || "-"}</TableCell>
                  <TableCell className="font-medium">¥{l.amount.toLocaleString()}</TableCell>
                  <TableCell className={isRefund ? "text-destructive" : "text-info"}>{isRefund ? "-" : ""}¥{l.orgAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={meta.tone} className={meta.cls}>{meta.label}</Badge>
                    {l.status === "abnormal" && l.abnormalReason && <div className="mt-1 text-xs text-destructive">{l.abnormalReason}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.settledAt || "-"}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={12} className="py-12 text-center text-muted-foreground">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
        <Pagination />
      </Card>
    </div>
  );
}
