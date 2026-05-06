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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/ip")({ component: Page });

type IP = { id: string; cidr: string; remark: string; addedAt: string };
const KEY = "demo.ip"; const KEY2 = "demo.ip.enabled";
const sample: IP[] = [
  { id: "I1", cidr: "192.168.1.0/24", remark: "公司内网", addedAt: "2026-01-01" },
  { id: "I2", cidr: "203.0.113.10", remark: "管理员家庭 IP", addedAt: "2026-02-15" },
];

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<IP[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [editing, setEditing] = useState<IP | null>(null);
  const [deleting, setDeleting] = useState<IP | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setList(JSON.parse(raw)); else { localStorage.setItem(KEY, JSON.stringify(sample)); setList(sample); }
    setEnabled(localStorage.getItem(KEY2) === "1");
  }, []);
  const persist = (v: IP[]) => { setList(v); localStorage.setItem(KEY, JSON.stringify(v)); };
  const canEdit = role === "org_admin";
  return (
    <div>
      <PageHeader title="IP 白名单" subtitle="限制机构后台访问来源 IP" actions={
        <div className="flex items-center gap-2"><Label className="text-sm">启用白名单</Label><Switch checked={enabled} disabled={!canEdit} onCheckedChange={(v) => { setEnabled(v); localStorage.setItem(KEY2, v ? "1" : "0"); db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "IP白名单", action: v ? "启用" : "停用", detail: "" }); toast.success(`白名单已${v ? "启用" : "停用"}`); }} /></div>
      } />
      <DevNote prd="§11.1" title="IP 白名单"><div>· 启用后，未在列表中的 IP 无法访问后台</div><div>· 支持单 IP 或 CIDR 网段</div><div>· 当前 IP 未加入将被锁在外面，请谨慎</div></DevNote>
      <Card>
        <div className="flex justify-between p-3 border-b">
          <div className="text-sm text-muted-foreground">共 {list.length} 条规则 · 状态：{enabled ? <Badge className="bg-success text-success-foreground">已启用</Badge> : <Badge variant="outline">未启用</Badge>}</div>
          <PermissionTip action="新增 IP" prd="§11.1" allow={["org_admin"]}>
            <Button size="sm" disabled={!canEdit} onClick={() => setEditing({ id: "I" + Math.random().toString(36).slice(2, 6), cidr: "", remark: "", addedAt: new Date().toLocaleDateString("zh-CN") })}><Plus className="h-4 w-4" /> 新增</Button>
          </PermissionTip>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>IP / CIDR</TableHead><TableHead>备注</TableHead><TableHead>添加时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-mono">{i.cidr}</TableCell>
                <TableCell>{i.remark}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{i.addedAt}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => setDeleting(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增 IP 白名单</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>IP / CIDR *</Label><Input placeholder="如：192.168.1.0/24 或 203.0.113.10" value={editing.cidr} onChange={(e) => setEditing({ ...editing, cidr: e.target.value })} /></div>
              <div><Label>备注</Label><Input value={editing.remark} onChange={(e) => setEditing({ ...editing, remark: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>取消</Button><Button onClick={() => { if (!editing?.cidr) return toast.error("请填写 IP"); persist([editing!, ...list]); db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "IP白名单", action: "新增", detail: editing.cidr }); toast.success("已新增"); setEditing(null); }}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认删除？</AlertDialogTitle><AlertDialogDescription>删除 {deleting?.cidr} 后，该 IP 将无法访问后台</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleting) { persist(list.filter(x => x.id !== deleting.id)); toast.success("已删除"); setDeleting(null); } }}>确认删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
