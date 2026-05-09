import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/** 通用分页 hook：传入完整数据，返回当前页数据与分页 UI */
export function usePagination<T>(data: T[], initialSize: number = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => data.slice((safePage - 1) * pageSize, safePage * pageSize), [data, safePage, pageSize]);
  const Pagination = () => (
    <TablePagination
      page={safePage}
      pageSize={pageSize}
      total={total}
      onPageChange={setPage}
      onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
    />
  );
  return { page: safePage, pageSize, setPage, setPageSize, paged, totalPages, total, Pagination };
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-card px-3 py-2 text-xs text-muted-foreground">
      <span>共 {total} 条 · 第 {page} / {totalPages} 页（{from}-{to}）</span>
      <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
        <SelectTrigger className="h-7 w-[88px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {[10, 20, 50, 100].map((s) => <SelectItem key={s} value={String(s)}>{s} 条/页</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(1)}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
      <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
      <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
      <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}><ChevronsRight className="h-3.5 w-3.5" /></Button>
    </div>
  );
}