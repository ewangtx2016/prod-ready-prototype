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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/notification/virtual-no")({ component: Page });

type Pool = { id: string; range: string; total: number; used: number; expireDays: number; binding: string; callLimit: number; createdAt: string };
const KEY = "demo.vn.pools";
const sample: Pool[] = [
  { id: "P1", range: "170-9000-0000 ~ 170-9000-0099", total: 100, used: 23, expireDays: 30, binding: "规划师", callLimit: 50, createdAt: "2026-03-01" },
  { id: "P2", range: "171-8800-0000 ~ 171-8800-0049", total: 50, used: 5, expireDays: 7, binding: "学管师", callLimit: 30, createdAt: "2026-04-01" },
];
const ROLE_OPTIONS = ["规划师", "学管师", "机构管理员", "鼎校超管"];

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<Pool[]>([]);
  const [editing, setEditing] = useState<Pool | null>(null);
  const [deleting, setDeleting] = useState<Pool | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setList(JSON.parse(raw)); else { localStorage.setItem(KEY, JSON.stringify(sample)); setList(sample); }
  }, []);
  const persist = (v: Pool[]) => { setList(v); localStorage.setItem(KEY, JSON.stringify(v)); };
  const save = () => {
    if (!editing) return;
    if (!editing.range || !editing.total) { toast.error("号段与数量必填"); return; }
    const exists = list.find(x => x.id === editing.id);
    persist(exists ? list.map(x => x.id === editing.id ? editing : x) : [editing, ...list]);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "虚拟号", action: exists ? "编辑" : "新增号段", detail: editing.range });
    toast.success("已保存"); setEditing(null);
  };
  const canEdit = role === "org_admin" || role === "super_admin";
  return (
    <div>
      <PageHeader title="虚拟号配置" subtitle="号码池管理：保护用户隐私，号码隐匿展示" actions={
        <PermissionTip action="新增号段" prd="§7.1" allow={["org_admin", "super_admin"]}>
          <Button size="sm" disabled={!canEdit} onClick={() => setEditing({ id: "P" + Math.random().toString(36).slice(2, 6), range: "", total: 0, used: 0, expireDays: 30, binding: "规划师", callLimit: 50, createdAt: new Date().toLocaleDateString("zh-CN") })}><Plus className="h-4 w-4" /> 新增号段</Button>
        </PermissionTip>
      } />
      <DevNote prd="§7.1" title="虚拟号配置">
        <div>· 号码隐匿：用户与规划师之间通话不互相看到真实号码</div>
        <div>· 有效期到期后自动释放回池</div>
        <div>· 呼叫上限：单号每日最大被呼叫次数</div>
      </DevNote>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>号段</TableHead><TableHead>容量</TableHead><TableHead>已用</TableHead><TableHead>有效期(天)</TableHead><TableHead>绑定角色</TableHead><TableHead>呼叫上限/日</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.range}</TableCell>
                <TableCell>{p.total}</TableCell>
                <TableCell><Badge variant="outline">{p.used}/{p.total}</Badge></TableCell>
                <TableCell>{p.expireDays} 天</TableCell>
                <TableCell>{p.binding}</TableCell>
                <TableCell>{p.callLimit}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => setEditing(p)}>编辑</Button>
                  <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => setDeleting(p)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>号段配置</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>号段范围 *</Label><Input value={editing.range} onChange={(e) => setEditing({ ...editing, range: e.target.value })} placeholder="如：170-9000-0000 ~ 170-9000-0099" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>容量 *</Label><Input type="number" value={editing.total} onChange={(e) => setEditing({ ...editing, total: +e.target.value })} /></div>
                <div><Label>有效期(天)</Label><Input type="number" value={editing.expireDays} onChange={(e) => setEditing({ ...editing, expireDays: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>绑定角色</Label>
                  <Select value={editing.binding} onValueChange={(v) => setEditing({ ...editing, binding: v })}>
                    <SelectTrigger><SelectValue placeholder="请选择角色" /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>呼叫上限/日</Label><Input type="number" value={editing.callLimit} onChange={(e) => setEditing({ ...editing, callLimit: +e.target.value })} /></div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>取消</Button><Button onClick={save}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认删除该号段？</AlertDialogTitle><AlertDialogDescription>{deleting?.range} 中已使用的 {deleting?.used} 个号码将立即解绑。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleting) { persist(list.filter(x => x.id !== deleting.id)); toast.success("已删除"); setDeleting(null); } }}>确认删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
