import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { db, type AuditLog } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { RoleGate } from "@/components/dev/RoleGate";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileDiff, X } from "lucide-react";

export const Route = createFileRoute("/_app/audit-log")({ component: () => <RoleGate allow={["org_admin", "super_admin"]}><Inner /></RoleGate> });

function Inner() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [viewing, setViewing] = useState<AuditLog | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  useEffect(() => { setLogs(db.logs()); const t = setInterval(() => setLogs(db.logs()), 1500); return () => clearInterval(t); }, []);
  const modules = useMemo(() => Array.from(new Set(logs.map((l) => l.module))), [logs]);
  const roles = useMemo(() => Array.from(new Set(logs.map((l) => l.role))), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))), [logs]);
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return logs.filter((l) => {
      if (moduleFilter !== "all" && l.module !== moduleFilter) return false;
      if (roleFilter !== "all" && l.role !== roleFilter) return false;
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (dateFrom && l.time < dateFrom) return false;
      if (dateTo && l.time > dateTo + " 23:59") return false;
      if (kw) {
        const hay = `${l.operator} ${l.ip} ${l.detail} ${l.module} ${l.action}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [logs, moduleFilter, roleFilter, actionFilter, keyword, dateFrom, dateTo]);
  const hasFilter = moduleFilter !== "all" || roleFilter !== "all" || actionFilter !== "all" || !!keyword || !!dateFrom || !!dateTo;
  const reset = () => { setModuleFilter("all"); setRoleFilter("all"); setActionFilter("all"); setKeyword(""); setDateFrom(""); setDateTo(""); };
  return (
    <div>
      <PageHeader title="审计日志" subtitle="贯穿全模块的操作留痕（含登录日志），每 1.5s 自动刷新" />
      <DevNote prd="§4.3 §16.5" title="审计日志">
        <div>· 每条日志包含：操作人 / 角色 / 时间 / IP / 模块 / 动作 / 详情</div>
        <div>· 关键变更同时记录「操作前/后内容快照（JSON）」，点击「快照」按钮查看 diff</div>
        <div>· 触发场景：服务记录新增/审核、分成规则变更、导出、备份删除/恢复、模式切换 等</div>
        <div>· 当前共 {logs.length} 条（最近 200 条）</div>
      </DevNote>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="全部模块" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部模块</SelectItem>
            {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="全部角色" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="全部动作" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部动作</SelectItem>
            {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <span className="text-xs text-muted-foreground">至</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        <Input placeholder="搜索操作人 / IP / 详情" value={keyword} onChange={(e) => setKeyword(e.target.value)} className="w-56" />
        {hasFilter && <Button variant="ghost" size="sm" onClick={reset}><X className="h-3.5 w-3.5" /> 清空</Button>}
        <div className="ml-auto text-xs text-muted-foreground">共 {filtered.length} 条</div>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>时间</TableHead><TableHead>操作人</TableHead><TableHead>角色</TableHead><TableHead>IP</TableHead><TableHead>模块</TableHead><TableHead>动作</TableHead><TableHead>详情</TableHead><TableHead className="text-right">快照</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs font-mono">{l.time}</TableCell>
                <TableCell>{l.operator}</TableCell>
                <TableCell><Badge variant="outline">{l.role}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{l.ip}</TableCell>
                <TableCell>{l.module}</TableCell>
                <TableCell><Badge>{l.action}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.detail}</TableCell>
                <TableCell className="text-right">
                  {(l.before !== undefined || l.after !== undefined) ? (
                    <Button variant="ghost" size="sm" onClick={() => setViewing(l)}><FileDiff className="h-3.5 w-3.5" /> 查看</Button>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">暂无日志</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>操作快照 · {viewing?.module} / {viewing?.action}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="grid gap-3 md:grid-cols-2 text-xs">
              <div className="rounded-md border">
                <div className="border-b bg-muted/40 px-2 py-1 font-medium">操作前 (before)</div>
                <pre className="max-h-80 overflow-auto p-2 font-mono">{viewing.before === null ? "null" : JSON.stringify(viewing.before ?? "—", null, 2)}</pre>
              </div>
              <div className="rounded-md border">
                <div className="border-b bg-muted/40 px-2 py-1 font-medium">操作后 (after)</div>
                <pre className="max-h-80 overflow-auto p-2 font-mono">{viewing.after === null ? "null" : JSON.stringify(viewing.after ?? "—", null, 2)}</pre>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setViewing(null)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}