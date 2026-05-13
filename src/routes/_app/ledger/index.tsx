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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertTriangle } from "lucide-react";
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

  // 筛选条件
  const [status, setStatus] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [productType, setProductType] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [planner, setPlanner] = useState<string>("all");
  const [org, setOrg] = useState<string>(() => defaultOrgValue(role, orgName));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const isPlanner = role === "planner";
  const currentUserName = ROLE_META[role].name;
  const orders = allOrders;
  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);
  const getLedgerOrg = useCallback((item: LedgerItem) => orderById.get(item.orderId)?.orgName ?? "", [orderById]);
  const getLedgerProductType = useCallback((item: LedgerItem) => productTypeLabel(orderById.get(item.orderId)?.courseType ?? ""), [orderById]);
  const getLedgerChannel = useCallback((item: LedgerItem) => orderById.get(item.orderId)?.channel ?? "", [orderById]);
  const getLedgerTutor = useCallback((item: LedgerItem) => orderById.get(item.orderId)?.tutorName ?? "", [orderById]);
  const productTypeOptions = ["课程", "学习机", "会员服务"];

  useEffect(() => {
    let arr = db.ledger();
    arr = filterByDataPerm(arr, "ledger", role, currentUserName, orgName);
    setList(arr);
  }, [role, currentUserName, orgName]);

  const planners = useMemo(() => Array.from(new Set(list.map((l) => l.plannerName))), [list]);
  const orgs = useMemo(() => {
    if (role === "org_admin") return [orgName];
    return Array.from(new Set(list.map(getLedgerOrg).filter(Boolean)));
  }, [list, getLedgerOrg, role, orgName]);

  const kw = keyword.trim().toLowerCase();
  const filtered = list.filter((l) => {
    if (status !== "all" && l.status !== status) return false;
    if (productType !== "all" && getLedgerProductType(l) !== productType) return false;
    if (channel !== "all" && getLedgerChannel(l) !== channel) return false;
    if (!isPlanner && planner !== "all" && l.plannerName !== planner) return false;
    if (org !== "all" && getLedgerOrg(l) !== org) return false;
    if (kw && !(
      l.id.toLowerCase().includes(kw) ||
      l.orderId.toLowerCase().includes(kw) ||
      l.userName.toLowerCase().includes(kw) ||
      l.course.toLowerCase().includes(kw) ||
      getLedgerProductType(l).toLowerCase().includes(kw) ||
      getLedgerChannel(l).toLowerCase().includes(kw) ||
      l.plannerName.toLowerCase().includes(kw) ||
      getLedgerTutor(l).toLowerCase().includes(kw) ||
      getLedgerOrg(l).toLowerCase().includes(kw) ||
      (l.abnormalReason ?? "").toLowerCase().includes(kw)
    )) return false;
    const dateVal = l.settledAt ?? "";
    if (startDate && dateVal && dateVal.slice(0, 10) < startDate) return false;
    if (endDate && dateVal && dateVal.slice(0, 10) > endDate) return false;
    if ((startDate || endDate) && !l.settledAt) return false;
    return true;
  });

  const { paged, Pagination } = usePagination(filtered, 10);

  const normalRows = filtered.filter((x) => x.status === "settled" || x.status === "pending" || x.status === "estimated");
  const refundRows = filtered.filter((x) => x.status === "refund_pending" || x.status === "refund_settled");
  const abnormalRows = filtered.filter((x) => x.status === "abnormal");
  const sum = (rows: LedgerItem[], pick: (x: LedgerItem) => number) => rows.reduce((s, x) => s + pick(x), 0);
  const summaryRows = (() => {
    if (status === "refund_pending" || status === "refund_settled") {
      return [
        { label: "退回订单总额", value: money(sum(refundRows, (x) => x.amount)), className: "text-destructive" },
        { label: "影响机构分成", value: money(sum(refundRows, (x) => x.orgAmount)), className: "text-destructive" },
        { label: "影响规划师分成", value: money(sum(refundRows, (x) => x.plannerAmount)), className: "text-destructive" },
        { label: "影响平台分成", value: money(sum(refundRows, (x) => x.platformAmount)), className: "text-destructive" },
      ];
    }
    if (status === "abnormal") {
      return [
        { label: "异常订单总额", value: money(sum(abnormalRows, (x) => x.amount)), className: "text-destructive" },
        { label: "异常笔数", value: `${abnormalRows.length} 笔`, className: "text-destructive" },
        { label: "涉及机构分成", value: money(sum(abnormalRows, (x) => x.orgAmount)), className: "text-info" },
        { label: "涉及规划师分成", value: money(sum(abnormalRows, (x) => x.plannerAmount)), className: "text-success" },
      ];
    }
    if (status === "all") {
      return [
        { label: "订单总额", value: money(sum(normalRows, (x) => x.amount)), className: "" },
        { label: "机构分成", value: money(sum(normalRows, (x) => x.orgAmount)), className: "text-info" },
        { label: "规划师分成", value: money(sum(normalRows, (x) => x.plannerAmount)), className: "text-success" },
        { label: "平台分成", value: money(sum(normalRows, (x) => x.platformAmount)), className: "" },
        { label: "异常订单", value: `${abnormalRows.length} 笔`, className: abnormalRows.length ? "text-destructive" : "" },
        { label: "退单金额", value: money(sum(refundRows, (x) => x.amount)), className: "text-destructive" },
      ];
    }
    return [
      { label: "订单总额", value: money(sum(normalRows, (x) => x.amount)), className: "" },
      { label: "机构分成", value: money(sum(normalRows, (x) => x.orgAmount)), className: "text-info" },
      { label: "规划师分成", value: money(sum(normalRows, (x) => x.plannerAmount)), className: "text-success" },
      { label: "平台分成", value: money(sum(normalRows, (x) => x.platformAmount)), className: "" },
    ];
  })();
  const abnormalCount = filtered.filter((l) => l.status === "abnormal").length;

  const reset = () => { setKeyword(""); setStatus("all"); setProductType("all"); setChannel("all"); setPlanner("all"); setOrg(defaultOrgValue(role, orgName)); setStartDate(""); setEndDate(""); };

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
        <div>· 状态：已结算 / 待结算 / 预估收入 / 退回中 / 已退回 / 异常</div>
        <div>· 数据来源：分账成功事件回调（准实时 ≤10s）</div>
        <div>· 导出：按当前筛选项导出 .xlsx；非机构管理员仅看到脱敏数据</div>
      </DevNote>

      {abnormalCount > 0 && status !== "abnormal" && (
        <Alert className="mb-4 border-destructive/40 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription>当前筛选下存在 <b>{abnormalCount}</b> 条异常台账，可切换「异常」状态查看详情</AlertDescription>
        </Alert>
      )}

      <div className={`mb-4 grid gap-3 ${status === "all" ? "grid-cols-6" : "grid-cols-4"}`}>
        {summaryRows.map((item) => (
          <Card key={item.label} className="p-4">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className={`mt-1 text-2xl font-semibold ${item.className}`}>{item.value}</div>
          </Card>
        ))}
      </div>

      <div className={`mb-3 grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 ${isPlanner ? "md:grid-cols-8" : "md:grid-cols-9"}`}>
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs text-muted-foreground">关键词</Label>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={isPlanner ? "搜索订单号 / 结算单号 / 用户 / 机构" : "搜索订单号 / 结算单号 / 用户 / 机构 / 规划师"} className="h-8" />
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
          <Label className="text-xs text-muted-foreground">状态</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="settled">已结算</SelectItem>
              <SelectItem value="pending">待结算</SelectItem>
              <SelectItem value="estimated">预估收入</SelectItem>
              <SelectItem value="refund_pending">退回中</SelectItem>
              <SelectItem value="refund_settled">已退回</SelectItem>
              <SelectItem value="abnormal">异常</SelectItem>
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
              {orgs.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {!isPlanner && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">规划师</Label>
            <Select value={planner} onValueChange={setPlanner}>
              <SelectTrigger className="h-8"><SelectValue placeholder="规划师" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部规划师</SelectItem>
                {planners.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
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
            <TableHead>渠道</TableHead><TableHead>机构名称</TableHead><TableHead>规划师名称</TableHead><TableHead>学管师</TableHead><TableHead>订单金额</TableHead><TableHead>机构分成</TableHead><TableHead>规划师分成</TableHead><TableHead>平台</TableHead>
            <TableHead>状态</TableHead><TableHead>结算时间</TableHead>
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
                  <TableCell><span className="text-xs text-muted-foreground">{getLedgerChannel(l) || "-"}</span></TableCell>
                  <TableCell>{getLedgerOrg(l) || "-"}</TableCell>
                  <TableCell>{l.plannerName}</TableCell>
                  <TableCell>{getLedgerTutor(l) || "-"}</TableCell>
                  <TableCell className="font-medium">¥{l.amount.toLocaleString()}</TableCell>
                  <TableCell className={isRefund ? "text-destructive" : "text-info"}>{isRefund ? "-" : ""}¥{l.orgAmount.toLocaleString()}</TableCell>
                  <TableCell className={isRefund ? "text-destructive" : "text-success"}>{isRefund ? "-" : ""}¥{l.plannerAmount.toLocaleString()}</TableCell>
                  <TableCell>¥{l.platformAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={meta.tone} className={meta.cls}>{meta.label}</Badge>
                    {l.status === "abnormal" && l.abnormalReason && <div className="mt-1 text-xs text-destructive">{l.abnormalReason}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.settledAt || "-"}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={15} className="py-12 text-center text-muted-foreground">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
        <Pagination />
      </Card>
    </div>
  );
}
