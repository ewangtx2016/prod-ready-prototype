import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import {
  usePermStore, flattenTree, getAncestors,
  type PermNode,
} from "@/lib/permissions";
import { db } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { usePagination } from "@/components/dev/TablePagination";

export const Route = createFileRoute("/_app/permission/roles")({ component: Page });

type RoleItem = {
  id: string;
  name: string;
  roleType: string;
  platform: string;
  dataScope: string;
  enabled: boolean;
  createdAt: string;
  permIds: string[];
};

const KEY = "demo.permission.roles";

const sample: RoleItem[] = [
  { id: "PR1", name: "我是角色", roleType: "platform", platform: "机构全生命周期平台", dataScope: "all", enabled: true, createdAt: "2026-05-18 10:23:46", permIds: [] },
  { id: "PR2", name: "角色000", roleType: "org", platform: "鼎团团", dataScope: "specified_org", enabled: true, createdAt: "2026-05-17 17:31:29", permIds: [] },
  { id: "PR3", name: "acdd", roleType: "platform", platform: "机构全生命周期平台", dataScope: "specified_org", enabled: true, createdAt: "2026-05-15 22:03:45", permIds: [] },
  { id: "PR4", name: "我是新创建角色0515", roleType: "platform", platform: "机构全生命周期平台", dataScope: "all", enabled: true, createdAt: "2026-05-15 19:22:50", permIds: [] },
  { id: "PR5", name: "sdg", roleType: "org", platform: "鼎团团", dataScope: "specified_org", enabled: true, createdAt: "2026-05-15 19:00:25", permIds: [] },
];

const ROLE_TYPE_LABEL: Record<string, string> = {
  platform: "平台运营账号",
  org: "机构账号",
  custom: "自定义",
};

const DATA_SCOPE_LABEL: Record<string, string> = {
  all: "全部",
  self_org: "本机构",
  specified_org: "指定机构",
};

function Page() {
  const { role, orgName } = useApp();
  const { tree } = usePermStore();
  const [list, setList] = useState<RoleItem[]>([]);
  const [editing, setEditing] = useState<RoleItem | null>(null);
  const [configuring, setConfiguring] = useState<RoleItem | null>(null);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      setList(JSON.parse(raw));
    } else {
      localStorage.setItem(KEY, JSON.stringify(sample));
      setList(sample);
    }
  }, []);

  const persist = (v: RoleItem[]) => {
    setList(v);
    localStorage.setItem(KEY, JSON.stringify(v));
  };

  const save = () => {
    if (!editing) return;
    if (!editing.name) {
      toast.error("角色名称必填");
      return;
    }
    const exists = list.find((x) => x.id === editing.id);
    const next = exists
      ? list.map((x) => (x.id === editing.id ? editing : x))
      : [editing, ...list];
    persist(next);
    db.log({
      operator: orgName,
      role: role,
      module: "权限管理-角色管理",
      action: exists ? "编辑角色" : "新增角色",
      detail: editing.name,
    });
    toast.success("已保存");
    setEditing(null);
  };

  const toggle = (r: RoleItem) => {
    persist(
      list.map((x) =>
        x.id === r.id ? { ...x, enabled: !x.enabled } : x
      )
    );
    db.log({
      operator: orgName,
      role: role,
      module: "权限管理-角色管理",
      action: r.enabled ? "停用角色" : "启用角色",
      detail: r.name,
    });
  };

  const saveConfig = () => {
    if (!configuring) return;
    persist(
      list.map((x) => (x.id === configuring.id ? configuring : x))
    );
    db.log({
      operator: orgName,
      role: role,
      module: "权限管理-角色管理",
      action: "配置权限",
      detail: configuring.name,
    });
    toast.success("权限配置已保存");
    setConfiguring(null);
  };

  const canEdit = role === "org_admin";

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return list.filter((r) => {
      if (typeFilter !== "all" && r.roleType !== typeFilter) return false;
      if (statusFilter === "enabled" && !r.enabled) return false;
      if (statusFilter === "disabled" && r.enabled) return false;
      if (platformFilter !== "all" && r.platform !== platformFilter) return false;
      if (kw && !r.name.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [list, keyword, typeFilter, statusFilter, platformFilter]);

  const hasFilter = !!keyword || typeFilter !== "all" || statusFilter !== "all" || platformFilter !== "all";
  const reset = () => {
    setKeyword("");
    setTypeFilter("all");
    setStatusFilter("all");
    setPlatformFilter("all");
  };

  const { paged, Pagination, page, pageSize } = usePagination(filtered, 10);

  return (
    <div>
      <PageHeader
        title="角色管理"
        subtitle="管理系统角色，支持配置数据范围与菜单权限"
        actions={
          <Button
            size="sm"
            disabled={!canEdit}
            onClick={() =>
              setEditing({
                id: "PR" + Math.random().toString(36).slice(2, 6),
                name: "",
                roleType: "platform",
                platform: "机构全生命周期平台",
                dataScope: "all",
                enabled: true,
                createdAt: new Date().toLocaleString("zh-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                }).replace(/\//g, "-"),
                permIds: [],
              })
            }
          >
            <Plus className="h-4 w-4" /> 创建角色
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 md:grid-cols-6">
        <div className="space-y-1 md:col-span-1">
          <Label className="text-xs text-muted-foreground">角色名称</Label>
          <Input
            placeholder="请输入"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <Label className="text-xs text-muted-foreground">角色类型</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="platform">平台运营账号</SelectItem>
              <SelectItem value="org">机构账号</SelectItem>
              <SelectItem value="custom">自定义</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 md:col-span-1">
          <Label className="text-xs text-muted-foreground">状态</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="enabled">启用</SelectItem>
              <SelectItem value="disabled">停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 md:col-span-1">
          <Label className="text-xs text-muted-foreground">平台类型</Label>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="机构全生命周期平台">机构全生命周期平台</SelectItem>
              <SelectItem value="鼎团团">鼎团团</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 md:col-span-2">
          <Button size="sm" className="h-8" onClick={() => {}}>
            <Search className="h-3.5 w-3.5" /> 查询
          </Button>
          {hasFilter && (
            <Button variant="ghost" size="sm" className="h-8" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> 重置
            </Button>
          )}
        </div>
        <div className="flex items-end justify-end md:col-span-1">
          <span className="text-xs text-muted-foreground">
            共 {filtered.length} 条
          </span>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">序号</TableHead>
              <TableHead>角色名称</TableHead>
              <TableHead>角色类型</TableHead>
              <TableHead>平台类型</TableHead>
              <TableHead>数据范围</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((r, idx) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {(page - 1) * pageSize + idx + 1}
                </TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{ROLE_TYPE_LABEL[r.roleType] ?? r.roleType}</TableCell>
                <TableCell className="text-xs">{r.platform}</TableCell>
                <TableCell>{DATA_SCOPE_LABEL[r.dataScope] ?? r.dataScope}</TableCell>
                <TableCell>
                  <Switch
                    checked={r.enabled}
                    disabled={!canEdit}
                    onCheckedChange={() => toggle(r)}
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.createdAt}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-emerald-600 hover:text-emerald-700"
                    disabled={!canEdit}
                    onClick={() => setConfiguring(r)}
                  >
                    配置
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-muted-foreground"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination />
      </Card>

      {/* 新增/编辑角色 */}
      <Dialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editing && list.some((x) => x.id === editing.id)
                ? "编辑"
                : "创建角色"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className={`grid gap-4 ${editing.platform === "机构全生命周期平台" ? "grid-cols-2" : "grid-cols-3"}`}>
                <div className="space-y-1">
                  <Label>
                    <span className="text-red-500">*</span> 角色名称
                  </Label>
                  <Input
                    value={editing.name}
                    maxLength={25}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    placeholder="请输入"
                  />
                  <div className="text-right text-xs text-muted-foreground">
                    {editing.name.length} / 25
                  </div>
                </div>
                {editing.platform !== "机构全生命周期平台" && (
                  <div className="space-y-1">
                    <Label>
                      <span className="text-red-500">*</span> 角色类型
                    </Label>
                    <Select
                      value={editing.roleType}
                      onValueChange={(v) =>
                        setEditing({ ...editing, roleType: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="platform">平台运营账号</SelectItem>
                        <SelectItem value="org">机构账号</SelectItem>
                        <SelectItem value="custom">自定义</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label>
                    <span className="text-red-500">*</span> 平台类型
                  </Label>
                  <Select
                    value={editing.platform}
                    onValueChange={(v) =>
                      setEditing({ ...editing, platform: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="机构全生命周期平台">机构全生命周期平台</SelectItem>
                      <SelectItem value="鼎团团">鼎团团</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editing.platform !== "机构全生命周期平台" && (
                <div className="space-y-2">
                  <Label>
                    <span className="text-red-500">*</span> 数据范围
                  </Label>
                  <div className="flex gap-6">
                    {[
                      { value: "all", label: "全部" },
                      { value: "self_org", label: "本机构" },
                      { value: "specified_org", label: "指定机构" },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="dataScope"
                          value={opt.value}
                          checked={editing.dataScope === opt.value}
                          onChange={() =>
                            setEditing({ ...editing, dataScope: opt.value })
                          }
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>菜单分配</Label>
                <div className="text-xs text-muted-foreground">
                  勾选菜单或按钮即授予对应权限。勾选子节点会自动勾选父级菜单。
                </div>
                <div className="rounded-md border max-h-[40vh] overflow-auto">
                  <PermTreeChecker
                    nodes={tree}
                    checked={editing.permIds}
                    onChange={(ids) =>
                      setEditing({ ...editing, permIds: ids })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              关闭
            </Button>
            <Button onClick={save}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 配置权限 */}
      <Dialog
        open={!!configuring}
        onOpenChange={(v) => !v && setConfiguring(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>配置权限 · {configuring?.name}</DialogTitle>
          </DialogHeader>
          {configuring && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                勾选菜单或按钮即授予对应权限。勾选子节点会自动勾选父级菜单。
              </div>
              <div className="rounded-md border max-h-[50vh] overflow-auto">
                <PermTreeChecker
                  nodes={tree}
                  checked={configuring.permIds}
                  onChange={(ids) =>
                    setConfiguring({ ...configuring, permIds: ids })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfiguring(null)}>
              关闭
            </Button>
            <Button onClick={saveConfig}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================== 权限树勾选器 ============================== */
function PermTreeChecker({
  nodes,
  checked,
  onChange,
}: {
  nodes: PermNode[];
  checked: string[];
  onChange: (ids: string[]) => void;
}) {
  const allNodes = useMemo(() => flattenTree(nodes), [nodes]);
  const toggle = (n: PermNode, value: boolean) => {
    let next = new Set(checked);
    const cascade = (node: PermNode, on: boolean) => {
      if (on) next.add(node.id);
      else next.delete(node.id);
      node.children?.forEach((c) => cascade(c, on));
    };
    cascade(n, value);
    if (value) {
      const anc = getAncestors(nodes, n.id) ?? [];
      anc.forEach((id) => next.add(id));
    } else {
      const anc = getAncestors(nodes, n.id) ?? [];
      [...anc].reverse().forEach((id) => {
        const node = allNodes.find((x) => x.id === id);
        const anyChildChecked = node?.children?.some((c) => next.has(c.id));
        if (!anyChildChecked) next.delete(id);
      });
    }
    onChange(Array.from(next));
  };
  return (
    <div className="p-2">
      <TreeRows nodes={nodes} depth={0} checked={checked} onToggle={toggle} />
    </div>
  );
}

function TreeRows({
  nodes,
  depth,
  checked,
  onToggle,
}: {
  nodes: PermNode[];
  depth: number;
  checked: string[];
  onToggle: (n: PermNode, v: boolean) => void;
}) {
  return (
    <>
      {nodes.map((n) => (
        <div key={n.id}>
          <div
            className="flex items-center gap-2 py-1.5 hover:bg-muted/40 rounded px-1"
            style={{ paddingLeft: depth * 18 + 4 }}
          >
            <Checkbox
              checked={checked.includes(n.id)}
              onCheckedChange={(v) => onToggle(n, !!v)}
            />
            <Badge
              variant={n.type === "menu" ? "default" : "secondary"}
              className="text-[10px] h-5"
            >
              {n.type === "menu" ? "菜单" : "按钮"}
            </Badge>
            <span className="text-sm font-medium">{n.name}</span>
            {n.builtin && (
              <Badge variant="outline" className="text-[10px]">
                内置
              </Badge>
            )}
          </div>
          {n.children && (
            <TreeRows
              nodes={n.children}
              depth={depth + 1}
              checked={checked}
              onToggle={onToggle}
            />
          )}
        </div>
      ))}
    </>
  );
}
