import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { db } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { TemplateCrud } from "@/components/dev/TemplateCrud";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Phone, MessageSquare, Users, Mail, Inbox, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Search = { tab?: string };

export const Route = createFileRoute("/_app/notification/templates")({
  validateSearch: (s: Record<string, unknown>): Search => ({ tab: typeof s.tab === "string" ? s.tab : undefined }),
  component: Page,
});

function Page() {
  const { tab } = useSearch({ from: "/_app/notification/templates" });
  const [active, setActive] = useState<string>(tab || "virtual");
  useEffect(() => { if (tab) setActive(tab); }, [tab]);

  return (
    <div>
      <PageHeader title="通知模板" subtitle="集中管理虚拟号 / 短信 / 社群 / 邮件 / 站内信 五类通知配置" />
      <DevNote prd="§7.1-§7.2" title="通知模板">
        <div>· 模板内容支持 <code>{"{{变量}}"}</code> 占位，由业务事件触发时实际渲染</div>
        <div>· 模板「绑定到事件」请前往 <b>通知事件</b> 配置</div>
        <div>· 虚拟号用于号码隐匿通话，号段用尽后无法再分配</div>
      </DevNote>

      <Tabs value={active} onValueChange={setActive}>
        <TabsList>
          <TabsTrigger value="virtual"><Phone className="h-3.5 w-3.5 mr-1" />虚拟号</TabsTrigger>
          <TabsTrigger value="sms"><MessageSquare className="h-3.5 w-3.5 mr-1" />短信</TabsTrigger>
          <TabsTrigger value="wechat"><Users className="h-3.5 w-3.5 mr-1" />社群</TabsTrigger>
          <TabsTrigger value="email"><Mail className="h-3.5 w-3.5 mr-1" />邮件</TabsTrigger>
          <TabsTrigger value="inbox"><Inbox className="h-3.5 w-3.5 mr-1" />站内信</TabsTrigger>
        </TabsList>

        <TabsContent value="virtual"><VirtualNoPanel /></TabsContent>

        <TabsContent value="sms">
          <TemplateCrud storageKey="demo.tpl.sms" channel="短信" prd="§7.1" title="" subtitle=""
            helpers={["用户姓名", "手机号", "机构名称", "课程名称", "上课时间", "授课老师", "校区", "到期日期", "续报链接", "订单金额", "分润金额", "结算月份"]}
            sample={[
              { id: "T1", key: "renewal_reminder", name: "续报提醒", content: "{{用户姓名}} 家长您好，{{课程名称}} 将于 {{到期日期}} 到期，可点击链接完成续报：{{续报链接}}", channel: "短信", auto: true, createdAt: "2026-04-01 10:00" },
              { id: "T2", key: "settlement_arrived", name: "结算到账提醒", content: "{{用户姓名}}，您 {{结算月份}} 的分润 ¥{{分润金额}} 已到账。", channel: "短信", auto: true, createdAt: "2026-04-10 09:00" },
            ]} />
        </TabsContent>

        <TabsContent value="wechat">
          <TemplateCrud storageKey="demo.tpl.wechat" channel="社群" prd="§7.2" title="" subtitle=""
            helpers={["用户姓名", "机构名称", "课程名称", "授课老师", "上课时间", "校区", "续报链接"]}
            sample={[
              { id: "T1", key: "group_welcome", name: "入群欢迎", content: "欢迎 {{用户姓名}} 加入【{{机构名称}}】学习群～", channel: "社群", auto: true, createdAt: "2026-04-01 10:00" },
            ]} />
        </TabsContent>

        <TabsContent value="email">
          <TemplateCrud storageKey="demo.tpl.email" channel="邮件" prd="§7.2" title="" subtitle=""
            helpers={["用户姓名", "机构名称", "课程名称", "订单金额", "分润金额", "结算月份", "操作链接"]}
            sample={[
              { id: "T1", key: "monthly_settlement", name: "月度结算邮件", content: "{{用户姓名}} 您好：{{结算月份}} 结算单已生成，分润金额 ¥{{分润金额}}。", channel: "邮件", auto: true, createdAt: "2026-04-10 09:00" },
            ]} />
        </TabsContent>

        <TabsContent value="inbox">
          <TemplateCrud storageKey="demo.tpl.inbox.v2" channel="站内信" prd="§7.2" title="" subtitle=""
            helpers={["用户姓名", "机构名称", "课程名称", "订单金额", "分润金额", "结算月份", "到期日期", "操作链接"]}
            sample={[
              { id: "T1", key: "sys_audit_pending", name: "审核待处理通知", content: "{{用户姓名}} 提交了新规则，请尽快前往审核：{{操作链接}}", channel: "站内信", auto: true, createdAt: "2026-04-01 10:00" },
              { id: "T2", key: "sys_settlement_done", name: "账单生成提醒", content: "{{结算月份}} 账单已生成，订单金额 ¥{{订单金额}}，请到「已结算台账」查看。", channel: "站内信", auto: true, createdAt: "2026-04-10 09:00" },
              { id: "T3", key: "sys_split_abnormal", name: "异常分账预警", content: "订单分账失败：{{课程名称}}，金额 ¥{{分润金额}}，请尽快处理：{{操作链接}}", channel: "站内信", auto: true, createdAt: "2026-04-15 14:00" },
            ]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------- 虚拟号 Panel -------------------- */
type Pool = { id: string; range: string; total: number; used: number; expireDays: number; binding: string; callLimit: number; createdAt: string };
const VN_KEY = "demo.vn.pools";
const vnSample: Pool[] = [
  { id: "P1", range: "170-9000-0000 ~ 170-9000-0099", total: 100, used: 23, expireDays: 30, binding: "规划师", callLimit: 50, createdAt: "2026-03-01" },
  { id: "P2", range: "171-8800-0000 ~ 171-8800-0049", total: 50, used: 5, expireDays: 7, binding: "学管师", callLimit: 30, createdAt: "2026-04-01" },
];
const ROLE_OPTIONS = ["规划师", "学管师", "机构管理员", "鼎校超管"];

function VirtualNoPanel() {
  const { role } = useApp();
  const [list, setList] = useState<Pool[]>([]);
  const [editing, setEditing] = useState<Pool | null>(null);
  const [deleting, setDeleting] = useState<Pool | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem(VN_KEY);
    if (raw) setList(JSON.parse(raw)); else { localStorage.setItem(VN_KEY, JSON.stringify(vnSample)); setList(vnSample); }
  }, []);
  const persist = (v: Pool[]) => { setList(v); localStorage.setItem(VN_KEY, JSON.stringify(v)); };
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
      <div className="mb-3 flex justify-end">
        <PermissionTip action="新增号段" prd="§7.1" allow={["org_admin", "super_admin"]}>
          <Button size="sm" disabled={!canEdit} onClick={() => setEditing({ id: "P" + Math.random().toString(36).slice(2, 6), range: "", total: 0, used: 0, expireDays: 30, binding: "规划师", callLimit: 50, createdAt: new Date().toLocaleDateString("zh-CN") })}><Plus className="h-4 w-4" /> 新增号段</Button>
        </PermissionTip>
      </div>
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