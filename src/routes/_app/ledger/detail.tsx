import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { db, type BillDetail } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { PageHeader } from "@/components/dev/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, ArrowLeft, RotateCcw } from "lucide-react";
import { usePagination } from "@/components/dev/TablePagination";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ledger/detail")({ component: Page });

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
  const search = useSearch({ from: "/_app/ledger/detail" }) as Record<string, any>;

  const billId = (search.billId as string) || "";
  const cycleStart = (search.cycleStart as string) || "";
  const cycleEnd = (search.cycleEnd as string) || "";
  const bizType = (search.bizType as string) || "";
  const totalAmount = (search.amount as number) || 0;
  const totalCount = (search.count as number) || 0;
  const billType = (search.billType as string) || "";

  const allDetails = useMemo(() => db.billDetails().filter((d) => d.billId === billId), [billId]);

  const [keyword, setKeyword] = useState("");

  if (!billId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-lg font-medium">未选择账单</div>
        <p className="mt-2 text-sm text-muted-foreground">请从资金账单页面点击"查看明细"进入</p>
        <Link to="/ledger" className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="mr-1 h-4 w-4" /> 返回资金账单
          </Button>
        </Link>
      </div>
    );
  }

  const filtered = useMemo(() => {
    let arr = [...allDetails];

    const kw = keyword.trim();
    if (kw) {
      arr = arr.filter(
        (d) =>
          d.orderNo.toLowerCase().includes(kw.toLowerCase()) ||
          d.remark.toLowerCase().includes(kw.toLowerCase())
      );
    }

    arr.sort((a, b) => b.time.localeCompare(a.time));
    return arr;
  }, [allDetails, keyword]);

  const { paged, Pagination } = usePagination(filtered, 10);

  const onExport = () => {
    db.log({
      operator: currentUserName,
      role: currentUserName,
      module: "资金账单",
      action: "导出明细",
      detail: `导出账单明细 ${filtered.length} 条`,
    });
    toast.success(`已导出 bill-details.xlsx (${filtered.length} 条)`);
  };

  const onReset = () => {
    setKeyword("");
  };

  const periodLabel = (() => {
    if (billType === "month") return `${cycleStart.slice(0, 7)}`;
    if (billType === "week") return `${cycleStart} ~ ${cycleEnd}`;
    return cycleStart;
  })();

  const periodSubLabel = (() => {
    if (billType === "month") return "按月维度";
    if (billType === "week") return "按周维度";
    return "按日维度";
  })();

  return (
    <div>
      <PageHeader
        title="账单明细列表"
        subtitle="查看指定周期与业务类型下的每一笔账单明细记录，并支持二级筛选和导出。"
        actions={
          <div className="flex gap-2">
            <Link to="/ledger">
              <Button variant="outline" size="sm" className="h-8">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> 返回
              </Button>
            </Link>
            <Button size="sm" className="h-8" onClick={onExport}>
              <Download className="mr-1 h-3.5 w-3.5" /> 导出
            </Button>
          </div>
        }
      />

      {/* 统计卡片 */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">当前周期</div>
          <div className="mt-1 text-2xl font-semibold">{periodLabel}</div>
          <div className="mt-1 text-xs text-muted-foreground">{periodSubLabel}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">业务类型</div>
          <div className="mt-1 text-2xl font-semibold">{bizType || "-"}</div>
          <div className="mt-1 text-xs text-muted-foreground">当前下钻类型</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">总金额</div>
          <div className={`mt-1 text-2xl font-semibold ${totalAmount >= 0 ? "" : "text-destructive"}`}>
            {money(totalAmount)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">当前汇总金额</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">总笔数</div>
          <div className="mt-1 text-2xl font-semibold">{totalCount} 笔</div>
          <div className="mt-1 text-xs text-muted-foreground">当前汇总笔数</div>
        </Card>
      </div>

      {/* 明细筛选 */}
      <div className="mb-5">
        <SectionTitle>明细筛选</SectionTitle>
        <div className="rounded-lg border bg-card p-4">
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <Label className="mb-1.5 block text-xs text-muted-foreground">关键词</Label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索订单号 / 说明"
                className="h-8"
              />
            </div>
            <div className="md:col-span-8 flex gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={onReset}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> 重置
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 明细表格 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5 hover:bg-primary/5">
              <TableHead className="text-xs font-medium">时间</TableHead>
              <TableHead className="text-xs font-medium">业务类型</TableHead>
              <TableHead className="text-xs font-medium">订单号</TableHead>
              <TableHead className="text-xs font-medium">金额</TableHead>
              <TableHead className="text-xs font-medium">余额</TableHead>
              <TableHead className="text-xs font-medium">状态</TableHead>
              <TableHead className="text-xs font-medium">说明</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-sm">{d.time}</TableCell>
                <TableCell className="text-sm">{d.bizType}</TableCell>
                <TableCell className="font-mono text-xs">{d.orderNo}</TableCell>
                <TableCell className={`text-right text-sm font-medium ${d.amount >= 0 ? "" : "text-destructive"}`}>
                  {money(d.amount)}
                </TableCell>
                <TableCell className="text-right text-sm">{money(d.balance, false)}</TableCell>
                <TableCell className="text-sm">{d.status}</TableCell>
                <TableCell className="text-sm">{d.remark}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">
            当前明细 {filtered.length} 条，支持 Excel 导出
          </span>
          <Pagination />
        </div>
      </Card>
    </div>
  );
}
