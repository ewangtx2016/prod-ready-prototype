import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { db, type ServiceRecord } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { maskName, maskPhone } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Edit, Eye, Plus, Download, Check, X } from "lucide-react";

export const Route = createFileRoute("/_app/service/records")({ component: Page });

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  submitted: { label: "已填写", color: "bg-info text-info-foreground" },
  pending_audit: { label: "待审核", color: "bg-warning text-warning-foreground" },
  approved: { label: "已通过", color: "bg-success text-success-foreground" },
  rejected: { label: "未通过", color: "bg-destructive text-destructive-foreground" },
};

function Page() {
  const { role } = useApp();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [tab, setTab] = useState("all");
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [viewing, setViewing] = useState<ServiceRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [rejecting, setRejecting] = useState<ServiceRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const isAdmin = role === "org_admin";

  useEffect(() => { setRecords(db.services()); }, []);

  const refresh = () => setRecords(db.services());
  const filtered = records.filter((r) => {
    if (role === "planner") return r.createdByRole === "planner";
    if (role === "tutor") return r.createdByRole === "tutor";
    return true;
  }).filter((r) => tab === "all" ? true : r.status === tab);

  const pendingCount = records.filter((r) => {
    if (role === "planner") return r.createdByRole === "planner" && r.status === "pending_audit";
    if (role === "tutor") return r.createdByRole === "tutor" && r.status === "pending_audit";
    return r.status === "pending_audit";
  }).length;

  const approve = (r: ServiceRecord) => {
    const list = db.services();
    const idx = list.findIndex((x) => x.id === r.id);
    list[idx] = { ...list[idx], status: "approved", content: list[idx].pendingChange?.newContent ?? list[idx].content, pendingChange: undefined };
    db.setServices(list);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "服务记录", action: "审核通过", detail: `#${r.id}` });
    toast.success("审核通过");
    refresh();
  };
  const doReject = () => {
    if (!rejectReason.trim()) { toast.error("请填写驳回原因"); return; }
    if (!rejecting) return;
    const list = db.services();
    const idx = list.findIndex((x) => x.id === rejecting.id);
    list[idx] = { ...list[idx], status: "rejected", rejectReason, pendingChange: undefined };
    db.setServices(list);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "服务记录", action: "审核驳回", detail: `#${rejecting.id} - ${rejectReason}` });
    toast.success("已驳回");
    setRejecting(null); setRejectReason(""); refresh();
  };

  return (
    <div>
      <PageHeader
        title="服务记录"
        subtitle="规划师/学管师与用户交互的全程留痕。提交即锁定，修改走申请审核流。"
        actions={
          <>
            <PermissionTip action="新增服务记录" prd="§6.2 / §14" allow={["planner", "tutor"]}>
              <Button size="sm" disabled={role !== "planner" && role !== "tutor"} onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> 新增
              </Button>
            </PermissionTip>
            <PermissionTip action="导出" prd="§14" allow={["org_admin"]}>
              <Button size="sm" variant="outline" disabled={role !== "org_admin"} onClick={() => { db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "服务记录", action: "导出", detail: `导出 ${filtered.length} 条 (脱敏)` }); toast.success("已导出 services.xlsx (mock)"); }}>
                <Download className="h-4 w-4" /> 导出
              </Button>
            </PermissionTip>
          </>
        }
      />

      <DevNote prd="§6.2 §6.5" title="服务列表 + 修改申请">
        <div>· 提交即锁定：原记录不可直接编辑/删除，只能"提交修改申请"</div>
        <div>· 数据范围：管理员=全量；规划师=本人创建；学管师=本人创建</div>
        <div>· <b>审核流</b>（PRD §6.3 / §14）：仅机构管理员在「待审核」tab 可执行通过/驳回；行内展示「原内容 → 新内容」对比与修改原因</div>
        <div>· 当前列表条数：{filtered.length} / 全部 {records.length}</div>
        <div>· 当前待审核：{pendingCount} 条{!isAdmin && "（仅管理员可审核）"}</div>
      </DevNote>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="submitted">已填写</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="pending_audit">
              待审核{pendingCount > 0 && <span className="ml-1 rounded-full bg-warning px-1.5 text-[10px] text-warning-foreground">{pendingCount}</span>}
            </TabsTrigger>
          )}
          <TabsTrigger value="approved">已通过</TabsTrigger>
          <TabsTrigger value="rejected">未通过</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>内容{tab === "pending_audit" && "（原 → 新）"}</TableHead>
                <TableHead>时长</TableHead>
                <TableHead>提交人</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{maskName(r.userName, role)}</TableCell>
                  <TableCell className="font-mono text-xs">{maskPhone(r.userPhone, role)}</TableCell>
                  <TableCell>{r.serviceType}</TableCell>
                  <TableCell className="max-w-xs text-xs">
                    {r.pendingChange ? (
                      <div className="space-y-0.5">
                        <div className="line-through text-muted-foreground truncate">{r.content}</div>
                        <div className="text-foreground truncate">→ {r.pendingChange.newContent}</div>
                        <div className="text-info text-[11px]">原因：{r.pendingChange.reason}</div>
                      </div>
                    ) : (
                      <div className="truncate">{r.content}</div>
                    )}
                    {r.status === "rejected" && r.rejectReason && (
                      <div className="mt-1 text-[11px] text-destructive">驳回：{r.rejectReason}</div>
                    )}
                  </TableCell>
                  <TableCell>{r.duration} 分钟</TableCell>
                  <TableCell>{r.createdBy}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.createdAt}</TableCell>
                  <TableCell><Badge className={STATUS_LABEL[r.status].color}>{STATUS_LABEL[r.status].label}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                    {(role === "planner" || role === "tutor") && r.status !== "pending_audit" && (
                      <PermissionTip action="提交修改申请" prd="§6.5" allow={["planner", "tutor"]} desc="原记录锁定，必须走申请流">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(r)}><Edit className="h-3.5 w-3.5" /></Button>
                      </PermissionTip>
                    )}
                    {isAdmin && r.status === "pending_audit" && (
                      <>
                        <PermissionTip action="审核通过" prd="§6.3" allow={["org_admin"]}>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-success" onClick={() => approve(r)}><Check className="h-3.5 w-3.5" /> 通过</Button>
                        </PermissionTip>
                        <PermissionTip action="审核驳回" prd="§6.3" allow={["org_admin"]}>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-destructive" onClick={() => setRejecting(r)}><X className="h-3.5 w-3.5" /> 驳回</Button>
                        </PermissionTip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">暂无数据</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* 查看 */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>服务记录详情</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <div><b>用户：</b>{maskName(viewing.userName, role)} ({maskPhone(viewing.userPhone, role)})</div>
              <div><b>类型：</b>{viewing.serviceType} · <b>时长：</b>{viewing.duration} 分钟</div>
              <div><b>内容：</b>{viewing.content}</div>
              <div><b>提交人：</b>{viewing.createdBy} · <b>时间：</b>{viewing.createdAt}</div>
              <div><b>状态：</b><Badge className={STATUS_LABEL[viewing.status].color}>{STATUS_LABEL[viewing.status].label}</Badge></div>
              {viewing.pendingChange && (
                <div className="rounded-md bg-warning/10 p-3 text-xs">
                  <div className="font-medium text-warning-foreground mb-1">修改申请待审核</div>
                  <div>原因：{viewing.pendingChange.reason}</div>
                  <div>新内容：{viewing.pendingChange.newContent}</div>
                </div>
              )}
              {viewing.rejectReason && <div className="rounded-md bg-destructive/10 p-3 text-xs"><b>驳回原因：</b>{viewing.rejectReason}</div>}
            </div>
          )}
          <DialogFooter><Button onClick={() => setViewing(null)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改申请 */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>提交修改申请</DialogTitle></DialogHeader>
          {editing && <EditForm record={editing} onClose={(submit) => { setEditing(null); if (submit) refresh(); }} />}
        </DialogContent>
      </Dialog>

      {/* 新增 */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增服务记录</DialogTitle></DialogHeader>
          <CreateForm onClose={(submit) => { setCreating(false); if (submit) refresh(); }} />
        </DialogContent>
      </Dialog>

      {/* 驳回 */}
      <Dialog open={!!rejecting} onOpenChange={(v) => { if (!v) { setRejecting(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>驳回服务记录</DialogTitle></DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="请填写驳回原因（必填）" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejecting(null); setRejectReason(""); }}>取消</Button>
            <Button variant="destructive" onClick={doReject}>确认驳回</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditForm({ record, onClose }: { record: ServiceRecord; onClose: (submit: boolean) => void }) {
  const { role } = useApp();
  const [reason, setReason] = useState("");
  const [content, setContent] = useState(record.content);
  const submit = () => {
    if (!reason.trim()) { toast.error("请填写修改原因"); return; }
    const list = db.services();
    const idx = list.findIndex((x) => x.id === record.id);
    list[idx] = { ...list[idx], status: "pending_audit", pendingChange: { reason, newContent: content, submittedAt: new Date().toLocaleString("zh-CN") } };
    db.setServices(list);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "服务记录", action: "提交修改申请", detail: `#${record.id} - ${reason}` });
    toast.success("修改申请已提交，等待机构管理员审核");
    onClose(true);
  };
  return (
    <>
      <div className="space-y-3">
        <div><Label>修改原因 *</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请说明为什么需要修改..." /></div>
        <div><Label>新的服务内容</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onClose(false)}>取消</Button><Button onClick={submit}>提交申请</Button></DialogFooter>
    </>
  );
}

function CreateForm({ onClose }: { onClose: (submit: boolean) => void }) {
  const { role } = useApp();
  const [form, setForm] = useState({ userName: "", userPhone: "", serviceType: "沟通", content: "", duration: 30 });
  const submit = () => {
    if (!form.userName || !form.userPhone || !form.content) { toast.error("请填写完整信息"); return; }
    const list = db.services();
    const newRec: ServiceRecord = {
      id: db.rid(), ...form, createdBy: role === "planner" ? "李规划" : "陈学管",
      createdByRole: role === "planner" ? "planner" : "tutor",
      createdAt: new Date().toLocaleString("zh-CN"),
      status: db.auditMode() === "review" ? "pending_audit" : "submitted",
    };
    db.setServices([newRec, ...list]);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "服务记录", action: "新增", detail: `#${newRec.id}` });
    toast.success(db.auditMode() === "review" ? "已提交，等待审核" : "服务记录已提交（实时监控模式）");
    onClose(true);
  };
  return (
    <>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>用户姓名 *</Label><Input value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} /></div>
          <div><Label>手机号 *</Label><Input value={form.userPhone} onChange={(e) => setForm({ ...form, userPhone: e.target.value })} placeholder="13800000000" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>服务类型</Label>
            <Select value={form.serviceType} onValueChange={(v) => setForm({ ...form, serviceType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["沟通", "督学", "答疑", "打卡", "社群"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>时长(分钟)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: +e.target.value })} /></div>
        </div>
        <div><Label>服务内容 *</Label><Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onClose(false)}>取消</Button><Button onClick={submit}>提交</Button></DialogFooter>
    </>
  );
}