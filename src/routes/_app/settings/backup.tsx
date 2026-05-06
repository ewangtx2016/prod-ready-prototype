import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { db } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { SmsVerifyDialog } from "@/components/dev/SmsVerifyDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, Database, Download, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/backup")({ component: Page });

type Backup = { id: string; size: string; time: string; type: "auto" | "manual"; scope: string };
const KEY = "demo.backups";
const sample: Backup[] = [
  { id: "B1", size: "128 MB", time: "2026-04-28 02:00", type: "auto", scope: "全量" },
  { id: "B2", size: "64 MB", time: "2026-04-21 02:00", type: "auto", scope: "全量" },
  { id: "B3", size: "12 MB", time: "2026-04-15 18:30", type: "manual", scope: "服务记录" },
];

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<Backup[]>([]);
  const [period, setPeriod] = useState("daily");
  const [scope, setScope] = useState("full");
  const [autoBackup, setAutoBackup] = useState(true);
  const [smsScene, setSmsScene] = useState<{ b: Backup; type: "delete" | "restore" } | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setList(JSON.parse(raw)); else { localStorage.setItem(KEY, JSON.stringify(sample)); setList(sample); }
  }, []);
  const persist = (v: Backup[]) => { setList(v); localStorage.setItem(KEY, JSON.stringify(v)); };
  const canEdit = role === "org_admin";

  const onSmsSuccess = () => {
    if (!smsScene) return;
    if (smsScene.type === "delete") { persist(list.filter(x => x.id !== smsScene.b.id)); toast.success("已删除备份"); }
    else { toast.success("已开始恢复，约需 5 分钟"); }
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "备份", action: smsScene.type === "delete" ? "删除备份" : "恢复备份", detail: smsScene.b.id });
    setSmsScene(null);
  };

  const doBackupNow = () => {
    const b: Backup = { id: "B" + Math.random().toString(36).slice(2, 6), size: Math.floor(Math.random() * 200 + 20) + " MB", time: new Date().toLocaleString("zh-CN"), type: "manual", scope: scope === "full" ? "全量" : "服务记录" };
    persist([b, ...list]);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "备份", action: "立即备份", detail: b.id });
    toast.success("备份已创建");
  };

  return (
    <div>
      <PageHeader title="备份设置" subtitle="数据备份策略 · 删除/恢复需短信验证" actions={
        <PermissionTip action="立即备份" prd="§11.2" allow={["org_admin"]}><Button size="sm" disabled={!canEdit} onClick={doBackupNow}><Database className="h-4 w-4" /> 立即备份</Button></PermissionTip>
      } />
      <DevNote prd="§11.2" title="备份设置"><div>· 自动备份：每日凌晨 02:00；最长保留 90 天</div><div>· 备份不加密、不脱敏（PRD §11.2）</div><div>· <b>删除/恢复</b>需机构管理员短信验证</div></DevNote>
      <Alert className="mb-4 border-warning/40 bg-warning/10"><ShieldAlert className="h-4 w-4 text-warning" /><AlertDescription>恢复操作将覆盖当前数据，请确认在低峰时段执行。</AlertDescription></Alert>
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <Card className="p-4 space-y-3">
          <div className="font-medium">备份策略</div>
          <div className="flex items-center gap-2"><Switch checked={autoBackup} disabled={!canEdit} onCheckedChange={setAutoBackup} /><Label>启用自动备份</Label></div>
          <div><Label>备份周期</Label><Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">每日</SelectItem><SelectItem value="weekly">每周</SelectItem><SelectItem value="monthly">每月</SelectItem></SelectContent></Select></div>
          <div><Label>备份范围</Label><Select value={scope} onValueChange={setScope}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full">全量</SelectItem><SelectItem value="service">仅服务记录</SelectItem><SelectItem value="ledger">仅台账</SelectItem></SelectContent></Select></div>
          <Button size="sm" disabled={!canEdit} onClick={() => { db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "备份", action: "更新策略", detail: `${period}/${scope}` }); toast.success("策略已保存"); }}>保存策略</Button>
        </Card>
        <Card className="p-4">
          <div className="font-medium mb-2">备份统计</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">备份总数</div><div className="text-2xl font-semibold mt-1">{list.length}</div></div>
            <div><div className="text-xs text-muted-foreground">总占用空间</div><div className="text-2xl font-semibold mt-1">204 MB</div></div>
            <div><div className="text-xs text-muted-foreground">最近备份</div><div className="text-sm mt-1">{list[0]?.time || "-"}</div></div>
            <div><div className="text-xs text-muted-foreground">保留策略</div><div className="text-sm mt-1">90 天</div></div>
          </div>
        </Card>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>备份编号</TableHead><TableHead>大小</TableHead><TableHead>类型</TableHead><TableHead>范围</TableHead><TableHead>备份时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(b => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.id}</TableCell>
                <TableCell>{b.size}</TableCell>
                <TableCell><Badge variant={b.type === "auto" ? "secondary" : "outline"}>{b.type === "auto" ? "自动" : "手动"}</Badge></TableCell>
                <TableCell>{b.scope}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{b.time}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => toast.success(`下载 ${b.id} (mock)`)}><Download className="h-3.5 w-3.5" /></Button>
                  <PermissionTip action="恢复备份" prd="§11.2" allow={["org_admin"]}><Button size="sm" variant="outline" disabled={!canEdit} onClick={() => setSmsScene({ b, type: "restore" })}><RotateCw className="h-3.5 w-3.5" /> 恢复</Button></PermissionTip>
                  <PermissionTip action="删除备份" prd="§11.2" allow={["org_admin"]}><Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => setSmsScene({ b, type: "delete" })}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></PermissionTip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <SmsVerifyDialog open={!!smsScene} onOpenChange={(v) => !v && setSmsScene(null)} title="机构管理员短信验证" scene={smsScene ? `${smsScene.type === "delete" ? "删除" : "恢复"}备份 ${smsScene.b.id}` : ""} onSuccess={onSmsSuccess} />
    </div>
  );
}
