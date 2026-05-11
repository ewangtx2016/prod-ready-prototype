import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { db, type AuditLog } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { RoleGate } from "@/components/dev/RoleGate";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { usePagination } from "@/components/dev/TablePagination";

export const Route = createFileRoute("/_app/audit-log")({ component: () => <RoleGate allow={["org_admin", "super_admin"]}><Inner /></RoleGate> });

function auditType(log: AuditLog) {
  if (log.action.includes("登录") || log.module === "登录") return "登录";
  if (log.action.includes("导出")) return "导出";
  return log.action;
}

function Inner() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  useEffect(() => { setLogs(db.logs()); const t = setInterval(() => setLogs(db.logs()), 1500); return () => clearInterval(t); }, []);
  const roles = useMemo(() => Array.from(new Set(logs.map((l) => l.role))), [logs]);
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return logs.filter((l) => {
      if (roleFilter !== "all" && l.role !== roleFilter) return false;
      if (actionFilter !== "all" && auditType(l) !== actionFilter) return false;
      if (dateFrom && l.time < dateFrom) return false;
      if (dateTo && l.time > dateTo + " 23:59") return false;
      if (kw) {
        const hay = `${l.operator} ${l.ip} ${l.detail} ${auditType(l)}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [logs, roleFilter, actionFilter, keyword, dateFrom, dateTo]);
  const hasFilter = roleFilter !== "all" || actionFilter !== "all" || !!keyword || !!dateFrom || !!dateTo;
  const reset = () => { setRoleFilter("all"); setActionFilter("all"); setKeyword(""); setDateFrom(""); setDateTo(""); };
  const { paged, Pagination } = usePagination(filtered, 20);
  return (
    <div>
      <PageHeader title="审计日志" subtitle="贯穿全模块的操作留痕（含登录日志），每 1.5s 自动刷新" />
      <DevNote prd="§4.3 §16.5" title="审计日志">
        <div>· 每条日志包含：操作人 / 角色 / 时间 / IP / 类型 / 详情</div>
        <div>· 支持按类型筛选登录、导出等关键操作</div>
        <div>· 触发场景：服务记录新增/审核、分成规则变更、导出、备份删除/恢复、模式切换 等</div>
        <div>· 当前共 {logs.length} 条（最近 200 条）</div>
      </DevNote>
      <div className="mb-3 grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 md:grid-cols-7">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs text-muted-foreground">关键词</Label>
          <Input placeholder="搜索操作人 / IP / 详情" value={keyword} onChange={(e) => setKeyword(e.target.value)} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">角色</Label>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8"><SelectValue placeholder="全部角色" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">类型</Label>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-8"><SelectValue placeholder="全部类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="登录">登录</SelectItem>
            <SelectItem value="导出">导出</SelectItem>
          </SelectContent>
        </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">开始日期</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">结束日期</Label>
          <div className="flex gap-2">
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8" />
            {hasFilter && <Button variant="ghost" size="sm" className="h-8" onClick={reset}><X className="h-3.5 w-3.5" /> 清空</Button>}
          </div>
        </div>
        <div className="col-span-2 text-xs text-muted-foreground md:col-span-7">共 {filtered.length} 条</div>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>时间</TableHead><TableHead>操作人</TableHead><TableHead>角色</TableHead><TableHead>IP</TableHead><TableHead>类型</TableHead><TableHead>详情</TableHead></TableRow></TableHeader>
          <TableBody>
            {paged.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs font-mono">{l.time}</TableCell>
                <TableCell>{l.operator}</TableCell>
                <TableCell><Badge variant="outline">{l.role}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{l.ip}</TableCell>
                <TableCell><Badge>{auditType(l)}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.detail}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">暂无日志</TableCell></TableRow>}
          </TableBody>
        </Table>
        <Pagination />
      </div>
    </div>
  );
}
