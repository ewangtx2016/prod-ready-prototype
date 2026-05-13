import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { db, type Org } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Phone, Mail, MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";
import { usePagination } from "@/components/dev/TablePagination";

export const Route = createFileRoute("/_app/settings/org")({ component: Page });

function OrgLogo({ name }: { name: string }) {
  const initial = name.slice(0, 1);
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary text-xl font-bold">
      {initial}
    </div>
  );
}

function Page() {
  const { role } = useApp();
  const [allOrgs, setAllOrgs] = useState<Org[]>([]);
  const [services, setServices] = useState(db.services());
  const [editing, setEditing] = useState<Org | null>(null);
  const [editForm, setEditForm] = useState<Partial<Org>>({});
  const [keyword, setKeyword] = useState("");

  const isAdmin = role === "org_admin";
  const isPlanner = role === "planner";
  const isTutor = role === "tutor";

  useEffect(() => {
    setAllOrgs(db.orgs());
    setServices(db.services());
  }, []);

  // 规划师/学管师：从服务记录反推关联的机构名称
  const linkedOrgNames = useMemo(() => {
    if (isAdmin) return null;
    const servantName = isPlanner ? "李规划" : isTutor ? "陈学管" : "";
    if (!servantName) return new Set<string>();
    const names = services
      .filter((s) => s.createdBy === servantName && s.orgName)
      .map((s) => s.orgName!);
    return new Set(names);
  }, [isAdmin, isPlanner, isTutor, services]);

  const visibleOrgs = useMemo(() => {
    if (role === "super_admin") return allOrgs;       // 超管：全部机构
    if (isAdmin) return allOrgs.slice(0, 1);           // 机构管理员：仅第一个机构
    if (!linkedOrgNames) return [];
    return allOrgs.filter((o) => linkedOrgNames.has(o.name)); // 规划师/学管师：关联机构
  }, [allOrgs, role, isAdmin, linkedOrgNames]);

  const kw = keyword.trim().toLowerCase();
  const filtered = visibleOrgs.filter((o) => {
    if (!kw) return true;
    return (
      o.name.toLowerCase().includes(kw) ||
      o.id.toLowerCase().includes(kw) ||
      (o.phone ?? "").toLowerCase().includes(kw) ||
      (o.email ?? "").toLowerCase().includes(kw) ||
      (o.address ?? "").toLowerCase().includes(kw)
    );
  });

  const { paged, Pagination } = usePagination(filtered, 12);

  const handleEdit = (org: Org) => {
    setEditing(org);
    setEditForm({ ...org });
  };

  const handleSave = () => {
    if (!editing) return;
    const next = allOrgs.map((o) =>
      o.id === editing.id
        ? {
            ...o,
            name: (editForm.name ?? o.name).trim() || o.name,
            phone: (editForm.phone ?? o.phone).trim(),
            email: (editForm.email ?? o.email).trim(),
            address: (editForm.address ?? o.address).trim(),
          }
        : o
    );
    setAllOrgs(next);
    db.setOrgs(next);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "机构管理", action: "更新机构信息", detail: editing.name });
    toast.success("机构信息已更新");
    setEditing(null);
  };

  return (
    <div>
      <PageHeader
        title="机构管理"
        subtitle="当前账号绑定的机构信息列表"
      />
      <DevNote prd="§11.1" title="机构管理">
        <div>· 鼎校超管：可查看所有机构信息</div>
        <div>· 机构管理员：可查看并编辑绑定的 1 个机构信息</div>
        <div>· 规划师/学管师：仅查看与自己服务记录关联的多个机构</div>
        <div>· 品牌 LOGO 在实际环境中支持上传图片，mock 环境以首字母占位</div>
      </DevNote>

      <div className="mb-3 grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs text-muted-foreground">关键词</Label>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索机构名称 / 电话 / 邮箱 / 地址" className="h-8" />
        </div>
        <div className="flex items-end justify-end">
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setKeyword("")}>重置</Button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          暂无关联的机构信息
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paged.map((org) => (
          <Card key={org.id} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <OrgLogo name={org.name} />
                <div>
                  <div className="text-base font-semibold">{org.name}</div>
                  <div className="text-xs text-muted-foreground">{org.id}</div>
                </div>
              </div>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => handleEdit(org)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">电话：</span>
                <span>{org.phone || "-"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">邮箱：</span>
                <span>{org.email || "-"}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">地址：</span>
                <span className="leading-relaxed">{org.address || "-"}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Pagination />

      {/* 编辑机构弹窗 */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑机构信息</DialogTitle>
            <DialogDescription>修改后点击保存即可生效</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <OrgLogo name={editForm.name || editing?.name || ""} />
              <div className="text-xs text-muted-foreground">品牌 LOGO 在实际环境中支持上传图片</div>
            </div>
            <div>
              <Label>机构名称</Label>
              <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>客服电话</Label>
                <Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <Label>客服邮箱</Label>
                <Input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>办公地址</Label>
              <Textarea value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
