import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { db, type Org } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePagination } from "@/components/dev/TablePagination";

export const Route = createFileRoute("/_app/settings/org")({ component: Page });

function OrgLogo({ name }: { name: string }) {
  const initial = name.slice(0, 1);
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary text-lg font-bold">
      {initial}
    </div>
  );
}

function Page() {
  const { role } = useApp();
  const [allOrgs, setAllOrgs] = useState<Org[]>([]);
  const [services, setServices] = useState(db.services());
  const [keyword, setKeyword] = useState("");

  const isAdmin = role === "org_admin";

  useEffect(() => {
    setAllOrgs(db.orgs());
    setServices(db.services());
  }, []);

  // 规划师/学管师：从服务记录反推关联的机构名称
  const linkedOrgNames = useMemo(() => {
    if (isAdmin) return null;
    const servantName = role === "planner" ? "李规划" : role === "tutor" ? "陈学管" : "";
    if (!servantName) return new Set<string>();
    const names = services
      .filter((s) => s.createdBy === servantName && s.orgName)
      .map((s) => s.orgName!);
    return new Set(names);
  }, [isAdmin, role, services]);

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

  return (
    <div>
      <PageHeader
        title="机构管理"
        subtitle="当前账号绑定的机构信息列表"
      />
      <DevNote prd="§11.1" title="机构管理">
        <div>· 鼎校超管：可查看所有机构信息</div>
        <div>· 机构管理员：可查看绑定的 1 个机构信息</div>
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

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>机构名称</TableHead>
              <TableHead>机构ID</TableHead>
              <TableHead>电话</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>地址</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <OrgLogo name={org.name} />
                    <div className="text-sm font-medium">{org.name}</div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{org.id}</TableCell>
                <TableCell className="text-sm">{org.phone || "-"}</TableCell>
                <TableCell className="text-sm">{org.email || "-"}</TableCell>
                <TableCell className="text-sm max-w-xs truncate">{org.address || "-"}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">暂无关联的机构信息</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination />
      </div>
    </div>
  );
}
