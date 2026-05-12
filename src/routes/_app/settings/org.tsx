import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DEFAULT_ORG_LOGO, DEFAULT_ORG_NAME, ORG_STORAGE_KEY, useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { db } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/org")({ component: Page });
type Org = { name: string; logo: string; phone: string; email: string; address: string };
const LEGACY_DEFAULT_ORG_NAME = "示例教育科技有限公司";
const init: Org = { name: DEFAULT_ORG_NAME, logo: "", phone: "400-888-0000", email: "contact@example.com", address: "北京市海淀区中关村大街 1 号" };

function Page() {
  const { role, setOrgName } = useApp();
  const [org, setOrg] = useState<Org>(init);
  const [pwd, setPwd] = useState(false);
  const [pwdData, setPwdData] = useState({ old: "", n1: "", n2: "" });
  useEffect(() => {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Org;
    const next = { ...parsed, name: parsed.name === LEGACY_DEFAULT_ORG_NAME ? DEFAULT_ORG_NAME : parsed.name };
    setOrg(next);
    setOrgName(next.name);
  }, [setOrgName]);
  const canEdit = role === "org_admin";
  const save = () => {
    const next = { ...org, name: org.name.trim() || DEFAULT_ORG_NAME };
    setOrg(next);
    setOrgName(next.name);
    localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(next));
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "机构信息", action: "更新", detail: next.name });
    toast.success("已保存机构信息");
  };
  const doPwd = () => {
    if (!pwdData.old || !pwdData.n1) { toast.error("请填写完整"); return; }
    if (pwdData.n1 !== pwdData.n2) { toast.error("两次新密码不一致"); return; }
    if (pwdData.n1.length < 8) { toast.error("密码至少 8 位"); return; }
    toast.success("密码已重置");
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "机构信息", action: "重置密码", detail: "管理员密码" });
    setPwd(false); setPwdData({ old: "", n1: "", n2: "" });
  };
  return (
    <div>
      <PageHeader title="机构信息" subtitle="品牌 LOGO / 联系方式 / 安全设置" actions={
        <PermissionTip action="保存机构信息" prd="§11.1" allow={["org_admin"]}>
          <Button size="sm" disabled={!canEdit} onClick={save}>保存</Button>
        </PermissionTip>
      } />
      <DevNote prd="§11.1" title="机构信息"><div>· LOGO 用于登录页 / 菜单栏品牌区</div><div>· 重置密码：当前密码 + 新密码两次确认 (≥8 位)</div></DevNote>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 md:col-span-2 space-y-3">
          <div><Label>机构名称 *</Label><Input value={org.name} disabled={!canEdit} onChange={(e) => setOrg({ ...org, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>客服电话</Label><Input value={org.phone} disabled={!canEdit} onChange={(e) => setOrg({ ...org, phone: e.target.value })} /></div>
            <div><Label>客服邮箱</Label><Input value={org.email} disabled={!canEdit} onChange={(e) => setOrg({ ...org, email: e.target.value })} /></div>
          </div>
          <div><Label>办公地址</Label><Textarea value={org.address} disabled={!canEdit} onChange={(e) => setOrg({ ...org, address: e.target.value })} /></div>
        </Card>
        <Card className="p-4 space-y-3">
          <div><Label>品牌 LOGO</Label>
            <div className="mt-2 flex h-32 w-full items-center justify-center rounded-md border border-dashed bg-muted/40">
              <img src={org.logo || DEFAULT_ORG_LOGO} alt="logo" className="max-h-full" />
            </div>
            <Button variant="outline" size="sm" disabled={!canEdit} className="mt-2 w-full" onClick={() => toast.info("文件选择器（mock）")}>选择图片</Button>
          </div>
          <PermissionTip action="重置管理员密码" prd="§11.1" allow={["org_admin"]}>
            <Button variant="outline" size="sm" disabled={!canEdit} className="w-full" onClick={() => setPwd(true)}><KeyRound className="h-4 w-4" /> 重置密码</Button>
          </PermissionTip>
        </Card>
      </div>
      <Dialog open={pwd} onOpenChange={setPwd}>
        <DialogContent>
          <DialogHeader><DialogTitle>重置密码</DialogTitle><DialogDescription>新密码至少 8 位，需包含字母与数字</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>当前密码</Label><Input type="password" value={pwdData.old} onChange={(e) => setPwdData({ ...pwdData, old: e.target.value })} /></div>
            <div><Label>新密码</Label><Input type="password" value={pwdData.n1} onChange={(e) => setPwdData({ ...pwdData, n1: e.target.value })} /></div>
            <div><Label>确认新密码</Label><Input type="password" value={pwdData.n2} onChange={(e) => setPwdData({ ...pwdData, n2: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPwd(false)}>取消</Button><Button onClick={doPwd}>确认</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
