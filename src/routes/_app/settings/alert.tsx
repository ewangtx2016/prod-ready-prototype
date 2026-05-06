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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/alert")({ component: Page });

const KEY = "demo.alerts";
type Rule = { id: string; name: string; threshold: number; unit: string; channels: string[]; enabled: boolean };
const init: Rule[] = [
  { id: "A1", name: "单日导出次数", threshold: 5, unit: "次/日", channels: ["sms", "inbox"], enabled: true },
  { id: "A2", name: "异常分账次数", threshold: 3, unit: "次/日", channels: ["sms", "inbox", "email"], enabled: true },
  { id: "A3", name: "服务记录驳回率", threshold: 30, unit: "%", channels: ["inbox"], enabled: false },
  { id: "A4", name: "登录失败次数", threshold: 5, unit: "次/小时", channels: ["sms"], enabled: true },
];

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<Rule[]>([]);
  useEffect(() => { const raw = localStorage.getItem(KEY); if (raw) setList(JSON.parse(raw)); else { localStorage.setItem(KEY, JSON.stringify(init)); setList(init); } }, []);
  const persist = (v: Rule[]) => { setList(v); localStorage.setItem(KEY, JSON.stringify(v)); };
  const canEdit = role === "org_admin";
  return (
    <div>
      <PageHeader title="操作预警" subtitle="敏感操作阈值与通知对象配置" actions={
        <PermissionTip action="保存预警" prd="§11.3" allow={["org_admin"]}>
          <Button size="sm" disabled={!canEdit} onClick={() => { localStorage.setItem(KEY, JSON.stringify(list)); db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "操作预警", action: "保存", detail: `${list.filter(x => x.enabled).length} 条已启用` }); toast.success("已保存"); }}>保存</Button>
        </PermissionTip>
      } />
      <DevNote prd="§11.3" title="操作预警"><div>· 通知对象固定为「机构管理员 + 鼎校运营」</div><div>· 通道：站内信 / 短信 / 邮件 (可多选)</div><div>· 触发后即时推送，不归并</div></DevNote>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>预警项</TableHead><TableHead>阈值</TableHead><TableHead>通知通道</TableHead><TableHead>启用</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><div className="flex items-center gap-1"><Input type="number" className="w-20" disabled={!canEdit} value={r.threshold} onChange={(e) => persist(list.map(x => x.id === r.id ? { ...x, threshold: +e.target.value } : x))} /><span className="text-xs text-muted-foreground">{r.unit}</span></div></TableCell>
                <TableCell><div className="flex gap-3">
                  {[["inbox", "站内信"], ["sms", "短信"], ["email", "邮件"]].map(([k, l]) => (
                    <Label key={k} className="flex items-center gap-1 text-xs"><Checkbox disabled={!canEdit} checked={r.channels.includes(k)} onCheckedChange={(v) => persist(list.map(x => x.id === r.id ? { ...x, channels: v ? [...x.channels, k] : x.channels.filter(c => c !== k) } : x))} />{l}</Label>
                  ))}
                </div></TableCell>
                <TableCell><Switch disabled={!canEdit} checked={r.enabled} onCheckedChange={(v) => persist(list.map(x => x.id === r.id ? { ...x, enabled: v } : x))} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
