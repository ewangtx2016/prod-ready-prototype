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
import { Download, RotateCcw, Eye } from "lucide-react";
import { usePagination } from "@/components/dev/TablePagination";
import { SearchSelect } from "@/components/dev/SearchSelect";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ledger/")({ component: Page });

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

/** 计算账单净值 */
function netValue(b: BillSummary) {
  return b.profit + b.techFee + b.systemFee + b.marketingFee;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="h-5 w-1 rounded-full bg-primary" />
      <h2 className="text-sm font-medium">{children}</h2>
    </div>
  );
}

/** 获取日期所在周的周一 */
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

/** 获取日期所在周的周日 */
function getWeekEnd(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

/** 格式化周标签，如"2024年第52周" */
function formatWeekLabel(startDate: string): string {
  const d = new Date(startDate + "T00:00:00");
  const tmp = new Date(d);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${tmp.getFullYear()}年第${weekNo}周`;
}

/** 根据账单类型格式化周期显示 */
function formatPeriodLabel(billType: string, cycleStart: string, cycleEnd: string): string {
  if (billType === "day") return cycleStart;
  if (billType === "week") return `${formatWeekLabel(cycleStart)}（${cycleStart} ~ ${cycleEnd}）`;
  if (billType === "month") return `${cycleStart.slice(0, 7)}`;
  return `${cycleStart} ~ ${cycleEnd}`;
}

/** 月份最后一天 */
function getMonthEnd(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${monthStr}-${String(lastDay).padStart(2, "0")}`;
}

function defaultOrgValue(_role: string, _orgName: string) {
  return "all";
}

function Page() {
  const { role, orgName } = useApp();
  const currentUserName = ROLE_META[role].name;
  const allBills = useMemo(() => db.bills(), []);

  const [billType, setBillType] = useState<BillSummary["billType"]>("week");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fOrg, setFOrg] = useState(() => defaultOrgValue(role, orgName));

  // 初始化及切换账单类型时自动填充日期范围
  useEffect(() => {
    const typeBills = allBills.filter((b) => b.billType === billType);
    if (typeBills.length > 0) {
      const latest = [...typeBills].sort((a, b) => b.cycleStart.localeCompare(a.cycleStart))[0];
      setStartDate(latest.cycleStart);
      setEndDate(latest.cycleEnd);
    }
  }, [allBills, billType]);

  const orgOptions = useMemo(() => {
    if (role === "org_admin") return [orgName];
    return Array.from(new Set(allBills.map((b) => b.orgName).filter(Boolean)));
  }, [allBills, role, orgName]);

  const filtered = useMemo(() => {
    let arr = [...allBills];

    // 1. 按账单类型过滤
    arr = arr.filter((b) => b.billType === billType);

    // 2. 按机构过滤
    if (fOrg !== "all") {
      arr = arr.filter((b) => b.orgName === fOrg);
    }

    // 3. 按时间区间过滤
    if (startDate) {
      arr = arr.filter((b) => b.cycleEnd >= startDate);
    }
    if (endDate) {
      arr = arr.filter((b) => b.cycleStart <= endDate);
    }

    // 4. 按周期聚合：同一 cycleStart|cycleEnd 合并为一行，累加各类费用
    const grouped = new Map<string, BillSummary[]>();
    arr.forEach((b) => {
      const key = `${b.cycleStart}|${b.cycleEnd}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(b);
    });

    const aggregated: BillSummary[] = Array.from(grouped.entries()).map(([key, items]) => {
      const [cycleStart, cycleEnd] = key.split("|");
      return {
        id: items[0].id,
        billType,
        cycleStart,
        cycleEnd,
        orderAmount: items.reduce((s, b) => s + b.orderAmount, 0),
        paidAmount: items.reduce((s, b) => s + b.paidAmount, 0),
        discountAmount: items.reduce((s, b) => s + b.discountAmount, 0),
        profit: items.reduce((s, b) => s + b.profit, 0),
        techFee: items.reduce((s, b) => s + b.techFee, 0),
        systemFee: items.reduce((s, b) => s + b.systemFee, 0),
        marketingFee: items.reduce((s, b) => s + b.marketingFee, 0),
        count: items.reduce((s, b) => s + b.count, 0),
        accountName: items[0].accountName,
        orgName: items[0].orgName,
      };
    });

    // 6. 排序：周期倒序
    aggregated.sort((a, b) => b.cycleStart.localeCompare(a.cycleStart));

    return aggregated;
  }, [allBills, billType, fOrg, startDate, endDate]);

  const { paged, Pagination } = usePagination(filtered, 10);

  // 从明细中按结算状态统计机构分成（净值）
  const statusNetMap = useMemo(() => {
    const details = db.billDetails().filter((d) => {
      const date = d.time.slice(0, 10);
      return date >= startDate && date <= endDate;
    });
    return details.reduce(
      (acc, d) => {
        const net = d.profit + d.techFee + d.systemFee + d.marketingFee;
        if (d.status === "已结算") acc.settled += net;
        else acc.unsettled += net;
        return acc;
      },
      { settled: 0, unsettled: 0 }
    );
  }, [startDate, endDate]);

  const onReset = () => {
    setBillType("week");
    setFOrg(defaultOrgValue(role, orgName));
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
    const link = document.createElement("a");
    link.href = "/资金账单-导出模板.xlsx";
    link.download = `资金账单_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`已导出 资金账单_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">已结算机构分成</div>
          <div className={`mt-1 text-2xl font-semibold ${statusNetMap.settled >= 0 ? "" : "text-destructive"}`}>
            {money(statusNetMap.settled)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">未结算机构分成</div>
          <div className={`mt-1 text-2xl font-semibold ${statusNetMap.unsettled >= 0 ? "" : "text-destructive"}`}>
            {money(statusNetMap.unsettled)}
          </div>
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
            <div className="md:col-span-4">
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                {billType === "day" ? "日期区间" : billType === "week" ? "周区间" : "月份区间"}
              </Label>
              <div className="flex items-center gap-2">
                {billType === "month" ? (
                  <>
                    <Input
                      type="month"
                      value={startDate.slice(0, 7)}
                      onChange={(e) => setStartDate(`${e.target.value}-01`)}
                      className="h-8"
                    />
                    <span className="shrink-0 text-sm text-muted-foreground">至</span>
                    <Input
                      type="month"
                      value={endDate.slice(0, 7)}
                      onChange={(e) => setEndDate(getMonthEnd(e.target.value))}
                      className="h-8"
                    />
                  </>
                ) : billType === "week" ? (
                  <>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(getWeekStart(e.target.value))}
                      className="h-8"
                    />
                    <span className="shrink-0 text-sm text-muted-foreground">至</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(getWeekEnd(e.target.value))}
                      className="h-8"
                    />
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>

            {/* 机构名称 */}
            <div className="md:col-span-2">
              <Label className="mb-1.5 block text-xs text-muted-foreground">机构名称</Label>
              <SearchSelect
                value={fOrg}
                onChange={setFOrg}
                options={["all", ...orgOptions]}
                labels={{ all: "全部机构" }}
                placeholder="搜索机构名称"
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
                <TableHead className="text-xs font-medium">周期</TableHead>
                <TableHead className="text-xs font-medium">机构名称</TableHead>
                <TableHead className="text-xs font-medium text-right">订单金额</TableHead>
                <TableHead className="text-xs font-medium text-right">实付金额</TableHead>
                <TableHead className="text-xs font-medium text-right">优惠金额</TableHead>
                <TableHead className="text-xs font-medium text-right">保证金</TableHead>
                <TableHead className="text-xs font-medium text-right">平台技术服务费</TableHead>
                <TableHead className="text-xs font-medium text-right">系统费</TableHead>
                <TableHead className="text-xs font-medium text-right">营销费</TableHead>
                <TableHead className="text-xs font-medium text-right">机构分成</TableHead>
                <TableHead className="text-xs font-medium">笔数</TableHead>
                <TableHead className="text-xs font-medium">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.id}</TableCell>
                  <TableCell className="text-sm">{BILL_TYPE_LABEL[b.billType]}</TableCell>
                  <TableCell className="text-sm">
                    {formatPeriodLabel(b.billType, b.cycleStart, b.cycleEnd)}
                  </TableCell>
                  <TableCell className="text-sm">{b.orgName}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{money(b.orderAmount, false)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{money(b.paidAmount, false)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{money(b.discountAmount, false)}</TableCell>
                  <TableCell className={`text-right text-sm ${b.deposit !== 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {b.deposit !== 0 ? money(b.deposit) : "—"}
                  </TableCell>
                  <TableCell className={`text-right text-sm ${b.techFee !== 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {b.techFee !== 0 ? money(b.techFee) : "—"}
                  </TableCell>
                  <TableCell className={`text-right text-sm ${b.systemFee !== 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {b.systemFee !== 0 ? money(b.systemFee) : "—"}
                  </TableCell>
                  <TableCell className={`text-right text-sm ${b.marketingFee !== 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {b.marketingFee !== 0 ? money(b.marketingFee) : "—"}
                  </TableCell>
                  <TableCell className={`text-right text-sm font-medium ${netValue(b) >= 0 ? "" : "text-destructive"}`}>
                    {money(netValue(b))}
                  </TableCell>
                  <TableCell className="text-sm">{b.count} 笔</TableCell>
                  <TableCell>
                    <Link
                      to="/ledger/detail"
                      search={{
                        cycleStart: b.cycleStart,
                        cycleEnd: b.cycleEnd,
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
                  <TableCell colSpan={14} className="py-12 text-center text-muted-foreground">
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
        默认按周期倒序排列；日账单按天汇总、周账单按周汇总、月账单按月汇总。
      </p>
    </div>
  );
}
