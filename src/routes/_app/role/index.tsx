import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dev/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronRight, FolderTree, MousePointerClick, Plus, Trash2, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  permStore, usePermStore, DATA_SCOPE_LABEL, flattenTree, getAncestors,
  type PermNode, type RoleDef, type DataScope,
} from "@/lib/permissions";

export const Route = createFileRoute("/_app/role/")({ component: Page });

function Page() {
  return (
    <div>
      <PageHeader
        title="权限管理"
        subtitle="角色 / 菜单 / 按钮（含权限码与接口码） · 数据范围可配置"
        actions={
          <Button size="sm" variant="outline" onClick={() => { permStore.reset(); toast.success("已恢复默认权限矩阵"); }}>
            <RotateCcw className="h-4 w-4" /> 重置默认
          </Button>
        }
      />
      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles"><MousePointerClick className="h-4 w-4 mr-1.5" />角色与授权</TabsTrigger>
          <TabsTrigger value="tree"><FolderTree className="h-4 w-4 mr-1.5" />权限资源（菜单 / 按钮）</TabsTrigger>
        </TabsList>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="tree"><TreeTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================== 角色 Tab ============================== */
function RolesTab() {
  const { roles, tree } = usePermStore();
  const [activeKey, setActiveKey] = useState<string>(roles[0]?.key ?? "");
  const active = roles.find((r) => r.key === activeKey) ?? roles[0];

  const [editing, setEditing] = useState<RoleDef | null>(null);
  const [deleting, setDeleting] = useState<RoleDef | null>(null);

  const updateRole = (next: RoleDef) => {
    permStore.setRoles(roles.map((r) => (r.key === next.key ? next : r)));
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-4 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">角色列表</div>
          <Button size="sm" variant="ghost" onClick={() => setEditing({ key: "", name: "", short: "", color: "bg-slate-500", desc: "", scope: "org", permIds: [] })}>
            <Plus className="h-4 w-4" /> 新增
          </Button>
        </div>
        <div className="space-y-1">
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => setActiveKey(r.key)}
              className={`w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-accent ${active?.key === r.key ? "bg-accent" : ""}`}
            >
              <span className={`h-2 w-2 rounded-full ${r.color}`} />
              <span className="text-sm font-medium">{r.name}</span>
              {r.builtin && <Badge variant="outline" className="ml-auto text-[10px]">预设</Badge>}
            </button>
          ))}
        </div>
      </Card>

      {active && (
        <Card className="col-span-8 p-4">
          <div className="flex items-start justify-between gap-3 border-b pb-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-[10px] text-white ${active.color}`}>{active.short}</span>
                <span className="text-base font-semibold">{active.name}</span>
                {active.builtin && <Badge variant="outline" className="text-[10px]">预设</Badge>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{active.desc}</div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">数据范围：</span>
                <Select value={active.scope} onValueChange={(v) => { updateRole({ ...active, scope: v as DataScope }); toast.success("已更新数据范围"); }}>
                  <SelectTrigger className="h-7 w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DATA_SCOPE_LABEL) as DataScope[]).map((s) => (
                      <SelectItem key={s} value={s}>{DATA_SCOPE_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(active)}><Pencil className="h-3.5 w-3.5" /> 编辑</Button>
              <Button size="sm" variant="ghost" disabled={active.builtin} onClick={() => setDeleting(active)}>
                <Trash2 className="h-3.5 w-3.5" /> 删除
              </Button>
            </div>
          </div>
          <div className="text-sm font-medium mb-2">菜单 / 按钮授权</div>
          <div className="text-xs text-muted-foreground mb-2">勾选菜单或按钮即授予对应权限码与接口调用权限。勾选子节点会自动勾选父级菜单。</div>
          <div className="rounded-md border max-h-[60vh] overflow-auto">
            <PermTreeChecker
              nodes={tree}
              checked={active.permIds}
              onChange={(ids) => updateRole({ ...active, permIds: ids })}
            />
          </div>
        </Card>
      )}

      <RoleEditDialog open={!!editing} role={editing} onOpenChange={(v) => !v && setEditing(null)} onSave={(r) => {
        const exists = roles.find((x) => x.key === r.key);
        if (exists) permStore.setRoles(roles.map((x) => x.key === r.key ? r : x));
        else permStore.setRoles([...roles, r]);
        setEditing(null); setActiveKey(r.key); toast.success("已保存");
      }} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除角色 {deleting?.name}？</AlertDialogTitle>
            <AlertDialogDescription>删除后该角色下的账号将无可用权限，请先迁移账号角色。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!deleting) return;
              permStore.setRoles(roles.filter((r) => r.key !== deleting.key));
              if (activeKey === deleting.key) setActiveKey(roles[0]?.key ?? "");
              setDeleting(null); toast.success("已删除");
            }}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PermTreeChecker({ nodes, checked, onChange }: { nodes: PermNode[]; checked: string[]; onChange: (ids: string[]) => void }) {
  const allNodes = useMemo(() => flattenTree(nodes), [nodes]);
  const toggle = (n: PermNode, value: boolean) => {
    let next = new Set(checked);
    const cascade = (node: PermNode, on: boolean) => {
      if (on) next.add(node.id); else next.delete(node.id);
      node.children?.forEach((c) => cascade(c, on));
    };
    cascade(n, value);
    if (value) {
      // 自动勾选祖先
      const anc = getAncestors(nodes, n.id) ?? [];
      anc.forEach((id) => next.add(id));
    } else {
      // 取消时若父节点的所有子都未选中则解除父勾选（仅对菜单层）
      const anc = getAncestors(nodes, n.id) ?? [];
      [...anc].reverse().forEach((id) => {
        const node = allNodes.find((x) => x.id === id);
        const anyChildChecked = node?.children?.some((c) => next.has(c.id));
        if (!anyChildChecked) next.delete(id);
      });
    }
    onChange(Array.from(next));
  };
  return <div className="p-2"><TreeRows nodes={nodes} depth={0} checked={checked} onToggle={toggle} /></div>;
}
function TreeRows({ nodes, depth, checked, onToggle }: { nodes: PermNode[]; depth: number; checked: string[]; onToggle: (n: PermNode, v: boolean) => void }) {
  return (
    <>
      {nodes.map((n) => (
        <div key={n.id}>
          <div className="flex items-center gap-2 py-1.5 hover:bg-muted/40 rounded px-1" style={{ paddingLeft: depth * 18 + 4 }}>
            <Checkbox checked={checked.includes(n.id)} onCheckedChange={(v) => onToggle(n, !!v)} />
            <Badge variant={n.type === "menu" ? "default" : "secondary"} className="text-[10px] h-5">{n.type === "menu" ? "菜单" : "按钮"}</Badge>
            <span className="text-sm font-medium">{n.name}</span>
            <code className="text-[11px] text-muted-foreground font-mono">{n.code}</code>
            {n.api && <code className="text-[11px] text-muted-foreground font-mono opacity-70 ml-auto">{n.api}</code>}
          </div>
          {n.children && <TreeRows nodes={n.children} depth={depth + 1} checked={checked} onToggle={onToggle} />}
        </div>
      ))}
    </>
  );
}

function RoleEditDialog({ open, role, onOpenChange, onSave }: { open: boolean; role: RoleDef | null; onOpenChange: (v: boolean) => void; onSave: (r: RoleDef) => void }) {
  const [draft, setDraft] = useState<RoleDef | null>(role);
  // 同步 props -> draft
  useMemo(() => { setDraft(role); }, [role]);
  if (!draft) return null;
  const isNew = !draft.key;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "新增角色" : `编辑角色 · ${draft.name}`}</DialogTitle>
          <DialogDescription>角色 key 创建后不可修改，将作为账号关联与权限标识使用。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>角色名称 *</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div><Label>角色简称</Label><Input value={draft.short} onChange={(e) => setDraft({ ...draft, short: e.target.value })} placeholder="2 字以内" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>角色 key * <span className="text-muted-foreground text-xs">(英文，唯一)</span></Label>
              <Input value={draft.key} disabled={!isNew} onChange={(e) => setDraft({ ...draft, key: e.target.value.replace(/\s/g, "_") })} placeholder="例：finance" />
            </div>
            <div><Label>颜色</Label>
              <Select value={draft.color} onValueChange={(v) => setDraft({ ...draft, color: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["bg-slate-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-orange-500", "bg-teal-500"].map((c) => (
                    <SelectItem key={c} value={c}><span className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${c}`} />{c.replace("bg-", "").replace("-500", "")}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>描述</Label><Input value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} /></div>
          <div><Label>数据范围</Label>
            <Select value={draft.scope} onValueChange={(v) => setDraft({ ...draft, scope: v as DataScope })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(DATA_SCOPE_LABEL) as DataScope[]).map((s) => <SelectItem key={s} value={s}>{DATA_SCOPE_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => {
            if (!draft.name || !draft.key) { toast.error("请填写名称与 key"); return; }
            onSave({ ...draft, short: draft.short || draft.name.slice(0, 2) });
          }}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================== 权限资源 Tab ============================== */
function TreeTab() {
  const { tree } = usePermStore();
  const [editing, setEditing] = useState<{ node: PermNode; parentId: string | null; isNew: boolean } | null>(null);
  const [deleting, setDeleting] = useState<PermNode | null>(null);

  const updateNode = (id: string, patch: Partial<PermNode>) => {
    const walk = (ns: PermNode[]): PermNode[] => ns.map((n) => n.id === id ? { ...n, ...patch } : { ...n, children: n.children ? walk(n.children) : undefined });
    permStore.setTree(walk(tree));
  };
  const addChild = (parentId: string | null, node: PermNode) => {
    if (parentId === null) { permStore.setTree([...tree, node]); return; }
    const walk = (ns: PermNode[]): PermNode[] => ns.map((n) => n.id === parentId ? { ...n, children: [...(n.children ?? []), node] } : { ...n, children: n.children ? walk(n.children) : undefined });
    permStore.setTree(walk(tree));
  };
  const removeNode = (id: string) => {
    const walk = (ns: PermNode[]): PermNode[] => ns.filter((n) => n.id !== id).map((n) => ({ ...n, children: n.children ? walk(n.children) : undefined }));
    permStore.setTree(walk(tree));
  };

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between p-3 border-b">
        <div>
          <div className="text-sm font-medium">权限资源树</div>
          <div className="text-xs text-muted-foreground">菜单与按钮统一管理。每个节点都包含 <code className="font-mono">权限码</code> 和 <code className="font-mono">接口码</code>，前端用权限码控制显隐，后端用接口码过滤调用。</div>
        </div>
        <Button size="sm" onClick={() => setEditing({ node: makeBlankNode("menu"), parentId: null, isNew: true })}><Plus className="h-4 w-4" /> 新增顶级菜单</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[34%]">名称</TableHead>
            <TableHead>权限码</TableHead>
            <TableHead>接口码</TableHead>
            <TableHead>路径</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TreeTableRows
            nodes={tree} depth={0}
            onAdd={(parent) => setEditing({ node: makeBlankNode(parent.type === "menu" ? "menu" : "menu"), parentId: parent.id, isNew: true })}
            onAddBtn={(parent) => setEditing({ node: makeBlankNode("button"), parentId: parent.id, isNew: true })}
            onEdit={(n) => setEditing({ node: n, parentId: null, isNew: false })}
            onDel={(n) => setDeleting(n)}
          />
        </TableBody>
      </Table>

      <NodeEditDialog
        open={!!editing} state={editing} onOpenChange={(v) => !v && setEditing(null)}
        onSave={(node) => {
          if (!editing) return;
          if (editing.isNew) addChild(editing.parentId, node);
          else updateNode(node.id, node);
          setEditing(null); toast.success("已保存");
        }}
      />
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除「{deleting?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>删除后所有角色对该节点的授权将一并清除。{deleting?.children?.length ? `（含 ${deleting.children.length} 个子节点）` : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleting) { removeNode(deleting.id); setDeleting(null); toast.success("已删除"); } }}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function TreeTableRows({ nodes, depth, onAdd, onAddBtn, onEdit, onDel }: {
  nodes: PermNode[]; depth: number;
  onAdd: (parent: PermNode) => void;
  onAddBtn: (parent: PermNode) => void;
  onEdit: (n: PermNode) => void;
  onDel: (n: PermNode) => void;
}) {
  return (
    <>
      {nodes.map((n) => (
        <RowFragment key={n.id} node={n} depth={depth} onAdd={onAdd} onAddBtn={onAddBtn} onEdit={onEdit} onDel={onDel} />
      ))}
    </>
  );
}
function RowFragment({ node, depth, onAdd, onAddBtn, onEdit, onDel }: {
  node: PermNode; depth: number;
  onAdd: (parent: PermNode) => void;
  onAddBtn: (parent: PermNode) => void;
  onEdit: (n: PermNode) => void;
  onDel: (n: PermNode) => void;
}) {
  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 16 }}>
            {node.children && node.children.length > 0 ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <span className="w-3.5" />}
            <Badge variant={node.type === "menu" ? "default" : "secondary"} className="text-[10px] h-5">{node.type === "menu" ? "菜单" : "按钮"}</Badge>
            <span className="text-sm font-medium">{node.name}</span>
            {node.builtin && <Badge variant="outline" className="text-[10px]">内置</Badge>}
          </div>
        </TableCell>
        <TableCell><code className="text-xs font-mono">{node.code}</code></TableCell>
        <TableCell><code className="text-xs font-mono text-muted-foreground">{node.api ?? "-"}</code></TableCell>
        <TableCell><code className="text-xs font-mono text-muted-foreground">{node.path ?? "-"}</code></TableCell>
        <TableCell className="text-right space-x-1">
          {node.type === "menu" && (
            <>
              <Button size="sm" variant="ghost" onClick={() => onAdd(node)} title="新增子菜单"><Plus className="h-3.5 w-3.5" />菜单</Button>
              <Button size="sm" variant="ghost" onClick={() => onAddBtn(node)} title="新增按钮"><Plus className="h-3.5 w-3.5" />按钮</Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => onEdit(node)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" disabled={node.builtin} onClick={() => onDel(node)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </TableCell>
      </TableRow>
      {node.children && <TreeTableRows nodes={node.children} depth={depth + 1} onAdd={onAdd} onAddBtn={onAddBtn} onEdit={onEdit} onDel={onDel} />}
    </>
  );
}

function makeBlankNode(type: PermNode["type"]): PermNode {
  return { id: type[0] + "_" + Math.random().toString(36).slice(2, 8), type, name: "", code: "", api: "" };
}

function NodeEditDialog({ open, state, onOpenChange, onSave }: {
  open: boolean;
  state: { node: PermNode; parentId: string | null; isNew: boolean } | null;
  onOpenChange: (v: boolean) => void;
  onSave: (n: PermNode) => void;
}) {
  const [draft, setDraft] = useState<PermNode | null>(state?.node ?? null);
  useMemo(() => { setDraft(state?.node ?? null); }, [state]);
  if (!draft) return null;
  const isMenu = draft.type === "menu";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state?.isNew ? `新增${isMenu ? "菜单" : "按钮"}` : `编辑${isMenu ? "菜单" : "按钮"}`}</DialogTitle>
          <DialogDescription>权限码用于前端按钮/菜单显隐控制；接口码用于后端 API 调用过滤（多个用逗号分隔）。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>名称 *</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>权限码 * <span className="text-xs text-muted-foreground">如 user:create</span></Label>
              <Input className="font-mono" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="resource:action" />
            </div>
            <div><Label>接口码 <span className="text-xs text-muted-foreground">逗号分隔</span></Label>
              <Input className="font-mono" value={draft.api ?? ""} onChange={(e) => setDraft({ ...draft, api: e.target.value })} placeholder="POST /api/users" />
            </div>
          </div>
          {isMenu && (
            <div><Label>菜单路径 <span className="text-xs text-muted-foreground">用于侧边栏跳转，可留空</span></Label>
              <Input className="font-mono" value={draft.path ?? ""} onChange={(e) => setDraft({ ...draft, path: e.target.value })} placeholder="/users/accounts" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => {
            if (!draft.name || !draft.code) { toast.error("名称与权限码必填"); return; }
            onSave(draft);
          }}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
