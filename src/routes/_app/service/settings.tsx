import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { db, type AlertRule, type AlertRuleType, type AlertSeverity, type AlertScope } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { RoleGate } from "@/components/dev/RoleGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Plus, Trash2, AlertTriangle, ShieldAlert, Clock, Repeat, DollarSign } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/service/settings")({ component: () => <RoleGate allow={["org_admin", "super_admin"]}><Inner /></RoleGate> });

function Inner() {
  const { role } = useApp();
  const [mode, setMode] = useState<"realtime" | "review">("realtime");
  const [pending, setPending] = useState<"realtime" | "review" | null>(null);
  useEffect(() => { setMode(db.auditMode()); }, []);

  const apply = () => {
    if (!pending) return;
    db.setAuditMode(pending);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "服务记录", action: "切换审核模式", detail: `${mode} → ${pending}` });
    setMode(pending); setPending(null);
    toast.success(`审核模式已切换为「${pending === "realtime" ? "实时监控" : "需要审核"}」`);
  };

  return (
    <div>
      <PageHeader title="服务审核与预警" subtitle="审核模式 + 预设预警规则，命中规则自动标记并通知管理员" />
      <Tabs defaultValue="mode" className="w-full">
        <TabsList>
          <TabsTrigger value="mode">审核模式</TabsTrigger>
          <TabsTrigger value="rules">预警规则</TabsTrigger>
        </TabsList>

        <TabsContent value="mode" className="mt-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={`p-5 cursor-pointer transition ${mode === "realtime" ? "border-primary ring-2 ring-primary/20" : ""}`} onClick={() => mode !== "realtime" && setPending("realtime")}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">实时监控模式</h3>
            {mode === "realtime" && <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">当前生效</span>}
          </div>
          <p className="text-sm text-muted-foreground">服务记录实时展示，机构可随时查看。命中预设规则时自动触发预警和标记，记录本身不阻塞展示。</p>
        </Card>
        <Card className={`p-5 cursor-pointer transition ${mode === "review" ? "border-primary ring-2 ring-primary/20" : ""}`} onClick={() => mode !== "review" && setPending("review")}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">需要审核模式</h3>
            {mode === "review" && <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">当前生效</span>}
          </div>
          <p className="text-sm text-muted-foreground">命中规则的服务记录需机构管理员审核通过后才对外展示或生效。</p>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <AlertRulesPanel />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!pending} onOpenChange={(v) => !v && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认切换审核模式？</AlertDialogTitle>
            <AlertDialogDescription>将从「{mode === "realtime" ? "实时监控" : "需要审核"}」切换为「{pending === "realtime" ? "实时监控" : "需要审核"}」，操作将记入审计日志。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction asChild><Button onClick={apply}>确认切换</Button></AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const TYPE_META: Record<AlertRuleType, { label: string; icon: any; desc: string }> = {
  sensitive_word: { label: "敏感词检测", icon: ShieldAlert, desc: "服务记录文本含指定词时触发" },
  duration: { label: "服务时长阈值", icon: Clock, desc: "单次服务时长超出区间时触发" },
  frequency: { label: "频次异常", icon: Repeat, desc: "时窗内同一用户服务次数超阈值时触发" },
  amount: { label: "金额/分润异常", icon: DollarSign, desc: "订单或分润金额超出区间时触发" },
};

function AlertRulesPanel() {
  const { role } = useApp();
  const isSuper = role === "super_admin";
  const [list, setList] = useState<AlertRule[]>([]);
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [creating, setCreating] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<"all" | AlertRuleType>("all");

  useEffect(() => { setList(db.alertRules()); }, []);

  const refresh = () => setList(db.alertRules());

  const toggleEnabled = (r: AlertRule) => {
    const next = list.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled, updatedBy: ROLE_META[role].name, updatedAt: new Date().toLocaleString("zh-CN") } : x));
    db.setAlertRules(next); refresh();
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "预警规则", action: r.enabled ? "停用" : "启用", detail: r.name, before: { enabled: r.enabled }, after: { enabled: !r.enabled } });
    toast.success(`已${r.enabled ? "停用" : "启用"}：${r.name}`);
  };

  const remove = (r: AlertRule) => {
    if (!confirm(`确认删除规则「${r.name}」？`)) return;
    const next = list.filter((x) => x.id !== r.id);
    db.setAlertRules(next); refresh();
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "预警规则", action: "删除", detail: r.name, before: r, after: null });
    toast.success("已删除");
  };

  const visible = list.filter((r) => filterType === "all" || r.type === filterType);

  return (
    <div>
      <DevNote prd="§6.4 预警规则" title="预警规则机制">
        <div>· 鼎校超管设置全局规则模板；机构管理员可在本机构覆盖（如调严阈值）。</div>
        <div>· 命中黄标 · 仅标记预警；命中红标 · 在「需要审核」模式下阻塞展示直至审核。</div>
        <div>· 所有命中均自动写入审计日志，按通知配置推送站内信/短信给机构管理员。</div>
      </DevNote>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">筛选：</Label>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {Object.entries(TYPE_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />新增规则
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">启用</TableHead>
              <TableHead>规则名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>配置摘要</TableHead>
              <TableHead>等级</TableHead>
              <TableHead>作用域</TableHead>
              <TableHead>通知</TableHead>
              <TableHead>更新</TableHead>
              <TableHead className="w-32">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">暂无规则</TableCell></TableRow>}
            {visible.map((r) => {
              const Icon = TYPE_META[r.type].icon;
              return (
                <TableRow key={r.id}>
                  <TableCell><Switch checked={r.enabled} onCheckedChange={() => toggleEnabled(r)} /></TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{TYPE_META[r.type].label}</span></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs">{summarize(r)}</TableCell>
                  <TableCell>{r.severity === "block" ? <Badge variant="destructive">红标·阻塞</Badge> : <Badge className="bg-amber-500 hover:bg-amber-500">黄标·预警</Badge>}</TableCell>
                  <TableCell>{r.scope === "global" ? <Badge variant="secondary">全局</Badge> : <Badge variant="outline">机构 · {r.orgName}</Badge>}</TableCell>
                  <TableCell className="text-xs">{[r.notify.inbox && "站内信", r.notify.sms && "短信"].filter(Boolean).join(" · ") || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.updatedBy}<br />{r.updatedAt}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r)} disabled={r.scope === "global" && !isSuper}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="mt-4 border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold mb-1">规则生效说明</div>
            <div>· 规则修改保存后立即生效；生效前已提交的服务记录沿用旧规则判定结果。</div>
            <div>· 机构级规则覆盖全局同类规则中更宽松的部分（取更严配置）。</div>
            <div>· 历史已审核通过的记录不追溯，需手动重审才会重新匹配新规则。</div>
          </div>
        </div>
      </Card>

      {(editing || creating) && (
        <RuleEditor
          rule={editing || createBlank("sensitive_word", isSuper)}
          isNew={!editing}
          isSuper={isSuper}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(saved) => {
            const cur = db.alertRules();
            const next = editing ? cur.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...cur];
            db.setAlertRules(next); refresh();
            db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "预警规则", action: editing ? "修改" : "新增", detail: saved.name, before: editing || null, after: saved });
            toast.success(editing ? "规则已更新" : "规则已新增");
            setEditing(null); setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function createBlank(type: AlertRuleType, isSuper: boolean): AlertRule {
  return {
    id: db.rid(),
    type,
    name: TYPE_META[type].label + " · 新规则",
    enabled: true,
    severity: "warn",
    scope: isSuper ? "global" : "org",
    orgName: isSuper ? undefined : "示例机构 A",
    config: type === "sensitive_word" ? { words: [] }
      : type === "duration" ? { minMinutes: 5, maxMinutes: 240 }
      : type === "frequency" ? { windowHours: 24, maxCount: 5 }
      : { minAmount: 1, maxAmount: 50000 },
    notify: { inbox: true, sms: false },
    updatedBy: "",
    updatedAt: "",
  };
}

function summarize(r: AlertRule): string {
  const c = r.config;
  switch (r.type) {
    case "sensitive_word": return `命中词：${(c.words || []).slice(0, 6).join("、") || "（空）"}${(c.words?.length || 0) > 6 ? " …" : ""}`;
    case "duration": return `时长 < ${c.minMinutes}min 或 > ${c.maxMinutes}min`;
    case "frequency": return `${c.windowHours}h 内 > ${c.maxCount} 次`;
    case "amount": return `金额 < ¥${c.minAmount} 或 > ¥${c.maxAmount}`;
  }
}

function RuleEditor({ rule, isNew, isSuper, onClose, onSave }: { rule: AlertRule; isNew: boolean; isSuper: boolean; onClose: () => void; onSave: (r: AlertRule) => void }) {
  const { role } = useApp();
  const [form, setForm] = useState<AlertRule>(rule);
  const [wordsText, setWordsText] = useState((rule.config.words || []).join("\n"));

  const submit = () => {
    const cfg = { ...form.config };
    if (form.type === "sensitive_word") {
      cfg.words = wordsText.split(/[\n,，、\s]+/).map((s) => s.trim()).filter(Boolean);
      if (cfg.words.length === 0) return toast.error("请至少填入一个敏感词");
    }
    if (!form.name.trim()) return toast.error("请填写规则名称");
    const saved: AlertRule = { ...form, config: cfg, updatedBy: ROLE_META[role].name, updatedAt: new Date().toLocaleString("zh-CN") };
    onSave(saved);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isNew ? "新增" : "编辑"}预警规则{!isNew && ` · ${TYPE_META[form.type].label}`}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {isNew && (
            <div>
              <Label className="mb-2 block">规则类型</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TYPE_META) as AlertRuleType[]).map((t) => {
                  const Icon = TYPE_META[t].icon;
                  const active = form.type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const blank = createBlank(t, isSuper);
                        setForm({ ...blank, name: form.name || blank.name, severity: form.severity, scope: form.scope, orgName: form.orgName, notify: form.notify });
                        setWordsText("");
                      }}
                      className={`flex items-start gap-2 rounded-md border p-3 text-left transition ${active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/50"}`}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{TYPE_META[t].label}</div>
                        <div className="text-xs text-muted-foreground">{TYPE_META[t].desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <Label>规则名称</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          {form.type === "sensitive_word" && (
            <div>
              <Label>敏感词列表（每行一个，或逗号分隔）</Label>
              <Textarea rows={5} value={wordsText} onChange={(e) => setWordsText(e.target.value)} placeholder="投诉&#10;退费&#10;转介" />
            </div>
          )}
          {form.type === "duration" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>下限（分钟）</Label><Input type="number" value={form.config.minMinutes ?? 0} onChange={(e) => setForm({ ...form, config: { ...form.config, minMinutes: +e.target.value } })} /></div>
              <div><Label>上限（分钟）</Label><Input type="number" value={form.config.maxMinutes ?? 0} onChange={(e) => setForm({ ...form, config: { ...form.config, maxMinutes: +e.target.value } })} /></div>
            </div>
          )}
          {form.type === "frequency" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>统计时窗（小时）</Label><Input type="number" value={form.config.windowHours ?? 0} onChange={(e) => setForm({ ...form, config: { ...form.config, windowHours: +e.target.value } })} /></div>
              <div><Label>触发次数（&gt;）</Label><Input type="number" value={form.config.maxCount ?? 0} onChange={(e) => setForm({ ...form, config: { ...form.config, maxCount: +e.target.value } })} /></div>
            </div>
          )}
          {form.type === "amount" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>下限金额（元）</Label><Input type="number" value={form.config.minAmount ?? 0} onChange={(e) => setForm({ ...form, config: { ...form.config, minAmount: +e.target.value } })} /></div>
              <div><Label>上限金额（元）</Label><Input type="number" value={form.config.maxAmount ?? 0} onChange={(e) => setForm({ ...form, config: { ...form.config, maxAmount: +e.target.value } })} /></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>命中等级</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as AlertSeverity })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="warn">黄标 · 仅预警</SelectItem>
                  <SelectItem value="block">红标 · 审核模式下阻塞</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>作用域</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as AlertScope })} disabled={!isSuper && form.scope === "org"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isSuper && <SelectItem value="global">全局（所有机构）</SelectItem>}
                  <SelectItem value="org">机构级（当前机构覆盖）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">命中通知方式</Label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.notify.inbox} onCheckedChange={(v) => setForm({ ...form, notify: { ...form.notify, inbox: v } })} />站内信</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.notify.sms} onCheckedChange={(v) => setForm({ ...form, notify: { ...form.notify, sms: v } })} />短信</label>
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>取消</Button><Button onClick={submit}>保存</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}