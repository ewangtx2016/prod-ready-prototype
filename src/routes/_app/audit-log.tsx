import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type AuditLog } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { RoleGate } from "@/components/dev/RoleGate";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/audit-log")({ component: () => <RoleGate allow={["org_admin", "super_admin"]}><Inner /></RoleGate> });

function Inner() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  useEffect(() => { setLogs(db.logs()); const t = setInterval(() => setLogs(db.logs()), 1500); return () => clearInterval(t); }, []);
  return (
    <div>
      <PageHeader title="审计日志" subtitle="贯穿全模块的操作留痕，每 1.5s 自动刷新" />
      <DevNote prd="§4.3 §16.5" title="审计日志">
        <div>· 每条日志包含：操作人 / 角色 / 时间 / IP / 模块 / 动作 / 详情</div>
        <div>· 触发场景：服务记录新增/审核、分成规则变更、导出、备份删除/恢复、模式切换 等</div>
        <div>· 当前共 {logs.length} 条（最近 200 条）</div>
      </DevNote>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>时间</TableHead><TableHead>操作人</TableHead><TableHead>角色</TableHead><TableHead>IP</TableHead><TableHead>模块</TableHead><TableHead>动作</TableHead><TableHead>详情</TableHead></TableRow></TableHeader>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs font-mono">{l.time}</TableCell>
                <TableCell>{l.operator}</TableCell>
                <TableCell><Badge variant="outline">{l.role}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{l.ip}</TableCell>
                <TableCell>{l.module}</TableCell>
                <TableCell><Badge>{l.action}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.detail}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">暂无日志</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}