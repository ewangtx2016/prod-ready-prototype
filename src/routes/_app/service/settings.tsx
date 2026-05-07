import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { db, type ReviewRule, type ReviewRuleType } from "@/lib/mock";
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
import { Pencil, Plus, Trash2, AlertTriangle, ShieldAlert, Clock, Repeat, DollarSign, Info } from "lucide-react";
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
      <PageHeader title="服务审核设置" subtitle="切换审核模式，并维护「需要审核」模式下的命中规则" />
      <Tabs defaultValue="mode" className="w-full">
        <TabsList>
          <TabsTrigger value="mode">审核模式</TabsTrigger>
          <TabsTrigger value="rules">审核规则</TabsTrigger>
        </TabsList>

        <TabsContent value="mode" className="mt-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={`p-5 cursor-pointer transition ${mode === "realtime" ? "border-primary ring-2 ring-primary/20" : ""}`} onClick={() => mode !== "realtime" && setPending("realtime")}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">实时监控模式</h3>
            {mode === "realtime" && <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">当前生效</span>}
          </div>
          <p className="text-sm text-muted-foreground">服务记录提交后实时展示，机构可随时查看，无需审核流程，不进行规则匹配。</p>
        </Card>
        <Card className={`p-5 cursor-pointer transition ${mode === "review" ? "border-primary ring-2 ring-primary/20" : ""}`} onClick={() => mode !== "review" && setPending("review")}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">需要审核模式</h3>
            {mode === "review" && <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">当前生效</span>}
          </div>
          <p className="text-sm text-muted-foreground">服务记录提交后先做规则匹配；命中「审核规则」的记录需机构管理员审核通过后才对外展示或生效，并按配置通知管理员。</p>
        </Card>
      </div>
      <Card className="mt-4 border-sky-200 bg-sky-50/50 p-4 text-xs text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>「审核规则」仅在「需要审核」模式下生效。切到实时监控时规则不参与判定，但配置仍会保留。</div>
        </div>
      </Card>
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


const TYPE_META: Record<ReviewRuleType, { label: string; icon: any; desc: string }> = {
  sensitive_word: { label: "敏感词检测", icon: ShieldAlert, desc: "服务记录文本含指定词时触发" },
  duration: { label: "服务时长阈值", icon: Clock, desc: "单次服务时长超出区间时触发" },
  frequency: { label: "频次异常", icon: Repeat, desc: "时窗内同一用户服务次数超阈值时触发" },
  amount: { label: "金额/分润异常", icon: DollarSign, desc: "订单或分润金额超出区间时触发" },
};

function AlertRulesPanel() {
  const { role } = useApp();
  const [list, setList] = useState<ReviewRule[]>([]);
  const [editing, setEditing] = useState<ReviewRule | null>(null);
  const [creating, setCreating] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<"all" | ReviewRuleType>("all");

  useEffect(() => { setList(db.alertRules()); }, []);

  const refresh = () => setList(db.alertRules());

  const toggleEnabled = (r: ReviewRule) => {
    const next = list.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled, updatedBy: ROLE_META[role].name, updatedAt: new Date().toLocaleString("zh-CN") } : x));
    db.setAlertRules(next); refresh();
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "审核规则", action: r.enabled ? "停用" : "启用", detail: r.name, before: { enabled: r.enabled }, after: { enabled: !r.enabled } });
    toast.success(`已${r.enabled ? "停用" : "启用"}：${r.name}`);
  };

  const remove = (r: ReviewRule) => {
    if (!confirm(`确认删除规则「${r.name}」？`)) return;
    const next = list.filter((x) => x.id !== r.id);
    db.setAlertRules(next); refresh();
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "审核规则", action: "删除", detail: r.name, before: r, after: null });
    toast.success("已删除");
  };

  const visible = list.filter((r) => filterType === "all" || r.type === filterType);

  return (
    <div>
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
              <TableHead>命中条件</TableHead>
              <TableHead>命中通知</TableHead>
              <TableHead>最近更新</TableHead>
              <TableHead className="w-24">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">暂无规则</TableCell></TableRow>}
            {visible.map((r) => {
              const Icon = TYPE_META[r.type].icon;
              const channels = [r.notify.inbox && "站内信", r.notify.sms && "短信", r.notify.group && "社群"].filter(Boolean) as string[];
              return (
                <TableRow key={r.id}>
                  <TableCell><Switch checked={r.enabled} onCheckedChange={() => toggleEnabled(r)} /></TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{TYPE_META[r.type].label}</span></TableCell>
                  <TableCell className="max-w-xs text-xs text-muted-foreground">{summarize(r)}</TableCell>
                  <TableCell className="text-xs">
                    {channels.length === 0 ? <span className="text-muted-foreground">—</span> : (
                      <div className="flex flex-wrap gap-1">{channels.map((c) => <Badge key={c} variant="secondary" className="font-normal">{c}</Badge>)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.updatedBy}<br />{r.updatedAt}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
            <div className="mb-1 font-semibold">规则生效说明</div>
            <div>· 审核规则仅在「需要审核」模式下生效；实时监控模式下不参与匹配。</div>
            <div>· 规则保存后对新提交记录立即生效；已提交记录沿用提交时的判定结果。</div>
            <div>· 命中规则的记录将自动暂挂，按勾选的通知方式提醒机构管理员审核。</div>
          </div>
        </div>
      </Card>

      {(editing || creating) && (
        <RuleEditor
          rule={editing || createBlank("sensitive_word")}
          isNew={!editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(saved) => {
            const cur = db.alertRules();
            const next = editing ? cur.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...cur];
            db.setAlertRules(next); refresh();
            db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "审核规则", action: editing ? "修改" : "新增", detail: saved.name, before: editing || null, after: saved });
            toast.success(editing ? "规则已更新" : "规则已新增");
            setEditing(null); setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function createBlank(type: ReviewRuleType): ReviewRule {
  return {
    id: db.rid(),
    type,
    name: TYPE_META[type].label + " · 新规则",
    enabled: true,
    config: type === "sensitive_word" ? { words: [] }
      : type === "duration" ? { minMinutes: 5, maxMinutes: 240 }
      : type === "frequency" ? { windowHours: 24, maxCount: 5 }
      : { minAmount: 1, maxAmount: 50000 },
    notify: { inbox: true, sms: false, group: false },
    updatedBy: "",
    updatedAt: "",
  };
}

function summarize(r: ReviewRule): string {
  const c = r.config;
  switch (r.type) {
    case "sensitive_word": return `命中词：${(c.words || []).slice(0, 6).join("、") || "（空）"}${(c.words?.length || 0) > 6 ? " …" : ""}`;
    case "duration": return `时长 < ${c.minMinutes}min 或 > ${c.maxMinutes}min`;
    case "frequency": return `${c.windowHours}h 内 > ${c.maxCount} 次`;
    case "amount": return `金额 < ¥${c.minAmount} 或 > ¥${c.maxAmount}`;
  }
}

function RuleEditor({ rule, isNew, onClose, onSave }: { rule: ReviewRule; isNew: boolean; onClose: () => void; onSave: (r: ReviewRule) => void }) {
  const { role } = useApp();
  const [form, setForm] = useState<ReviewRule>(rule);
  const [wordsText, setWordsText] = useState((rule.config.words || []).join("\n"));

  const submit = () => {
    const cfg = { ...form.config };
    if (form.type === "sensitive_word") {
      cfg.words = wordsText.split(/[\n,，、\s]+/).map((s: string) => s.trim()).filter(Boolean);
      if (cfg.words.length === 0) return toast.error("请至少填入一个敏感词");
    }
    if (!form.name.trim()) return toast.error("请填写规则名称");
    if (!form.notify.inbox && !form.notify.sms && !form.notify.group) return toast.error("请至少选择一种通知方式");
    const saved: ReviewRule = { ...form, config: cfg, updatedBy: ROLE_META[role].name, updatedAt: new Date().toLocaleString("zh-CN") };
    onSave(saved);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isNew ? "新增" : "编辑"}审核规则{!isNew && ` · ${TYPE_META[form.type].label}`}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {isNew && (
            <div>
              <Label className="mb-2 block">规则类型</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TYPE_META) as ReviewRuleType[]).map((t) => {
                  const Icon = TYPE_META[t].icon;
                  const active = form.type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const blank = createBlank(t);
                        setForm({ ...blank, name: form.name || blank.name, notify: form.notify });
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

          <div>
            <Label className="mb-2 block">命中通知方式</Label>
            <p className="mb-2 text-xs text-muted-foreground">命中规则后，按勾选渠道通知机构管理员处理审核（至少选 1 项）。</p>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.notify.inbox} onCheckedChange={(v) => setForm({ ...form, notify: { ...form.notify, inbox: v } })} />站内信</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.notify.sms} onCheckedChange={(v) => setForm({ ...form, notify: { ...form.notify, sms: v } })} />短信</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.notify.group} onCheckedChange={(v) => setForm({ ...form, notify: { ...form.notify, group: v } })} />社群（企微 / 飞书群）</label>
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>取消</Button><Button onClick={submit}>保存</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
