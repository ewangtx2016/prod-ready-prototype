import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type ProfitRule } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { SmsVerifyDialog } from "@/components/dev/SmsVerifyDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Play, Pause, Edit, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profit/rules")({ component: Page });

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending_audit: { label: "待审核", color: "bg-warning text-warning-foreground" },
  ready: { label: "待使用", color: "bg-info text-info-foreground" },
  active: { label: "使用中", color: "bg-success text-success-foreground" },
  disabled: { label: "已停用", color: "bg-muted text-muted-foreground" },
  rejected: { label: "不通过", color: "bg-destructive text-destructive-foreground" },
};

function Page() {
  const { role } = useApp();
  const [rules, setRules] = useState<ProfitRule[]>([]);
  const [tab, setTab] = useState("all");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<ProfitRule | null>(null);
  const [smsScene, setSmsScene] = useState<{ rule: ProfitRule; action: "submit" | "enable" | "disable" | "reenable" } | null>(null);
  const [auditing, setAuditing] = useState<ProfitRule | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState<ProfitRule | null>(null);

  useEffect(() => { setRules(db.rules()); }, []);
  const refresh = () => setRules(db.rules());

  const filtered = rules.filter((r) => tab === "all" ? true : r.status === tab);

  const onSmsSuccess = () => {
    if (!smsScene) return;
    const list = db.rules();
    const idx = list.findIndex((x) => x.id === smsScene.rule.id);
    if (smsScene.action === "submit") {
      list[idx] = { ...list[idx], status: "pending_audit", history: [...list[idx].history, { time: new Date().toLocaleString("zh-CN"), action: "机构管理员短信验证通过", operator: "机构管理员" }] };
      toast.success("短信验证通过，规则进入待审核");
    } else if (smsScene.action === "enable" || smsScene.action === "reenable") {
      // 先停用其他 active
      list.forEach((r, i) => { if (r.status === "active" && i !== idx) list[i] = { ...r, status: "disabled" }; });
      list[idx] = { ...list[idx], status: "active", history: [...list[idx].history, { time: new Date().toLocaleString("zh-CN"), action: smsScene.action === "enable" ? "启用" : "重新启用", operator: ROLE_META[role].name }] };
      toast.success("规则已启用");
    } else if (smsScene.action === "disable") {
      list[idx] = { ...list[idx], status: "disabled", history: [...list[idx].history, { time: new Date().toLocaleString("zh-CN"), action: "停用", operator: ROLE_META[role].name }] };
      toast.success("规则已停用");
    }
    db.setRules(list);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "分成规则", action: smsScene.action, detail: smsScene.rule.name });
    setSmsScene(null); refresh();
  };

  const approveAudit = (r: ProfitRule) => {
    const list = db.rules();
    const idx = list.findIndex((x) => x.id === r.id);
    list[idx] = { ...list[idx], status: "ready", history: [...list[idx].history, { time: new Date().toLocaleString("zh-CN"), action: "审核通过", operator: ROLE_META[role].name }] };
    db.setRules(list);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "分成规则", action: "审核通过", detail: r.name });
    toast.success("审核通过，规则进入待使用"); refresh();
  };
  const doReject = () => {
    if (!rejecting || !rejectReason.trim()) { toast.error("请填写驳回原因"); return; }
    const list = db.rules();
    const idx = list.findIndex((x) => x.id === rejecting.id);
    list[idx] = { ...list[idx], status: "rejected", rejectReason, history: [...list[idx].history, { time: new Date().toLocaleString("zh-CN"), action: "审核驳回", operator: ROLE_META[role].name }] };
    db.setRules(list); db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "分成规则", action: "审核驳回", detail: `${rejecting.name} - ${rejectReason}` });
    toast.success("已驳回"); setRejecting(null); setRejectReason(""); refresh();
  };

  return (
    <div>
      <PageHeader title="分成规则" subtitle="鼎校超管负责创建/编辑/启停；机构管理员负责短信验证 + 审核" actions={
        <PermissionTip action="新增分成规则" prd="§9.1.3 / §14" allow={["super_admin"]} desc="仅鼎校超管可见">
          <Button size="sm" disabled={role !== "super_admin"} onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> 新增规则</Button>
        </PermissionTip>
      } />
      <DevNote prd="§9.1" title="分成规则生命周期">
        <div>· 状态流转：草稿 → <b>机构短信验证</b> → 待审核 → 机构审核 → 待使用 → <b>启用(机构短信验证)</b> → 使用中 → <b>停用(机构短信验证)</b> → 已停用 → 重新启用</div>
        <div>· 演示提示：以「鼎校超管」身份新增规则 → 切到「机构管理员」完成短信验证与审核 → 切回鼎校启用 → 再切机构验证</div>
        <div>· 短信验证码：任意 6 位数字均通过；输入 000000 模拟错误</div>
      </DevNote>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="pending_audit">待审核</TabsTrigger>
          <TabsTrigger value="ready">待使用</TabsTrigger>
          <TabsTrigger value="active">使用中</TabsTrigger>
          <TabsTrigger value="disabled">已停用</TabsTrigger>
          <TabsTrigger value="rejected">不通过</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>规则名称</TableHead><TableHead>版本</TableHead><TableHead>创建人</TableHead><TableHead>创建时间</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.version}</TableCell>
                  <TableCell>{r.createdBy}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.createdAt}</TableCell>
                  <TableCell><Badge className={STATUS_LABEL[r.status].color}>{STATUS_LABEL[r.status].label}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                    {r.status === "pending_audit" && role === "org_admin" && (
                      <>
                        <PermissionTip action="审核通过" prd="§9.3" allow={["org_admin"]}><Button size="sm" onClick={() => approveAudit(r)}>通过</Button></PermissionTip>
                        <PermissionTip action="审核驳回" prd="§9.3" allow={["org_admin"]}><Button size="sm" variant="outline" onClick={() => setRejecting(r)}>驳回</Button></PermissionTip>
                      </>
                    )}
                    {r.status === "ready" && role === "super_admin" && (
                      <PermissionTip action="启用规则" prd="§9.1.3" allow={["super_admin"]} desc="触发机构管理员短信验证">
                        <Button size="sm" onClick={() => setSmsScene({ rule: r, action: "enable" })}><Play className="h-3.5 w-3.5" /> 启用</Button>
                      </PermissionTip>
                    )}
                    {r.status === "active" && role === "super_admin" && (
                      <PermissionTip action="停用规则" prd="§9.1.3" allow={["super_admin"]}>
                        <Button size="sm" variant="outline" onClick={() => setSmsScene({ rule: r, action: "disable" })}><Pause className="h-3.5 w-3.5" /> 停用</Button>
                      </PermissionTip>
                    )}
                    {r.status === "disabled" && role === "super_admin" && (
                      <Button size="sm" onClick={() => setSmsScene({ rule: r, action: "reenable" })}><Play className="h-3.5 w-3.5" /> 重新启用</Button>
                    )}
                    {r.status === "rejected" && role === "super_admin" && (
                      <Button size="sm" variant="outline" onClick={() => setSmsScene({ rule: r, action: "submit" })}><Edit className="h-3.5 w-3.5" /> 重新提交</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">暂无数据</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* 新增规则 */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>新增分成规则</DialogTitle></DialogHeader>
          <CreateRuleForm onClose={(submit, rule) => {
            setCreating(false);
            if (submit && rule) {
              const list = [rule, ...db.rules()];
              db.setRules(list); refresh();
              setTimeout(() => setSmsScene({ rule, action: "submit" }), 300);
            }
          }} />
        </DialogContent>
      </Dialog>

      {/* 详情 */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{viewing?.name} <span className="ml-2 text-xs text-muted-foreground font-mono">{viewing?.version}</span></DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm max-h-96 overflow-auto">
              <div><b>当前状态：</b><Badge className={STATUS_LABEL[viewing.status].color}>{STATUS_LABEL[viewing.status].label}</Badge></div>
              <div className="rounded-md border p-3"><div className="font-medium mb-2">分成维度配置</div>
                {Object.entries(viewing.dims).map(([k, v]: any) => (
                  <div key={k} className="mb-2 text-xs">
                    <div className="font-medium">{k} (权重 W={v.weight})</div>
                    <div className="ml-2 mt-1 space-y-1 text-muted-foreground">
                      {Object.entries(v.ratios).map(([key, val]: any) => (
                        <div key={key}>· {key}：机构 {val.org}% / 规划师 {val.planner}% / 平台 {val.platform}%</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-md border p-3"><div className="font-medium mb-2">操作历史</div>
                {viewing.history.map((h, i) => <div key={i} className="text-xs text-muted-foreground">· {h.time} - {h.action} ({h.operator})</div>)}
              </div>
              {viewing.rejectReason && <div className="rounded-md bg-destructive/10 p-3 text-xs"><b>驳回原因：</b>{viewing.rejectReason}</div>}
            </div>
          )}
          <DialogFooter><Button onClick={() => setViewing(null)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 驳回 */}
      <Dialog open={!!rejecting} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>驳回分成规则</DialogTitle></DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="请填写驳回原因（必填）" />
          <DialogFooter><Button variant="outline" onClick={() => setRejecting(null)}>取消</Button><Button variant="destructive" onClick={doReject}>确认驳回</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <SmsVerifyDialog
        open={!!smsScene}
        onOpenChange={(v) => !v && setSmsScene(null)}
        title="机构管理员短信验证"
        scene={smsScene ? `鼎校超管发起「${smsScene.action === "submit" ? "提交规则" : smsScene.action === "enable" ? "启用规则" : smsScene.action === "disable" ? "停用规则" : "重新启用规则"}」：${smsScene.rule.name}` : ""}
        onSuccess={onSmsSuccess}
      />
    </div>
  );
}

function CreateRuleForm({ onClose }: { onClose: (submit: boolean, rule?: ProfitRule) => void }) {
  const [name, setName] = useState("");
  const [w1, setW1] = useState(0.4);
  const [w2, setW2] = useState(0.3);
  const [w3, setW3] = useState(0.3);
  const sum = +(w1 + w2 + w3).toFixed(2);
  const submit = () => {
    if (!name.trim()) { toast.error("请填写规则名称"); return; }
    if (sum !== 1) { toast.error(`权重之和必须为 1，当前=${sum}`); return; }
    const rule: ProfitRule = {
      id: "R" + db.rid(), name, version: "v1.0", status: "draft",
      createdBy: "鼎校超管", createdAt: new Date().toLocaleString("zh-CN"),
      dims: {
        courseType: { weight: w1, ratios: { 学科课: { org: 60, planner: 30, platform: 10 }, 素养课: { org: 50, planner: 35, platform: 15 } } },
        userSource: { weight: w2, ratios: { 机构老用户: { org: 70, planner: 20, platform: 10 }, 规划师新拓: { org: 40, planner: 50, platform: 10 } } },
        convStage: { weight: w3, ratios: { 试听转正价课: { org: 50, planner: 40, platform: 10 }, 续报课: { org: 65, planner: 25, platform: 10 } } },
      },
      history: [{ time: new Date().toLocaleString("zh-CN"), action: "鼎校超管创建并提交", operator: "鼎校超管" }],
    };
    onClose(true, rule);
  };
  return (
    <>
      <div className="space-y-3">
        <div><Label>规则名称 *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：2026 Q4 暑期活动规则" /></div>
        <div className="rounded-md border p-3 space-y-2 text-sm">
          <div className="font-medium">三维度权重配置（约束 W₁ + W₂ + W₃ = 1）</div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs">课程类型 W₁</Label><Input type="number" step="0.1" value={w1} onChange={(e) => setW1(+e.target.value)} /></div>
            <div><Label className="text-xs">用户来源 W₂</Label><Input type="number" step="0.1" value={w2} onChange={(e) => setW2(+e.target.value)} /></div>
            <div><Label className="text-xs">转化阶段 W₃</Label><Input type="number" step="0.1" value={w3} onChange={(e) => setW3(+e.target.value)} /></div>
          </div>
          <div className={`text-xs ${sum === 1 ? "text-success" : "text-destructive"}`}>当前权重和：{sum} {sum === 1 ? "✓" : "✗"}</div>
        </div>
        <div className="rounded-md bg-info/10 p-2 text-xs text-info">提交后将向机构管理员发送短信验证码，验证通过规则进入待审核状态。</div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onClose(false)}>取消</Button><Button onClick={submit}>提交并发送验证码</Button></DialogFooter>
    </>
  );
}