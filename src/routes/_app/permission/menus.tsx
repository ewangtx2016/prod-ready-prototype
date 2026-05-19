import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { db } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, RotateCcw, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { usePagination } from "@/components/dev/TablePagination";

export const Route = createFileRoute("/_app/permission/menus")({ component: Page });

type MenuType = "directory" | "menu" | "tab" | "button";

interface MenuNode {
  id: string;
  type: MenuType;
  parentId: string | null;
  name: string;
  component?: string;
  componentName?: string;
  icon?: string;
  routeName?: string;
  path?: string;
  sort: number;
  hidden?: boolean;
  permCode?: string;
  apiCode?: string;
  platform?: string;
  children?: MenuNode[];
}

const KEY = "demo.permission.menus";

function getSample(): MenuNode[] {
  return [
    {
      id: "M1", type: "directory", parentId: null, name: "商品管理", component: "#", componentName: "顶级目录",
      icon: "LayoutGrid", routeName: "Product", path: "/product", sort: 1, hidden: false, platform: "机构全生命周期平台",
      children: [
        { id: "M1-1", type: "menu", parentId: "M1", name: "商品列表", permCode: "product:list", apiCode: "GET /api/products", sort: 1, platform: "机构全生命周期平台" },
        { id: "M1-2", type: "button", parentId: "M1", name: "新增商品", permCode: "product:create", apiCode: "POST /api/products", sort: 2, platform: "机构全生命周期平台" },
      ],
    },
    {
      id: "M2", type: "directory", parentId: null, name: "权限管理", component: "#", componentName: "顶级目录",
      icon: "Lock", routeName: "Authorization", path: "/authorization", sort: 2, hidden: false, platform: "机构全生命周期平台",
    },
    {
      id: "M3", type: "directory", parentId: null, name: "商家管理", component: "#", componentName: "顶级目录",
      icon: "Building2", routeName: "Merchant", path: "/merchant", sort: 3, hidden: false, platform: "鼎团团平台",
    },
    {
      id: "M4", type: "directory", parentId: null, name: "审核管理", component: "#", componentName: "顶级目录",
      icon: "ClipboardCheck", routeName: "Review", path: "/review", sort: 4, hidden: false, platform: "机构全生命周期平台",
    },
    {
      id: "M5", type: "directory", parentId: null, name: "分类管理", component: "#", componentName: "顶级目录",
      icon: "Tags", routeName: "Category", path: "/category", sort: 5, hidden: false, platform: "机构全生命周期平台",
    },
    {
      id: "M6", type: "directory", parentId: null, name: "订单中心", component: "#", componentName: "顶级目录",
      icon: "ShoppingBag", routeName: "MerchantOrder", path: "/MerchantOrder", sort: 6, hidden: false, platform: "鼎团团平台",
    },
    {
      id: "M7", type: "directory", parentId: null, name: "店铺管理", component: "#", componentName: "顶级目录",
      icon: "Store", routeName: "StoreManagement", path: "/storeManagement", sort: 7, hidden: false, platform: "鼎团团平台",
    },
    {
      id: "M8", type: "directory", parentId: null, name: "账号管理", component: "#", componentName: "顶级目录",
      icon: "Users", routeName: "Account", path: "/account", sort: 8, hidden: false, platform: "机构全生命周期平台",
    },
  ];
}

const TYPE_LABEL: Record<MenuType, string> = {
  directory: "目录",
  menu: "菜单",
  tab: "Tab",
  button: "按钮",
};

function flatten(nodes: MenuNode[]): MenuNode[] {
  const out: MenuNode[] = [];
  const walk = (ns: MenuNode[]) => {
    ns.forEach((n) => {
      out.push(n);
      if (n.children) walk(n.children);
    });
  };
  walk(nodes);
  return out;
}

function findNode(nodes: MenuNode[], id: string): MenuNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const r = findNode(n.children, id);
      if (r) return r;
    }
  }
  return null;
}

function updateNode(nodes: MenuNode[], id: string, patch: Partial<MenuNode>): MenuNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...patch };
    if (n.children) return { ...n, children: updateNode(n.children, id, patch) };
    return n;
  });
}

function removeNode(nodes: MenuNode[], id: string): MenuNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n));
}

function addNode(nodes: MenuNode[], parentId: string | null, node: MenuNode): MenuNode[] {
  if (parentId === null) return [...nodes, node];
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: [...(n.children ?? []), node] };
    if (n.children) return { ...n, children: addNode(n.children, parentId, node) };
    return n;
  });
}

function Page() {
  const { role, orgName } = useApp();
  const [tree, setTree] = useState<MenuNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<MenuNode | null>(null);
  const [viewing, setViewing] = useState<MenuNode | null>(null);
  const [deleting, setDeleting] = useState<MenuNode | null>(null);
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("鼎团团平台");

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      setTree(JSON.parse(raw));
    } else {
      const s = getSample();
      localStorage.setItem(KEY, JSON.stringify(s));
      setTree(s);
    }
  }, []);

  const persist = (v: MenuNode[]) => {
    setTree(v);
    localStorage.setItem(KEY, JSON.stringify(v));
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.name) {
      toast.error("菜单名称必填");
      return;
    }
    const exists = findNode(tree, editing.id);
    let next: MenuNode[];
    if (exists) {
      next = updateNode(tree, editing.id, { ...editing, children: exists.children });
    } else {
      const node = { ...editing, children: undefined };
      next = addNode(tree, editParentId, node);
    }
    persist(next);
    db.log({
      operator: orgName,
      role: role,
      module: "权限管理-菜单管理",
      action: exists ? "编辑菜单" : "新增菜单",
      detail: editing.name,
    });
    toast.success("已保存");
    setEditing(null);
    setEditParentId(null);
  };

  const doDelete = () => {
    if (!deleting) return;
    const next = removeNode(tree, deleting.id);
    persist(next);
    db.log({
      operator: orgName,
      role: role,
      module: "权限管理-菜单管理",
      action: "删除菜单",
      detail: deleting.name,
    });
    toast.success("已删除");
    setDeleting(null);
  };

  const canEdit = role === "org_admin";

  // 扁平化并过滤搜索 + 平台
  const flatList = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const all = flatten(tree);
    // 先按平台过滤
    let filtered = all;
    if (platformFilter) {
      filtered = all.filter((n) => (n.platform ?? "机构全生命周期平台") === platformFilter);
    }
    if (!kw) return filtered;
    // 搜索时返回所有匹配节点，同时保留父节点用于展示层级
    const matched = new Set<string>();
    filtered.forEach((n) => {
      if (n.name.toLowerCase().includes(kw)) {
        matched.add(n.id);
        // 向上追溯所有父节点
        let pid = n.parentId;
        while (pid) {
          matched.add(pid);
          const p = filtered.find((x) => x.id === pid);
          pid = p?.parentId ?? null;
        }
      }
    });
    return filtered.filter((n) => matched.has(n.id));
  }, [tree, keyword, platformFilter]);

  // 过滤后只展示有展开的父节点下的子节点
  const visibleRows = useMemo(() => {
    const rows: { node: MenuNode; depth: number }[] = [];
    const walk = (nodes: MenuNode[], depth: number) => {
      nodes.forEach((n) => {
        rows.push({ node: n, depth });
        if (n.children && n.children.length > 0 && expanded.has(n.id)) {
          walk(n.children, depth + 1);
        }
      });
    };
    // 只遍历顶层节点，根据 expanded 状态决定是否展开子节点
    // 但搜索时需要显示所有匹配节点
    if (keyword.trim()) {
      // 搜索模式下直接显示所有过滤后的节点，不按展开状态
      flatList.forEach((n) => {
        const depth = n.parentId
          ? (() => {
              let d = 0;
              let pid: string | null = n.parentId;
              while (pid) {
                d++;
                const p = flatList.find((x) => x.id === pid);
                pid = p?.parentId ?? null;
              }
              return d;
            })()
          : 0;
        rows.push({ node: n, depth });
      });
    } else {
      walk(tree, 0);
    }
    return rows;
  }, [tree, flatList, expanded, keyword]);

  const { paged, Pagination, page, pageSize } = usePagination(visibleRows, 10);

  const allFlat = useMemo(() => flatten(tree), [tree]);
  const directoryOptions = allFlat.filter((n) => n.type === "directory" || n.type === "menu");

  const openNew = (type: MenuType) => {
    setEditParentId(null);
    setEditing({
      id: "M" + Math.random().toString(36).slice(2, 6),
      type,
      parentId: null,
      name: "",
      component: type === "directory" ? "#" : undefined,
      sort: 1,
      hidden: false,
      platform: "机构全生命周期平台",
    });
  };

  return (
    <div>
      <PageHeader
        title="菜单管理"
        subtitle="管理系统菜单资源，支持目录、菜单、Tab、按钮四种类型"
        actions={
          <Button size="sm" disabled={!canEdit} onClick={() => openNew("directory")}>
            <Plus className="h-4 w-4" /> 新增
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 md:grid-cols-6">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs text-muted-foreground">菜单名称</Label>
          <Input
            placeholder="请输入"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <Label className="text-xs text-muted-foreground">平台</Label>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="鼎团团平台">鼎团团平台</SelectItem>
              <SelectItem value="机构全生命周期平台">机构全生命周期平台</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 md:col-span-2">
          <Button size="sm" className="h-8" onClick={() => {}}>
            <Search className="h-3.5 w-3.5" /> 查询
          </Button>
          {(!!keyword || platformFilter !== "鼎团团平台") && (
            <Button variant="ghost" size="sm" className="h-8" onClick={() => { setKeyword(""); setPlatformFilter("鼎团团平台"); }}>
              <RotateCcw className="h-3.5 w-3.5" /> 重置
            </Button>
          )}
        </div>
        <div className="flex items-end justify-end md:col-span-1">
          <span className="text-xs text-muted-foreground">
            共 {visibleRows.length} 条
          </span>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">序号</TableHead>
              <TableHead>菜单名称</TableHead>
              <TableHead>平台</TableHead>
              <TableHead>图标</TableHead>
              <TableHead>组件</TableHead>
              <TableHead>路径</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(({ node, depth }, idx) => {
              const hasChildren = (node.children && node.children.length > 0) || false;
              const isExpanded = expanded.has(node.id);
              return (
                <TableRow key={node.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {(page - 1) * pageSize + idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" style={{ paddingLeft: depth * 16 }}>
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(node.id)}
                          className="p-0.5 hover:bg-accent rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        <span className="w-4" />
                      )}
                      <span>{node.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline">{node.platform ?? "机构全生命周期平台"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {node.icon ?? "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {node.component ?? (node.type === "directory" ? "顶级目录" : "-")}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {node.path ?? "-"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-emerald-600 hover:text-emerald-700"
                      disabled={!canEdit}
                      onClick={() => {
                        setEditing({ ...node });
                        setEditParentId(node.parentId);
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-600 hover:text-blue-700"
                      onClick={() => setViewing(node)}
                    >
                      详情
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      disabled={!canEdit}
                      onClick={() => setDeleting(node)}
                    >
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination />
      </Card>

      {/* 新增/编辑 */}
      <Dialog
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) {
            setEditing(null);
            setEditParentId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing && findNode(tree, editing.id) ? "编辑" : "新增"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* 菜单类型 */}
              <div className="space-y-1">
                <Label>菜单类型</Label>
                <div className="flex gap-2">
                  {(["directory", "menu", "tab", "button"] as MenuType[]).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant={editing.type === t ? "default" : "outline"}
                      onClick={() => setEditing({ ...editing, type: t })}
                    >
                      {TYPE_LABEL[t]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label>选择平台</Label>
                <Select
                  value={editing.platform ?? "机构全生命周期平台"}
                  onValueChange={(v) => setEditing({ ...editing, platform: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="机构全生命周期平台">机构全生命周期平台</SelectItem>
                    <SelectItem value="鼎团团平台">鼎团团平台</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>父级菜单</Label>
                  <Select
                    value={editParentId ?? "0"}
                    onValueChange={(v) => setEditParentId(v === "0" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">主目录</SelectItem>
                      {directoryOptions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {" ".repeat((d.parentId ? 1 : 0) * 2)}{d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>
                    <span className="text-red-500">*</span> 菜单名称
                  </Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="请输入"
                  />
                </div>
              </div>

              {editing.type === "directory" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>
                        <span className="text-red-500">*</span> 组件
                      </Label>
                      <Input value={editing.component ?? "#"} disabled />
                    </div>
                    <div className="space-y-1">
                      <Label>组件名称</Label>
                      <Input
                        value={editing.componentName ?? ""}
                        onChange={(e) => setEditing({ ...editing, componentName: e.target.value })}
                        placeholder="请输入"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>图标</Label>
                      <Input
                        value={editing.icon ?? ""}
                        onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                        placeholder="请输入"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>
                        <span className="text-red-500">*</span> 路由名称
                      </Label>
                      <Input
                        value={editing.routeName ?? ""}
                        onChange={(e) => setEditing({ ...editing, routeName: e.target.value })}
                        placeholder="请输入"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>
                        <span className="text-red-500">*</span> 路径
                      </Label>
                      <Input
                        value={editing.path ?? ""}
                        onChange={(e) => setEditing({ ...editing, path: e.target.value })}
                        placeholder="请输入"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>排序</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing({ ...editing, sort: Math.max(0, editing.sort - 1) })}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          value={editing.sort}
                          onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) })}
                          className="text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing({ ...editing, sort: editing.sort + 1 })}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label>是否隐藏</Label>
                    <Switch
                      checked={editing.hidden ?? false}
                      onCheckedChange={(v) => setEditing({ ...editing, hidden: v })}
                    />
                  </div>
                </>
              )}

              {(editing.type === "menu" || editing.type === "tab" || editing.type === "button") && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>
                        <span className="text-red-500">*</span> 权限标识
                      </Label>
                      <Input
                        value={editing.permCode ?? ""}
                        onChange={(e) => setEditing({ ...editing, permCode: e.target.value })}
                        placeholder="请输入"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>
                        <span className="text-red-500">*</span> 接口权限标识
                      </Label>
                      <Input
                        value={editing.apiCode ?? ""}
                        onChange={(e) => setEditing({ ...editing, apiCode: e.target.value })}
                        placeholder="请输入"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>排序</Label>
                    <div className="flex items-center gap-2 max-w-[200px]">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing({ ...editing, sort: Math.max(0, editing.sort - 1) })}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={editing.sort}
                        onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) })}
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing({ ...editing, sort: editing.sort + 1 })}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setEditParentId(null); }}>
              关闭
            </Button>
            <Button onClick={save}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情 */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>详情</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <tbody>
                  <DetailRow label="菜单类型" value={TYPE_LABEL[viewing.type]} />
                  <DetailRow label="选择平台" value={viewing.platform ?? "-"} />
                  <DetailRow label="父级菜单" value={viewing.parentId ? (findNode(tree, viewing.parentId)?.name ?? "-") : "主目录"} />
                  <DetailRow label="菜单名称" value={viewing.name} />
                  <DetailRow label="组件" value={viewing.component ?? (viewing.type === "directory" ? "顶级目录" : "-")} />
                  <DetailRow label="组件名称" value={viewing.componentName ?? "-"} />
                  <DetailRow label="图标" value={viewing.icon ?? "-"} />
                  <DetailRow label="路径" value={viewing.path ?? "-"} />
                  <DetailRow label="路由名称" value={viewing.routeName ?? "-"} />
                  <DetailRow label="权限标识" value={viewing.permCode ?? "-"} />
                  <DetailRow label="接口权限标识" value={viewing.apiCode ?? "-"} />
                  <DetailRow label="排序" value={String(viewing.sort)} />
                  <DetailRow label="是否隐藏" value={viewing.hidden ? "是" : "否"} />
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除「{deleting?.name}」吗？{deleting?.children && deleting.children.length > 0 ? `（包含 ${deleting.children.length} 个子节点）` : ""}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>取消</Button>
            <Button variant="destructive" onClick={doDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="w-[30%] bg-muted/40 px-3 py-2 text-muted-foreground">{label}</td>
      <td className="px-3 py-2">{value}</td>
    </tr>
  );
}
