import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { db, type LedgerItem } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { maskName } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, X, Download, Coins, AlertTriangle } from "lucide-react";
import { SplitDetailSheet } from "@/components/ledger/SplitDetailSheet";
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

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<LedgerItem[]>([]);
  const [detail, setDetail] = useState<LedgerItem | null>(null);

  // 筛选条件
  const [status, setStatus] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [planner, setPlanner] = useState<string>("all");
  const [dateField, setDateField] = useState<"settledAt" | "createdAt">("settledAt");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let arr = db.ledger();
    if (role === "planner") arr = arr.filter((l) => l.plannerName === "李规划");
    setList(arr);
  }, [role]);

  const planners = useMemo(() => Array.from(new Set(list.map((l) => l.plannerName))), [list]);

  const kw = keyword.trim().toLowerCase();
  const filtered = list.filter((l) => {
    if (status !== "all" && l.status !== status) return false;
    if (planner !== "all" && l.plannerName !== planner) return false;
    if (kw && !(
      l.id.toLowerCase().includes(kw) ||
      l.orderId.toLowerCase().includes(kw) ||
      l.userName.toLowerCase().includes(kw) ||
      l.course.toLowerCase().includes(kw)
    )) return false;
    const dateVal = (dateField === "settledAt" ? l.settledAt : undefined) ?? "";
    if (startDate && dateVal && dateVal.slice(0, 10) < startDate) return false;
    if (endDate && dateVal && dateVal.slice(0, 10) > endDate) return false;
    if ((startDate || endDate) && dateField === "settledAt" && !l.settledAt) return false;
    return true;
  });

  const { paged, Pagination } = usePagination(filtered, 10);

  const total      = filtered.reduce((s, x) => s + x.amount, 0);
  const orgTotal   = filtered.reduce((s, x) => s + x.orgAmount, 0);
  const planTotal  = filtered.reduce((s, x) => s + x.plannerAmount, 0);
  const platTotal  = filtered.reduce((s, x) => s + x.platformAmount, 0);
  const abnormalCount = filtered.filter((l) => l.status === "abnormal").length;

  const hasFilter = !!(kw || status !== "all" || planner !== "all" || startDate || endDate);
  const reset = () => { setKeyword(""); setStatus("all"); setPlanner("all"); setStartDate(""); setEndDate(""); };

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

      <div className="grid grid-cols-4 gap-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">订单总额</div><div className="text-2xl font-semibold mt-1">¥{total.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">机构分成</div><div className="text-2xl font-semibold mt-1 text-info">¥{orgTotal.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">规划师分成</div><div className="text-2xl font-semibold mt-1 text-success">¥{planTotal.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">平台分成</div><div className="text-2xl font-semibold mt-1">¥{platTotal.toLocaleString()}</div></Card>
      </div>

      <div className="mb-3 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索订单号 / 结算单号 / 用户" className="h-9 pl-7" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="状态" /></SelectTrigger>
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
          <Select value={planner} onValueChange={setPlanner}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="规划师" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部规划师</SelectItem>
              {planners.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dateField} onValueChange={(v) => setDateField(v as "settledAt" | "createdAt")}>
            <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="settledAt">结算时间</SelectItem>
              <SelectItem value="createdAt">创建时间</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-[150px]" />
          <span className="text-xs text-muted-foreground">至</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-[150px]" />
          {hasFilter && <Button size="sm" variant="ghost" onClick={reset}><X className="h-3.5 w-3.5" /> 清空</Button>}
          <span className="ml-auto text-xs text-muted-foreground">共 {filtered.length} 条</span>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>结算单号</TableHead><TableHead>订单号</TableHead><TableHead>用户</TableHead><TableHead>课程</TableHead>
            <TableHead>订单金额</TableHead><TableHead>机构</TableHead><TableHead>规划师</TableHead><TableHead>平台</TableHead>
            <TableHead>状态</TableHead><TableHead>结算时间</TableHead><TableHead className="text-right">操作</TableHead>
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
                  <TableCell className="font-medium">¥{l.amount.toLocaleString()}</TableCell>
                  <TableCell className={isRefund ? "text-destructive" : "text-info"}>{isRefund ? "-" : ""}¥{l.orgAmount.toLocaleString()}</TableCell>
                  <TableCell className={isRefund ? "text-destructive" : "text-success"}>{isRefund ? "-" : ""}¥{l.plannerAmount.toLocaleString()}</TableCell>
                  <TableCell>¥{l.platformAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={meta.tone} className={meta.cls}>{meta.label}</Badge>
                    {l.status === "abnormal" && l.abnormalReason && <div className="mt-1 text-xs text-destructive">{l.abnormalReason}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.settledAt || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setDetail(l)}><Coins className="h-3.5 w-3.5" /> 分成明细</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={11} className="py-12 text-center text-muted-foreground">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
        <Pagination />
      </Card>
      <SplitDetailSheet item={detail} onOpenChange={(v) => !v && setDetail(null)} />
    </div>
  );
}