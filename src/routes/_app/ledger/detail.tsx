import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { db } from "@/lib/mock";
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

/** 计算单行净额（机构分成 + 各类费用） */
function netAmount(row: ReturnType<typeof db.billDetails>[number]) {
  return row.profit + row.deposit + row.techFee + row.systemFee + row.marketingFee;
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

  const cycleStart = (search.cycleStart as string) || "";
  const cycleEnd = (search.cycleEnd as string) || "";

  const [keyword, setKeyword] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  // 按时间范围查询明细
  const allDetails = useMemo(() => {
    return db.billDetails().filter((d) => {
      const date = d.time.slice(0, 10);
      return date >= cycleStart && date <= cycleEnd;
    });
  }, [cycleStart, cycleEnd]);

  if (!cycleStart || !cycleEnd) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-lg font-medium">未选择账单</div>
        <p className="mt-2 text-sm text-muted-foreground">请从资金账单页面点击"查看明细"进入</p>
        <Link to="/ledger">
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
          d.productName.toLowerCase().includes(kw.toLowerCase())
      );
    }

    if (sortField && sortDir) {
      const dir = sortDir === "asc" ? 1 : -1;
      arr.sort((a, b) => {
        if (sortField === "time") {
          return a.time.localeCompare(b.time) * dir;
        }
        if (sortField === "orderAmount") {
          return (a.orderAmount - b.orderAmount) * dir;
        }
        if (sortField === "paidAmount") {
          return (a.paidAmount - b.paidAmount) * dir;
        }
        if (sortField === "netAmount") {
          return (netAmount(a) - netAmount(b)) * dir;
        }
        return 0;
      });
    } else {
      arr.sort((a, b) => b.time.localeCompare(a.time));
    }
    return arr;
  }, [allDetails, keyword, sortField, sortDir]);

  const { paged, Pagination } = usePagination(filtered, 10);

  // 按结算状态统计机构分成（净值）
  const statusNetMap = useMemo(() => {
    return filtered.reduce(
      (acc, d) => {
        const net = netAmount(d);
        if (d.status === "已结算") acc.settled += net;
        else acc.unsettled += net;
        return acc;
      },
      { settled: 0, unsettled: 0 }
    );
  }, [filtered]);

  const onExport = () => {
    db.log({
      operator: currentUserName,
      role: currentUserName,
      module: "资金账单",
      action: "导出明细",
      detail: `导出账单明细 ${filtered.length} 条`,
    });
    const link = document.createElement("a");
    link.href = "/资金账单-明细-导出模板.xlsx";
    link.download = `资金账单-明细_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`已导出 资金账单-明细_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const onReset = () => {
    setKeyword("");
    setSortField(null);
    setSortDir(null);
  };

  function toggleSort(field: string) {
    if (sortField !== field) {
      setSortField(field);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortField(null);
      setSortDir(null);
    }
  }

  const sortIcon = (field: string) => {
    if (sortField !== field) return "⇅";
    return sortDir === "desc" ? "↓" : "↑";
  };

  return (
    <div>
      <PageHeader
        title="账单明细列表"
        subtitle="查看指定周期内每一笔订单的账单明细，按订单维度展示订单金额、实付金额、优惠金额及各项费用。"
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
                placeholder="搜索订单号 / 商品名称"
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
              <TableHead className="text-xs font-medium">订单号</TableHead>
              <TableHead className="text-xs font-medium">商品名称</TableHead>
              <TableHead className="cursor-pointer select-none text-xs font-medium" onClick={() => toggleSort("time")}>
                <span className="flex items-center gap-1">时间 <span className="text-[10px] opacity-60">{sortIcon("time")}</span></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none text-xs font-medium text-right" onClick={() => toggleSort("orderAmount")}>
                <span className="flex items-center justify-end gap-1">订单金额 <span className="text-[10px] opacity-60">{sortIcon("orderAmount")}</span></span>
              </TableHead>
              <TableHead className="text-xs font-medium text-right">优惠金额</TableHead>
              <TableHead className="cursor-pointer select-none text-xs font-medium text-right" onClick={() => toggleSort("paidAmount")}>
                <span className="flex items-center justify-end gap-1">实付金额 <span className="text-[10px] opacity-60">{sortIcon("paidAmount")}</span></span>
              </TableHead>
              <TableHead className="text-xs font-medium text-right">保证金</TableHead>
              <TableHead className="text-xs font-medium text-right">平台技术服务费</TableHead>
              <TableHead className="text-xs font-medium text-right">系统费</TableHead>
              <TableHead className="text-xs font-medium text-right">营销费</TableHead>
              <TableHead className="cursor-pointer select-none text-xs font-medium text-right" onClick={() => toggleSort("netAmount")}>
                <span className="flex items-center justify-end gap-1">机构分成 <span className="text-[10px] opacity-60">{sortIcon("netAmount")}</span></span>
              </TableHead>
              <TableHead className="text-xs font-medium">状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.orderNo}</TableCell>
                <TableCell className="text-sm">{d.productName}</TableCell>
                <TableCell className="text-sm">{d.time}</TableCell>
                <TableCell className="text-right text-sm font-medium">{money(d.orderAmount, false)}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{money(d.discountAmount, false)}</TableCell>
                <TableCell className="text-right text-sm font-medium">{money(d.paidAmount, false)}</TableCell>
                <TableCell className={`text-right text-sm ${d.deposit !== 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {d.deposit !== 0 ? money(d.deposit) : "—"}
                </TableCell>
                <TableCell className={`text-right text-sm ${d.techFee !== 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {d.techFee !== 0 ? money(d.techFee) : "—"}
                </TableCell>
                <TableCell className={`text-right text-sm ${d.systemFee !== 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {d.systemFee !== 0 ? money(d.systemFee) : "—"}
                </TableCell>
                <TableCell className={`text-right text-sm ${d.marketingFee !== 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {d.marketingFee !== 0 ? money(d.marketingFee) : "—"}
                </TableCell>
                <TableCell className={`text-right text-sm font-medium ${netAmount(d) >= 0 ? "" : "text-destructive"}`}>
                  {money(netAmount(d))}
                </TableCell>
                <TableCell className="text-sm">
                  <span className={`inline-flex rounded px-1.5 py-0.5 text-xs ${
                    d.status === "已结算"
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {d.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="py-12 text-center text-muted-foreground">
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
