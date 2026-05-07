import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { db } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { EventBindingHint } from "./notification-events";

export const Route = createFileRoute("/_app/settings/alert")({ component: Page });

const KEY = "demo.alerts";
type Rule = { id: string; name: string; threshold: number; unit: string; eventKey: string; enabled: boolean };
const init: Rule[] = [
  { id: "A1", name: "单日导出次数", threshold: 5, unit: "次/日", eventKey: "alert.export.bulk", enabled: true },
  { id: "A2", name: "异常分账次数", threshold: 3, unit: "次/日", eventKey: "alert.split.abnormal", enabled: true },
  { id: "A3", name: "服务记录驳回率", threshold: 30, unit: "%", eventKey: "alert.audit.reject_rate", enabled: false },
  { id: "A4", name: "登录失败次数", threshold: 5, unit: "次/小时", eventKey: "alert.login.failure", enabled: true },
  { id: "A5", name: "备份失败", threshold: 1, unit: "次/日", eventKey: "alert.backup.failed", enabled: true },
  { id: "A6", name: "备份目标容量", threshold: 80, unit: "%", eventKey: "alert.backup.capacity", enabled: true },
];

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<Rule[]>([]);
  useEffect(() => { const raw = localStorage.getItem(KEY); if (raw) setList(JSON.parse(raw)); else { localStorage.setItem(KEY, JSON.stringify(init)); setList(init); } }, []);
  // 旧数据迁移：缺失 eventKey 时按 id 补
  useEffect(() => {
    if (list.length && list.some((r) => !r.eventKey)) {
      const map: Record<string, string> = { A1: "alert.export.bulk", A2: "alert.split.abnormal", A3: "alert.audit.reject_rate", A4: "alert.login.failure", A5: "alert.backup.failed", A6: "alert.backup.capacity" };
      const fixed = list.map((r) => r.eventKey ? r : { ...r, eventKey: map[r.id] || "alert.export.bulk" });
      setList(fixed); localStorage.setItem(KEY, JSON.stringify(fixed));
    }
  }, [list]);
  // 旧数据迁移：补齐新增的备份预警项
  useEffect(() => {
    if (list.length && !list.some((r) => r.id === "A5")) {
      const add = init.filter((r) => !list.some((x) => x.id === r.id));
      const next = [...list, ...add];
      setList(next); localStorage.setItem(KEY, JSON.stringify(next));
    }
  }, [list]);
  const persist = (v: Rule[]) => { setList(v); localStorage.setItem(KEY, JSON.stringify(v)); };
  const canEdit = role === "org_admin";
  return (
    <div>
      <PageHeader title="操作预警" subtitle="敏感操作阈值与通知对象配置" actions={
        <PermissionTip action="保存预警" prd="§11.3" allow={["org_admin"]}>
          <Button size="sm" disabled={!canEdit} onClick={() => { localStorage.setItem(KEY, JSON.stringify(list)); db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "操作预警", action: "保存", detail: `${list.filter(x => x.enabled).length} 条已启用` }); toast.success("已保存"); }}>保存</Button>
        </PermissionTip>
      } />
      <DevNote prd="§11.3" title="操作预警">
        <div>· 此页只配置「触发阈值」</div>
        <div>· 通知渠道、模板、接收人统一在「系统设置 → 通知事件」配置</div>
      </DevNote>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>预警项</TableHead><TableHead className="w-44">阈值</TableHead><TableHead>命中通知</TableHead><TableHead className="w-20">启用</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><div className="flex items-center gap-1"><Input type="number" className="w-20" disabled={!canEdit} value={r.threshold} onChange={(e) => persist(list.map(x => x.id === r.id ? { ...x, threshold: +e.target.value } : x))} /><span className="text-xs text-muted-foreground">{r.unit}</span></div></TableCell>
                <TableCell><EventBindingHint eventKey={r.eventKey} /></TableCell>
                <TableCell><Switch disabled={!canEdit} checked={r.enabled} onCheckedChange={(v) => persist(list.map(x => x.id === r.id ? { ...x, enabled: v } : x))} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
