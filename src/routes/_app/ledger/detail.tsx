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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ArrowLeft, RotateCcw } from "lucide-react";
import { usePagination } from "@/components/dev/TablePagination";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ledger/detail")({ component: Page });

const BIZ_TYPES = ["全部", "保证金", "分润", "平台技术服务费", "系统费", "营销费"];

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

/** 格式化周标签 */
function formatWeekLabel(startDate: string): string {
  const d = new Date(startDate + "T00:00:00");
  const tmp = new Date(d);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${tmp.getFullYear()}年第${weekNo}周`;
}

function Page() {
  const { role } = useApp();
  const currentUserName = ROLE_META[role].name;
  const search = useSearch({ from: "/_app/ledger/detail" }) as Record<string, any>;

  const cycleStart = (search.cycleStart as string) || "";
  const cycleEnd = (search.cycleEnd as string) || "";
  const totalAmount = (search.amount as number) || 0;
  const totalCount = (search.count as number) || 0;
  const billType = (search.billType as string) || "";

  const [bizType, setBizType] = useState("全部");
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

    if (bizType !== "全部") {
      arr = arr.filter((d) => d.bizType === bizType);
    }

    const kw = keyword.trim();
    if (kw) {
      arr = arr.filter(
        (d) =>
          d.orderNo.toLowerCase().includes(kw.toLowerCase()) ||
          d.remark.toLowerCase().includes(kw.toLowerCase())
      );
    }

    if (sortField && sortDir) {
      const dir = sortDir === "asc" ? 1 : -1;
      arr.sort((a, b) => {
        if (sortField === "time") {
          return a.time.localeCompare(b.time) * dir;
        }
        if (sortField === "amount") {
          return (a.amount - b.amount) * dir;
        }
        return 0;
      });
    } else {
      arr.sort((a, b) => b.time.localeCompare(a.time));
    }
    return arr;
  }, [allDetails, bizType, keyword, sortField, sortDir]);

  const { paged, Pagination } = usePagination(filtered, 10);

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
    setBizType("全部");
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

  const periodLabel = (() => {
    if (billType === "month") return `${cycleStart.slice(0, 7)}`;
    if (billType === "week") return `${formatWeekLabel(cycleStart)}（${cycleStart} ~ ${cycleEnd}）`;
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
          <div className="mt-1 text-lg font-semibold">{periodLabel}</div>
          <div className="mt-1 text-xs text-muted-foreground">{periodSubLabel}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">业务类型</div>
          <div className="mt-1 text-2xl font-semibold">{bizType}</div>
          <div className="mt-1 text-xs text-muted-foreground">当前筛选类型</div>
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
            <div className="md:col-span-4">
              <Label className="mb-1.5 block text-xs text-muted-foreground">关键词</Label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索订单号 / 说明"
                className="h-8"
              />
            </div>
            <div className="md:col-span-6 flex gap-2">
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
              <TableHead className="text-xs font-medium">流水号</TableHead>
              <TableHead className="text-xs font-medium">订单号</TableHead>
              <TableHead className="text-xs font-medium">商品名称</TableHead>
              <TableHead className="cursor-pointer select-none text-xs font-medium" onClick={() => toggleSort("time")}>
                <span className="flex items-center gap-1">时间 <span className="text-[10px] opacity-60">{sortIcon("time")}</span></span>
              </TableHead>
              <TableHead className="text-xs font-medium">业务类型</TableHead>
              <TableHead className="cursor-pointer select-none text-xs font-medium text-right" onClick={() => toggleSort("amount")}>
                <span className="flex items-center justify-end gap-1">金额 <span className="text-[10px] opacity-60">{sortIcon("amount")}</span></span>
              </TableHead>
              <TableHead className="text-xs font-medium">说明</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.id}</TableCell>
                <TableCell className="font-mono text-xs">{d.orderNo}</TableCell>
                <TableCell className="text-sm">{d.productName}</TableCell>
                <TableCell className="text-sm">{d.time}</TableCell>
                <TableCell className="text-sm">{d.bizType}</TableCell>
                <TableCell className={`text-right text-sm font-medium ${d.amount >= 0 ? "" : "text-destructive"}`}>
                  {money(d.amount)}
                </TableCell>
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
