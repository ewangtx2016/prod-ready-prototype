import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { db, type ProfitRule } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { GitCompare } from "lucide-react";

export const Route = createFileRoute("/_app/profit/audit")({ component: Page });

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<ProfitRule[]>([]);
  const [rejecting, setRejecting] = useState<ProfitRule | null>(null);
  const [reason, setReason] = useState("");
  const [comparing, setComparing] = useState<ProfitRule | null>(null);
  const [dimDefault, setDimDefault] = useState<any>(null);
  useEffect(() => {
    setList(db.rules().filter(r => r.status === "pending_audit"));
    const raw = localStorage.getItem("demo.dim.cfg");
    if (raw) { try { setDimDefault(JSON.parse(raw)); } catch {} }
  }, []);
  const refresh = () => setList(db.rules().filter(r => r.status === "pending_audit"));

  const approve = (r: ProfitRule) => {
    const all = db.rules(); const idx = all.findIndex(x => x.id === r.id);
    all[idx] = { ...all[idx], status: "ready", history: [...all[idx].history, { time: new Date().toLocaleString("zh-CN"), action: "审核通过", operator: ROLE_META[role].name }] };
    db.setRules(all); db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "分成规则", action: "审核通过", detail: r.name });
    toast.success("审核通过"); refresh();
  };
  const doReject = () => {
    if (!rejecting || !reason.trim()) { toast.error("请填写驳回原因"); return; }
    const all = db.rules(); const idx = all.findIndex(x => x.id === rejecting.id);
    all[idx] = { ...all[idx], status: "rejected", rejectReason: reason, history: [...all[idx].history, { time: new Date().toLocaleString("zh-CN"), action: "审核驳回", operator: ROLE_META[role].name }] };
    db.setRules(all); db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "分成规则", action: "审核驳回", detail: `${rejecting.name} - ${reason}` });
    toast.success("已驳回"); setRejecting(null); setReason(""); refresh();
  };

  return (
    <div>
      <PageHeader title="规则审核" subtitle="机构管理员审核鼎校超管提交的分成规则" actions={<Link to="/profit/rules"><Button size="sm" variant="outline">查看全部规则</Button></Link>} />
      <DevNote prd="§9.3" title="规则审核"><div>· 仅机构管理员可审核</div><div>· 驳回必须填写原因，超管可在「分成规则」修改后重新提交</div></DevNote>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>规则名称</TableHead><TableHead>版本</TableHead><TableHead>提交人</TableHead><TableHead>提交时间</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="font-mono text-xs">{r.version}</TableCell>
                <TableCell>{r.createdBy}</TableCell>
                <TableCell className="text-xs">{r.createdAt}</TableCell>
                <TableCell><Badge className="bg-warning text-warning-foreground">待审核</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => setComparing(r)}><GitCompare className="h-3.5 w-3.5" /> 对比</Button>
                  <PermissionTip action="审核通过" prd="§9.3" allow={["org_admin"]}><Button size="sm" disabled={role !== "org_admin"} onClick={() => approve(r)}>通过</Button></PermissionTip>
                  <PermissionTip action="审核驳回" prd="§9.3" allow={["org_admin"]}><Button size="sm" variant="outline" disabled={role !== "org_admin"} onClick={() => setRejecting(r)}>驳回</Button></PermissionTip>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">暂无待审核规则</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={!!rejecting} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>驳回 — {rejecting?.name}</DialogTitle></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请填写驳回原因（必填）" />
          <DialogFooter><Button variant="outline" onClick={() => setRejecting(null)}>取消</Button><Button variant="destructive" onClick={doReject}>确认驳回</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!comparing} onOpenChange={(v) => !v && setComparing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>对比 — {comparing?.name}</DialogTitle></DialogHeader>
          {comparing && <CompareView rule={comparing} dimDefault={dimDefault} />}
          <DialogFooter><Button onClick={() => setComparing(null)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompareView({ rule, dimDefault }: { rule: ProfitRule; dimDefault: any }) {
  const dimMap: Record<string, { label: string; defKey: string }> = {
    courseType: { label: "课程类型", defKey: "courseType" },
    userSource: { label: "用户来源", defKey: "userSource" },
    convStage: { label: "转化阶段", defKey: "convStage" },
  };
  const weightInfo = dimDefault ? `W₁=${dimDefault.w1} W₂=${dimDefault.w2} W₃=${dimDefault.w3}` : "未读取到维度配置默认值";
  return (
    <div className="space-y-3 text-sm max-h-[60vh] overflow-auto">
      <div className="rounded-md bg-info/10 p-2 text-xs">
        <b>维度权重（来自 §9.2 配置，规则不覆盖）：</b>{weightInfo}
      </div>
      {Object.entries(rule.dims).map(([k, v]: any) => {
        const meta = dimMap[k]; if (!meta || !v) return null;
        const def = dimDefault?.[meta.defKey] ?? {};
        return (
          <div key={k} className="rounded-md border">
            <div className="border-b bg-muted/50 px-3 py-2 font-medium">{meta.label}（W={v.weight}）</div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>分类</TableHead>
                <TableHead>默认（机构/规划师/平台）</TableHead>
                <TableHead>规则覆盖（机构/规划师/平台）</TableHead>
                <TableHead>差异</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {Object.entries(v.ratios).map(([cat, val]: any) => {
                  const d = def[cat] as [number, number, number] | undefined;
                  const newArr = [val.org, val.planner, val.platform];
                  const diff = d ? newArr.map((n, i) => n - d[i]) : null;
                  const changed = diff && diff.some(x => x !== 0);
                  return (
                    <TableRow key={cat}>
                      <TableCell className="font-medium">{cat}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{d ? `${d[0]} / ${d[1]} / ${d[2]}` : "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{newArr.join(" / ")}</TableCell>
                      <TableCell>
                        {!d ? <span className="text-muted-foreground">无默认</span> :
                          changed ? <span className="text-warning font-mono text-xs">{diff!.map(x => (x > 0 ? `+${x}` : x)).join(" / ")}</span> :
                          <span className="text-success text-xs">一致</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}
