import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { ROLE_META, ROLE_LIST, type Role } from "@/lib/roles";
import { db, type NotifyEvent, type NotifyChannelKey } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { RoleGate } from "@/components/dev/RoleGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Search, Mail, MessageSquare, Inbox, Users } from "lucide-react";

export const Route = createFileRoute("/_app/settings/notification-events")({
  component: () => <RoleGate allow={["org_admin", "super_admin"]}><Page /></RoleGate>,
});

const CHANNEL_META: Record<NotifyChannelKey, { label: string; icon: any; tplRoute: string; tplTab: string; tplKey: string }> = {
  inbox: { label: "站内信", icon: Inbox, tplRoute: "/notification/templates", tplTab: "inbox", tplKey: "demo.tpl.inbox.v2" },
  sms: { label: "短信", icon: MessageSquare, tplRoute: "/notification/templates", tplTab: "sms", tplKey: "demo.tpl.sms" },
  group: { label: "社群", icon: Users, tplRoute: "/notification/templates", tplTab: "wechat", tplKey: "demo.tpl.wechat" },
  email: { label: "邮件", icon: Mail, tplRoute: "/notification/templates", tplTab: "email", tplKey: "demo.tpl.email" },
};

const CATEGORIES: NotifyEvent["category"][] = ["服务审核", "操作预警", "续报提醒", "财务结算", "账号安全"];

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<NotifyEvent[]>([]);
  const [editing, setEditing] = useState<NotifyEvent | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | NotifyEvent["category"]>("all");

  useEffect(() => { setList(db.notifyEvents()); }, []);
  const refresh = () => setList(db.notifyEvents());

  const visible = useMemo(() => list.filter((e) =>
    (cat === "all" || e.category === cat) &&
    (q === "" || e.name.includes(q) || e.key.includes(q))
  ), [list, q, cat]);

  const save = (next: NotifyEvent) => {
    const cur = db.notifyEvents();
    const updated = cur.map((x) => x.key === next.key ? { ...next, updatedBy: ROLE_META[role].name, updatedAt: new Date().toLocaleString("zh-CN") } : x);
    db.setNotifyEvents(updated); refresh();
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "通知事件", action: "修改", detail: next.name });
    toast.success("已保存");
    setEditing(null);
  };

  const toggleEnabled = (e: NotifyEvent, v: boolean) => {
    const cur = db.notifyEvents();
    const updated = cur.map((x) => x.key === e.key ? { ...x, enabled: v, updatedBy: ROLE_META[role].name, updatedAt: new Date().toLocaleString("zh-CN") } : x);
    db.setNotifyEvents(updated); refresh();
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "通知事件", action: v ? "启用" : "停用", detail: e.name });
  };

  return (
    <div>
      <PageHeader title="通知事件" subtitle="集中管理「事件 → 渠道 → 模板」绑定。业务页（服务审核、操作预警等）只引用事件。" />
      <DevNote prd="通知事件中心" title="使用说明">
        <div>· 业务事件 = 系统在某个时刻需要发通知的场景，由代码内置（key 不可改）</div>
        <div>· 每个事件可同时启用多个渠道，每个渠道绑定一个模板</div>
        <div>· 服务审核命中 → 引用 <code>service.audit.hit</code>；操作预警 → 引用 <code>alert.*</code></div>
      </DevNote>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-8 w-56 pl-7" placeholder="搜索事件名 / key" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={cat} onValueChange={(v) => setCat(v as any)}>
          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">启用</TableHead>
              <TableHead>事件</TableHead>
              <TableHead className="w-24">分类</TableHead>
              <TableHead className="w-32">触发阈值</TableHead>
              <TableHead>接收人</TableHead>
              <TableHead>启用渠道</TableHead>
              <TableHead className="w-40">最近更新</TableHead>
              <TableHead className="w-20">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">无匹配事件</TableCell></TableRow>}
            {visible.map((e) => {
              const enabled = (Object.keys(e.channels) as NotifyChannelKey[]).filter((k) => e.channels[k].enabled);
              const evOn = e.enabled !== false;
              return (
                <TableRow key={e.key} className="cursor-pointer" onClick={() => setEditing(e)}>
                  <TableCell onClick={(ev) => ev.stopPropagation()}>
                    <Switch checked={evOn} onCheckedChange={(v) => toggleEnabled(e, v)} />
                  </TableCell>
                  <TableCell>
                    <div className={`font-medium ${evOn ? "" : "text-muted-foreground"}`}>{e.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground"><code>{e.key}</code> · {e.description}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="font-normal">{e.category}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {e.threshold ? <span><b className="text-foreground">{e.threshold.value}</b> <span className="text-muted-foreground">{e.threshold.unit}</span></span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.recipients.map((r) => ROLE_META[r as Role]?.name || r).join("、") || "—"}</TableCell>
                  <TableCell>
                    {enabled.length === 0 ? <span className="text-xs text-muted-foreground">未启用</span> : (
                      <div className="flex flex-wrap gap-1">
                        {enabled.map((k) => {
                          const Icon = CHANNEL_META[k].icon;
                          return <Badge key={k} variant="secondary" className="font-normal"><Icon className="mr-1 h-3 w-3" />{CHANNEL_META[k].label}</Badge>;
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.updatedBy || "—"}<br />{e.updatedAt || ""}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); setEditing(e); }}>配置</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {editing && <EventEditor event={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function EventEditor({ event, onClose, onSave }: { event: NotifyEvent; onClose: () => void; onSave: (e: NotifyEvent) => void }) {
  const [form, setForm] = useState<NotifyEvent>(event);

  // 加载各渠道模板列表
  const loadTpls = (chKey: NotifyChannelKey) => {
    try { return JSON.parse(localStorage.getItem(CHANNEL_META[chKey].tplKey) || "[]") as { id: string; name: string; key: string }[]; }
    catch { return []; }
  };

  const setChannel = (k: NotifyChannelKey, patch: Partial<{ enabled: boolean; templateId: string }>) =>
    setForm({ ...form, channels: { ...form.channels, [k]: { ...form.channels[k], ...patch } } });

  const toggleRecipient = (r: Role) => {
    const has = form.recipients.includes(r);
    setForm({ ...form, recipients: has ? form.recipients.filter((x) => x !== r) : [...form.recipients, r] });
  };

  const submit = () => {
    const enabledChannels = (Object.keys(form.channels) as NotifyChannelKey[]).filter((k) => form.channels[k].enabled);
    if (enabledChannels.length === 0) return toast.error("至少启用一个渠道");
    if (form.recipients.length === 0) return toast.error("至少选择一个接收人角色");
    for (const k of enabledChannels) {
      if (!form.channels[k].templateId) return toast.error(`【${CHANNEL_META[k].label}】请选择模板`);
    }
    onSave(form);
  };

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{form.name}</SheetTitle>
          <SheetDescription><code className="text-xs">{form.key}</code> · {form.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">启用此事件</div>
              <div className="mt-0.5 text-xs text-muted-foreground">关闭后所有渠道都不会发送通知</div>
            </div>
            <Switch checked={form.enabled !== false} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
          </div>

          {form.category === "操作预警" && (
            <div>
              <Label className="mb-2 block text-sm">触发阈值</Label>
              <div className="flex items-center gap-2">
                <Input type="number" className="w-32" value={form.threshold?.value ?? 0}
                  onChange={(e) => setForm({ ...form, threshold: { value: +e.target.value, unit: form.threshold?.unit || "次/日" } })} />
                <Select value={form.threshold?.unit || "次/日"} onValueChange={(v) => setForm({ ...form, threshold: { value: form.threshold?.value ?? 0, unit: v } })}>
                  <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["次/日", "次/小时", "%", "分钟", "次"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">达到该阈值时触发本事件并按下方渠道发送通知</div>
            </div>
          )}

          <div>
            <Label className="mb-2 block text-sm">接收人角色</Label>
            <div className="flex flex-wrap gap-3">
              {ROLE_LIST.map((r) => (
                <label key={r} className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={form.recipients.includes(r)} onCheckedChange={() => toggleRecipient(r)} />
                  {ROLE_META[r].name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-sm">渠道与模板</Label>
            <div className="space-y-2">
              {(Object.keys(CHANNEL_META) as NotifyChannelKey[]).map((k) => {
                const ch = form.channels[k];
                const meta = CHANNEL_META[k];
                const Icon = meta.icon;
                const tpls = loadTpls(k);
                return (
                  <div key={k} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{meta.label}</span>
                      </div>
                      <Switch checked={ch.enabled} onCheckedChange={(v) => setChannel(k, { enabled: v })} />
                    </div>
                    {ch.enabled && (
                      <div className="mt-2 flex items-center gap-2">
                        <Select value={ch.templateId || ""} onValueChange={(v) => setChannel(k, { templateId: v })}>
                          <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="选择模板…" /></SelectTrigger>
                          <SelectContent>
                            {tpls.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">暂无模板</div>}
                            {tpls.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Link to="/notification/templates" search={{ tab: meta.tplTab }} className="text-xs text-primary hover:underline">管理模板</Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={submit}>保存</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** 业务页用：渲染"已绑定事件"的提示行，点击跳到事件页 */
export function EventBindingHint({ eventKey }: { eventKey: string }) {
  const ev = db.notifyEvent(eventKey);
  if (!ev) return null;
  const enabled = (Object.keys(ev.channels) as NotifyChannelKey[]).filter((k) => ev.channels[k].enabled);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs">
      <span className="text-muted-foreground">命中后按事件</span>
      <Badge variant="outline" className="font-normal">{ev.name}</Badge>
      <span className="text-muted-foreground">发送：</span>
      {enabled.length === 0 ? <span className="text-muted-foreground">未启用任何渠道</span> :
        enabled.map((k) => <Badge key={k} variant="secondary" className="font-normal">{CHANNEL_META[k].label}</Badge>)}
      <Link to="/settings/notification-events" className="ml-auto text-primary hover:underline">配置 →</Link>
    </div>
  );
}