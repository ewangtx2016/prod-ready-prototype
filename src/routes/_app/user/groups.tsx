import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { ROLE_META, ROLE_LIST, type Role } from "@/lib/roles";
import { db } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/user/groups")({ component: Page });

type Group = { id: string; name: string; role: Role; memberCount: number; members: string[] };
const KEY = "demo.groups";
const sample: Group[] = [
  { id: "G1", name: "规划师 A 组", role: "planner", memberCount: 5, members: ["李规划", "周规划", "吴规划", "郑规划", "孙规划"] },
  { id: "G2", name: "学管师 1 组", role: "tutor", memberCount: 8, members: ["陈学管", "王学管", "刘学管", "赵学管", "钱学管", "孙学管", "周学管", "吴学管"] },
];

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<Group[]>([]);
  const [editing, setEditing] = useState<Group | null>(null);
  const [assigning, setAssigning] = useState<Group | null>(null);
  const [newRole, setNewRole] = useState<Role>("planner");
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setList(JSON.parse(raw)); else { localStorage.setItem(KEY, JSON.stringify(sample)); setList(sample); }
  }, []);
  const persist = (v: Group[]) => { setList(v); localStorage.setItem(KEY, JSON.stringify(v)); };
  const canEdit = role === "org_admin";
  const save = () => {
    if (!editing) return;
    if (!editing.name) { toast.error("组名必填"); return; }
    const exists = list.find(x => x.id === editing.id);
    persist(exists ? list.map(x => x.id === editing.id ? editing : x) : [editing, ...list]);
    toast.success("已保存"); setEditing(null);
  };
  const doAssign = () => {
    if (!assigning) return;
    persist(list.map(x => x.id === assigning.id ? { ...x, role: newRole } : x));
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "用户组", action: "批量分配角色", detail: `${assigning.name} (${assigning.memberCount} 人) → ${ROLE_META[newRole].name}` });
    toast.success(`已为「${assigning.name}」${assigning.memberCount} 名成员分配角色`);
    setAssigning(null);
  };

  return (
    <div>
      <PageHeader title="用户组" subtitle="按组管理 + 批量角色分配" actions={
        <PermissionTip action="新增用户组" prd="§13" allow={["org_admin"]}>
          <Button size="sm" disabled={!canEdit} onClick={() => setEditing({ id: "G" + Math.random().toString(36).slice(2, 6), name: "", role: "planner", memberCount: 0, members: [] })}><Plus className="h-4 w-4" /> 新增用户组</Button>
        </PermissionTip>
      } />
      <DevNote prd="§13" title="用户组"><div>· 批量分配：组内全员一键改角色（仍遵循单账号单角色）</div></DevNote>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>组名</TableHead><TableHead>当前角色</TableHead><TableHead>成员数</TableHead><TableHead>成员</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(g => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell><Badge className={`text-white ${ROLE_META[g.role].color}`}>{ROLE_META[g.role].name}</Badge></TableCell>
                <TableCell><Badge variant="outline"><Users className="h-3 w-3 mr-1" /> {g.memberCount}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{g.members.slice(0, 3).join("、")}{g.members.length > 3 ? ` +${g.members.length - 3}` : ""}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => { setNewRole(g.role); setAssigning(g); }}>批量改角色</Button>
                  <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => setEditing(g)}>编辑</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>用户组信息</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>组名 *</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>角色</Label>
                <Select value={editing.role} onValueChange={(v) => setEditing({ ...editing, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLE_LIST.map(r => <SelectItem key={r} value={r}>{ROLE_META[r].name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>取消</Button><Button onClick={save}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!assigning} onOpenChange={(v) => !v && setAssigning(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>批量分配角色</DialogTitle><DialogDescription>将为「{assigning?.name}」的 {assigning?.memberCount} 名成员统一更新角色</DialogDescription></DialogHeader>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ROLE_LIST.map(r => <SelectItem key={r} value={r}>{ROLE_META[r].name}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter><Button variant="outline" onClick={() => setAssigning(null)}>取消</Button><Button onClick={doAssign}>确认分配</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
