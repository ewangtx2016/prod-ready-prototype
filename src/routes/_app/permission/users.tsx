import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { usePermStore } from "@/lib/permissions";
import { db } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dev/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, RotateCcw, Check, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { usePagination } from "@/components/dev/TablePagination";

export const Route = createFileRoute("/_app/permission/users")({ component: Page });

type User = {
  id: string;
  username: string;
  phone: string;
  role: string;
  platform: string;
  orgs: string[];
  enabled: boolean;
  createdAt: string;
};

const KEY = "demo.permission.users";

const sample: User[] = [
  { id: "PU1", username: "chenqi", phone: "13800138003", role: "org_admin", platform: "机构全生命周期平台", orgs: ["机构用户平台"], enabled: true, createdAt: "2026-05-18 19:20:31" },
  { id: "PU2", username: "user@name", phone: "13800138001", role: "org_admin", platform: "机构全生命周期平台", orgs: ["机构用户平台", "鼎校教育朝阳校区"], enabled: true, createdAt: "2026-05-18 19:20:00" },
  { id: "PU3", username: "user@name2", phone: "13900139000", role: "org_admin", platform: "机构全生命周期平台", orgs: ["机构用户平台"], enabled: true, createdAt: "2026-05-18 19:03:23" },
  { id: "PU4", username: "test_user", phone: "13700001111", role: "org_admin", platform: "鼎团团", orgs: [], enabled: true, createdAt: "2026-05-18 17:54:03" },
  { id: "PU5", username: "张三", phone: "13912345678", role: "planner", platform: "机构全生命周期平台", orgs: ["机构用户平台"], enabled: true, createdAt: "2026-05-18 17:53:52" },
  { id: "PU6", username: "测试自动化002", phone: "15780253536", role: "planner", platform: "机构全生命周期平台", orgs: ["鼎校教育朝阳校区"], enabled: true, createdAt: "2026-05-18 11:32:39" },
  { id: "PU7", username: "测试自动化003", phone: "18297847077", role: "tutor", platform: "机构全生命周期平台", orgs: ["机构用户平台", "鼎校教育海淀校区"], enabled: true, createdAt: "2026-05-18 11:26:12" },
  { id: "PU8", username: "test_ceshi", phone: "15555714336", role: "tutor", platform: "鼎团团", orgs: [], enabled: true, createdAt: "2026-05-16 05:45:43" },
  { id: "PU9", username: "测试用户0516", phone: "15964165465", role: "planner", platform: "机构全生命周期平台", orgs: ["鼎校教育朝阳校区"], enabled: true, createdAt: "2026-05-16 00:33:35" },
  { id: "PU10", username: "testPT514", phone: "15556962022", role: "org_admin", platform: "机构全生命周期平台", orgs: ["机构用户平台", "鼎校教育朝阳校区", "鼎校教育海淀校区"], enabled: true, createdAt: "2026-05-14 14:15:49" },
];

function Page() {
  const { role, orgName } = useApp();
  const { roles } = usePermStore();
  const [list, setList] = useState<User[]>([]);
  const [orgOptions, setOrgOptions] = useState<string[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [keyword, setKeyword] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
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
    setOrgOptions(db.orgs().map((o) => o.name));
  }, []);

  const persist = (v: User[]) => {
    setList(v);
    localStorage.setItem(KEY, JSON.stringify(v));
  };

  const save = () => {
    if (!editing) return;
    if (!editing.username) {
      toast.error("用户名称必填");
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
      module: "权限管理-用户管理",
      action: exists ? "编辑用户" : "新增用户",
      detail: editing.username,
    });
    toast.success("已保存");
    setEditing(null);
  };

  const toggle = (u: User) => {
    persist(
      list.map((x) =>
        x.id === u.id ? { ...x, enabled: !x.enabled } : x
      )
    );
    db.log({
      operator: orgName,
      role: role,
      module: "权限管理-用户管理",
      action: u.enabled ? "停用用户" : "启用用户",
      detail: u.username,
    });
  };

  const doReset = () => {
    if (!resetting) return;
    toast.success(`已向 ${resetting.phone} 发送密码重置短信`);
    db.log({
      operator: orgName,
      role: role,
      module: "权限管理-用户管理",
      action: "重置密码",
      detail: resetting.username,
    });
    setResetting(null);
  };

  const canEdit = role === "org_admin";

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const ph = phoneFilter.trim();
    return list.filter((u) => {
      if (statusFilter === "enabled" && !u.enabled) return false;
      if (statusFilter === "disabled" && u.enabled) return false;
      if (platformFilter !== "all" && u.platform !== platformFilter) return false;
      if (ph && !u.phone.includes(ph)) return false;
      if (kw) {
        const hay = `${u.username} ${u.phone}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [list, keyword, phoneFilter, statusFilter, platformFilter]);

  const hasFilter = !!keyword || !!phoneFilter || statusFilter !== "all" || platformFilter !== "all";
  const reset = () => {
    setKeyword("");
    setPhoneFilter("");
    setStatusFilter("all");
    setPlatformFilter("all");
  };

  const { paged, Pagination, page, pageSize } = usePagination(filtered, 10);

  return (
    <div>
      <PageHeader
        title="用户管理"
        subtitle="管理系统用户账号，支持新增、编辑、启停与重置密码"
        actions={
          <Button
            size="sm"
            disabled={!canEdit}
            onClick={() =>
              setEditing({
                id: "PU" + Math.random().toString(36).slice(2, 6),
                username: "",
                phone: "",
                role: "planner",
                platform: "机构全生命周期平台",
                orgs: [],
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
              })
            }
          >
            <Plus className="h-4 w-4" /> 新增
          </Button>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 md:grid-cols-6">
        <div className="space-y-1 md:col-span-1">
          <Label className="text-xs text-muted-foreground">用户名称</Label>
          <Input
            placeholder="请输入"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <Label className="text-xs text-muted-foreground">联系电话</Label>
          <Input
            placeholder="请输入"
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
            className="h-8"
          />
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
              <TableHead>用户名称</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead>平台类型</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((u, idx) => {
              const roleDef = roles.find((r) => r.key === u.role);
              return (
                <TableRow key={u.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {(page - 1) * pageSize + idx + 1}
                  </TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell className="font-mono text-xs">{u.phone}</TableCell>
                  <TableCell className="text-xs">{u.platform}</TableCell>
                  <TableCell>
                    <Badge
                      className={`text-white ${roleDef?.color ?? "bg-slate-500"}`}
                    >
                      {roleDef?.name ?? u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.enabled}
                      disabled={!canEdit}
                      onCheckedChange={() => toggle(u)}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.createdAt}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-emerald-600 hover:text-emerald-700"
                      disabled={!canEdit}
                      onClick={() => setEditing(u)}
                    >
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-emerald-600 hover:text-emerald-700"
                      disabled={!canEdit}
                      onClick={() => setResetting(u)}
                    >
                      重置密码
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
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

      <Dialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing && list.some((x) => x.id === editing.id)
                ? "编辑"
                : "新增"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>
                    <span className="text-red-500">*</span> 用户名称
                  </Label>
                  <Input
                    value={editing.username}
                    maxLength={25}
                    onChange={(e) =>
                      setEditing({ ...editing, username: e.target.value })
                    }
                    placeholder="请输入"
                  />
                  <div className="text-right text-xs text-muted-foreground">
                    {editing.username.length} / 25
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>
                    <span className="text-red-500">*</span> 联系电话
                  </Label>
                  <Input
                    value={editing.phone}
                    onChange={(e) =>
                      setEditing({ ...editing, phone: e.target.value })
                    }
                    placeholder="请输入"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>
                  <span className="text-red-500">*</span> 平台类型
                </Label>
                <Select
                  value={editing.platform}
                  onValueChange={(v) =>
                    setEditing({
                      ...editing,
                      platform: v,
                      orgs: v === "鼎团团" ? [] : editing.orgs,
                    })
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
              <div className="space-y-1">
                <Label>
                  <span className="text-red-500">*</span> 角色
                </Label>
                <Select
                  value={editing.role}
                  onValueChange={(v) =>
                    setEditing({ ...editing, role: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.key} value={r.key}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editing.platform === "机构全生命周期平台" && (
                <div className="space-y-2">
                  <Label>绑定机构</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-auto min-h-9 py-1.5 px-3"
                    >
                      <div className="flex flex-wrap gap-1">
                        {editing.orgs.length === 0 && (
                          <span className="text-muted-foreground text-sm">请选择机构</span>
                        )}
                        {editing.orgs.map((o) => (
                          <Badge
                            key={o}
                            variant="secondary"
                            className="mr-1 gap-1 pr-1 text-xs"
                          >
                            {o}
                            <span
                              role="button"
                              tabIndex={0}
                              className="rounded-full p-0.5 hover:bg-muted cursor-pointer"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                setEditing({
                                  ...editing,
                                  orgs: editing.orgs.filter((x) => x !== o),
                                });
                              }}
                            >
                              <X className="h-3 w-3" />
                            </span>
                          </Badge>
                        ))}
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="搜索机构..." />
                      <CommandList>
                        <CommandEmpty>未找到匹配机构</CommandEmpty>
                        <CommandGroup>
                          {orgOptions.map((o) => {
                            const checked = editing.orgs.includes(o);
                            return (
                              <CommandItem
                                key={o}
                                value={o}
                                onSelect={() => {
                                  const next = checked
                                    ? editing.orgs.filter((x) => x !== o)
                                    : [...editing.orgs, o];
                                  setEditing({ ...editing, orgs: next });
                                }}
                              >
                                <div
                                  className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    checked
                                      ? "bg-primary text-primary-foreground"
                                      : "opacity-50 [&_svg]:invisible"
                                  )}
                                >
                                  <Check className="h-3 w-3" />
                                </div>
                                <span>{o}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                    {editing.orgs.length > 0 && (
                      <div className="border-t p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-center text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setEditing({ ...editing, orgs: [] })}
                        >
                          清空已选
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              )}
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

      <AlertDialog
        open={!!resetting}
        onOpenChange={(v) => !v && setResetting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认重置密码？</AlertDialogTitle>
            <AlertDialogDescription>
              将向 {resetting?.phone} 发送重置链接，链接 24 小时有效。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={doReset}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
