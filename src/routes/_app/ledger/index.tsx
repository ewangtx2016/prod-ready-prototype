import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { db, type BillSummary } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { PageHeader } from "@/components/dev/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RotateCcw, Eye } from "lucide-react";
import { usePagination } from "@/components/dev/TablePagination";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ledger/")({ component: Page });

const BIZ_TYPES = ["全部", "分润", "提现", "平台技术服务费", "手续费"];

const BILL_TYPE_LABEL: Record<BillSummary["billType"], string> = {
  day: "日账单",
  week: "周账单",
  month: "月账单",
};

const BILL_TYPE_TAB: { key: BillSummary["billType"]; label: string }[] = [
  { key: "day", label: "日账单" },
  { key: "week", label: "周账单" },
  { key: "month", label: "月账单" },
];

function money(v: number, showPlus = true) {
  const abs = Math.abs(v);
  const sign = v >= 0 ? (showPlus ? "+" : "") : "-";
  return `${sign}¥${abs.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="h-5 w-1 rounded-full bg-primary" />
      <h2 className="text-sm font-medium">{children}</h2>
    </div>
  );
}

function Page() {
  const { role } = useApp();
  const currentUserName = ROLE_META[role].name;
  const allBills = useMemo(() => db.bills(), []);

  const [billType, setBillType] = useState<BillSummary["billType"]>("week");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bizType, setBizType] = useState("全部");
  const [accountName, setAccountName] = useState("");

  // 初始化及切换账单类型时自动填充日期范围
  useEffect(() => {
    const typeBills = allBills.filter((b) => b.billType === billType);
    if (typeBills.length > 0) {
      const latest = [...typeBills].sort((a, b) => b.cycleStart.localeCompare(a.cycleStart))[0];
      setStartDate(latest.cycleStart);
      setEndDate(latest.cycleEnd);
    }
  }, [allBills, billType]);

  const filtered = useMemo(() => {
    let arr = [...allBills];

    arr = arr.filter((b) => b.billType === billType);

    if (startDate) {
      arr = arr.filter((b) => b.cycleEnd >= startDate);
    }
    if (endDate) {
      arr = arr.filter((b) => b.cycleStart <= endDate);
    }

    if (bizType !== "全部") {
      arr = arr.filter((b) => b.bizType === bizType);
    }

    const kw = accountName.trim();
    if (kw) {
      arr = arr.filter((b) => b.accountName.includes(kw));
    }

    arr.sort((a, b) => {
      if (a.cycleStart !== b.cycleStart) {
        return b.cycleStart.localeCompare(a.cycleStart);
      }
      return a.bizType.localeCompare(b.bizType);
    });

    return arr;
  }, [allBills, billType, startDate, endDate, bizType, accountName]);

  const { paged, Pagination } = usePagination(filtered, 10);

  const totalAmount = useMemo(() => filtered.reduce((s, b) => s + b.amount, 0), [filtered]);
  const totalCount = useMemo(() => filtered.reduce((s, b) => s + b.count, 0), [filtered]);
  const inflow = useMemo(() => filtered.filter((b) => b.amount > 0).reduce((s, b) => s + b.amount, 0), [filtered]);
  const outflow = useMemo(() => filtered.filter((b) => b.amount < 0).reduce((s, b) => s + b.amount, 0), [filtered]);
  const netInflow = inflow + outflow;

  const onReset = () => {
    setBillType("week");
    setBizType("全部");
    setAccountName("");
    const weekBills = allBills.filter((b) => b.billType === "week");
    if (weekBills.length > 0) {
      const latest = [...weekBills].sort((a, b) => b.cycleStart.localeCompare(a.cycleStart))[0];
      setStartDate(latest.cycleStart);
      setEndDate(latest.cycleEnd);
    }
  };

  const onExport = () => {
    db.log({
      operator: currentUserName,
      role: currentUserName,
      module: "资金账单",
      action: "导出",
      detail: `导出账单汇总 ${filtered.length} 条`,
    });
    toast.success(`已导出 bills.xlsx (${filtered.length} 条)`);
  };

  return (
    <div>
      <PageHeader
        title="资金账单"
        subtitle="按账单类型与业务类型查看账单汇总，并支持下钻查看明细记录。"
        actions={
          <Button size="sm" className="h-8" onClick={onExport}>
            <Download className="mr-1 h-3.5 w-3.5" /> 导出
          </Button>
        }
      />

      {/* 统计卡片 */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">总金额</div>
          <div className={`mt-1 text-2xl font-semibold ${totalAmount >= 0 ? "" : "text-destructive"}`}>
            {money(totalAmount)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">收入为正，支出为负</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">总笔数</div>
          <div className="mt-1 text-2xl font-semibold">{totalCount.toLocaleString()} 笔</div>
          <div className="mt-1 text-xs text-muted-foreground">当前筛选条件下汇总</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">净流入</div>
          <div className={`mt-1 text-2xl font-semibold ${netInflow >= 0 ? "" : "text-destructive"}`}>
            {money(netInflow, false)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">总收入 - 总支出</div>
        </Card>
      </div>

      {/* 筛选区域 */}
      <div className="mb-5">
        <SectionTitle>账单汇总查询</SectionTitle>
        <div className="rounded-lg border bg-card p-4">
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
            {/* 账单类型 */}
            <div className="md:col-span-2">
              <Label className="mb-1.5 block text-xs text-muted-foreground">账单类型</Label>
              <div className="flex rounded-md border overflow-hidden">
                {BILL_TYPE_TAB.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setBillType(t.key)}
                    className={`flex-1 px-2 py-1.5 text-sm transition-colors ${
                      billType === t.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 时间选择区间 */}
            <div className="md:col-span-3">
              <Label className="mb-1.5 block text-xs text-muted-foreground">时间选择区间</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8"
                />
                <span className="shrink-0 text-sm text-muted-foreground">至</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8"
                />
              </div>
            </div>

            {/* 业务类型 */}
            <div className="md:col-span-2">
              <Label className="mb-1.5 block text-xs text-muted-foreground">业务类型</Label>
              <Select value={bizType} onValueChange={setBizType}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BIZ_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 账户名称 */}
            <div className="md:col-span-3">
              <Label className="mb-1.5 block text-xs text-muted-foreground">账户名称</Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="请输入账户名称"
                className="h-8"
              />
            </div>

            {/* 按钮 */}
            <div className="md:col-span-2 flex gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={onReset}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> 重置
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div>
        <SectionTitle>账单汇总列表</SectionTitle>
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/5 hover:bg-primary/5">
                <TableHead className="text-xs font-medium">账单ID</TableHead>
                <TableHead className="text-xs font-medium">账单类型</TableHead>
                <TableHead className="text-xs font-medium">周期开始日期</TableHead>
                <TableHead className="text-xs font-medium">周期结束日期</TableHead>
                <TableHead className="text-xs font-medium">业务类型</TableHead>
                <TableHead className="text-xs font-medium">总金额</TableHead>
                <TableHead className="text-xs font-medium">笔数</TableHead>
                <TableHead className="text-xs font-medium">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.id}</TableCell>
                  <TableCell className="text-sm">{BILL_TYPE_LABEL[b.billType]}</TableCell>
                  <TableCell className="text-sm">{b.cycleStart}</TableCell>
                  <TableCell className="text-sm">{b.cycleEnd}</TableCell>
                  <TableCell className="text-sm">{b.bizType}</TableCell>
                  <TableCell className={`text-right text-sm font-medium ${b.amount >= 0 ? "" : "text-destructive"}`}>
                    {money(b.amount)}
                  </TableCell>
                  <TableCell className="text-sm">{b.count} 笔</TableCell>
                  <TableCell>
                    <Link
                      to="/ledger/detail"
                      search={{
                        billId: b.id,
                        cycleStart: b.cycleStart,
                        cycleEnd: b.cycleEnd,
                        bizType: b.bizType,
                        amount: b.amount,
                        count: b.count,
                        billType: b.billType,
                      }}
                    >
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        <Eye className="mr-1 h-3 w-3" /> 查看明细
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination />
        </Card>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        默认按周期开始日期倒序 + 业务类型排序。
      </p>
    </div>
  );
}
