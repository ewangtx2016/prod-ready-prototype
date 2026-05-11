import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { ROLE_META, type Role } from "@/lib/roles";
import { usePermStore } from "@/lib/permissions";
import { db } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, KeyRound, X } from "lucide-react";
import { toast } from "sonner";
import { usePagination } from "@/components/dev/TablePagination";

export const Route = createFileRoute("/_app/user/accounts")({ component: Page });

type Account = { id: string; username: string; name: string; phone: string; role: Role; enabled: boolean; createdAt: string };
const KEY = "demo.accounts";
const sample: Account[] = [
  { id: "U1", username: "admin@org", name: "机构管理员", phone: "13800138000", role: "org_admin", enabled: true, createdAt: "2026-01-01" },
  { id: "U2", username: "li.planner", name: "李规划", phone: "13900139001", role: "planner", enabled: true, createdAt: "2026-02-01" },
  { id: "U3", username: "chen.tutor", name: "陈学管", phone: "13900139002", role: "tutor", enabled: true, createdAt: "2026-02-15" },
  { id: "U4", username: "wang.tutor", name: "王学管", phone: "13900139003", role: "tutor", enabled: false, createdAt: "2026-03-01" },
];

function accessScope(a: Account) {
  if (a.role === "super_admin") return "全部机构";
  if (a.role === "org_admin") return "本机构";
  if (a.role === "planner") return "启明教育、卓越学堂";
  return "按服务分配机构";
}

function Page() {
  const { role } = useApp();
  const { roles: dynRoles } = usePermStore();
  const [list, setList] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Account | null>(null);
  const [resetting, setResetting] = useState<Account | null>(null);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setList(JSON.parse(raw)); else { localStorage.setItem(KEY, JSON.stringify(sample)); setList(sample); }
  }, []);
  const persist = (v: Account[]) => { setList(v); localStorage.setItem(KEY, JSON.stringify(v)); };
  const save = () => {
    if (!editing) return;
    if (!editing.username || !editing.name) { toast.error("用户名与姓名必填"); return; }
    const exists = list.find(x => x.id === editing.id);
    persist(exists ? list.map(x => x.id === editing.id ? editing : x) : [editing, ...list]);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "账号管理", action: exists ? "编辑账号" : "新增账号", detail: editing.username });
    toast.success("已保存"); setEditing(null);
  };
  const toggle = (a: Account) => { persist(list.map(x => x.id === a.id ? { ...x, enabled: !x.enabled } : x)); db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "账号管理", action: a.enabled ? "停用账号" : "启用账号", detail: a.username }); };
  const doReset = () => { if (!resetting) return; toast.success(`已向 ${resetting.phone} 发送密码重置短信`); db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "账号管理", action: "重置密码", detail: resetting.username }); setResetting(null); };
  const canEdit = role === "org_admin";
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return list.filter((a) => {
      if (roleFilter !== "all" && a.role !== roleFilter) return false;
      if (statusFilter === "enabled" && !a.enabled) return false;
      if (statusFilter === "disabled" && a.enabled) return false;
      if (kw) {
        const hay = `${a.username} ${a.name} ${a.phone} ${accessScope(a)}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [list, keyword, roleFilter, statusFilter]);
  const hasFilter = !!keyword || roleFilter !== "all" || statusFilter !== "all";
  const reset = () => { setKeyword(""); setRoleFilter("all"); setStatusFilter("all"); };
  const { paged, Pagination } = usePagination(filtered, 10);

  return (
    <div>
      <PageHeader title="后台账号" subtitle="管理后台账号 · 单账号单角色" actions={
        <PermissionTip action="新增账号" prd="§13" allow={["org_admin"]}>
          <Button size="sm" disabled={!canEdit} onClick={() => setEditing({ id: "U" + Math.random().toString(36).slice(2, 6), username: "", name: "", phone: "", role: "planner", enabled: true, createdAt: new Date().toLocaleDateString("zh-CN") })}><Plus className="h-4 w-4" /> 新增账号</Button>
        </PermissionTip>
      } />
      <DevNote prd="§13" title="账号管理"><div>· 单账号单角色 (PRD §13.2)</div><div>· 重置密码：发送短信链接，链接 24h 有效</div><div>· 停用：账号立即下线，登录态清除</div></DevNote>
      <div className="mb-3 grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 md:grid-cols-5">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs text-muted-foreground">关键词</Label>
          <Input placeholder="搜索用户名 / 姓名 / 手机号" value={keyword} onChange={(e) => setKeyword(e.target.value)} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">角色</Label>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8"><SelectValue placeholder="全部角色" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            {dynRoles.map((r) => <SelectItem key={r.key} value={r.key}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">状态</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8"><SelectValue placeholder="全部状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="enabled">启用</SelectItem>
            <SelectItem value="disabled">停用</SelectItem>
          </SelectContent>
        </Select>
        </div>
        <div className="flex items-end justify-between gap-2">
          {hasFilter && <Button variant="ghost" size="sm" className="h-8" onClick={reset}><X className="h-3.5 w-3.5" /> 清空</Button>}
          <div className="ml-auto pb-2 text-xs text-muted-foreground">共 {filtered.length} / {list.length} 条</div>
        </div>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>用户名</TableHead><TableHead>姓名</TableHead><TableHead>手机号</TableHead><TableHead>角色</TableHead><TableHead>可访问机构</TableHead><TableHead>状态</TableHead><TableHead>创建时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {paged.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">{a.username}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell className="font-mono text-xs">{a.phone}</TableCell>
                <TableCell><Badge className={`text-white ${dynRoles.find(r=>r.key===a.role)?.color ?? "bg-slate-500"}`}>{dynRoles.find(r=>r.key===a.role)?.name ?? a.role}</Badge></TableCell>
                <TableCell className="max-w-[180px] text-xs text-muted-foreground">{accessScope(a)}</TableCell>
                <TableCell><Switch checked={a.enabled} disabled={!canEdit} onCheckedChange={() => toggle(a)} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.createdAt}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => setResetting(a)}><KeyRound className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => setEditing(a)}>编辑</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">暂无匹配账号</TableCell></TableRow>}
          </TableBody>
        </Table>
        <Pagination />
      </Card>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>账号信息</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>用户名 *</Label><Input value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} /></div>
              <div><Label>姓名 *</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>手机号</Label><Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div><Label>角色</Label>
                <Select value={editing.role} onValueChange={(v) => setEditing({ ...editing, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{dynRoles.map(r => <SelectItem key={r.key} value={r.key}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>取消</Button><Button onClick={save}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!resetting} onOpenChange={(v) => !v && setResetting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认重置密码？</AlertDialogTitle><AlertDialogDescription>将向 {resetting?.phone} 发送重置链接，链接 24 小时有效。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={doReset}>确认</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
