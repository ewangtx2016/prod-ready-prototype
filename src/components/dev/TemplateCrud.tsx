import { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { db } from "@/lib/mock";
import { PageHeader } from "./PageHeader";
import { DevNote } from "./DevNote";
import { PermissionTip } from "./PermissionTip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Send, Copy } from "lucide-react";
import { toast } from "sonner";

type Tpl = { id: string; key: string; name: string; content: string; channel: string; auto: boolean; createdAt: string };

const KEY_RE = /^[a-z][a-z0-9_]{2,39}$/;
const autoKey = (name: string) => {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const base = ascii && /^[a-z]/.test(ascii) ? ascii.slice(0, 32) : "tpl_" + Math.random().toString(36).slice(2, 8);
  return base;
};

export function TemplateCrud({ storageKey, channel, sample, prd, title, subtitle, helpers }: { storageKey: string; channel: string; sample: Tpl[]; prd: string; title: string; subtitle: string; helpers: string[] }) {
  const { role } = useApp();
  const [list, setList] = useState<Tpl[]>([]);
  const [editing, setEditing] = useState<Tpl | null>(null);
  const [deleting, setDeleting] = useState<Tpl | null>(null);
  const [testing, setTesting] = useState<Tpl | null>(null);
  const [testTo, setTestTo] = useState("");
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  // 把所有标签统一格式化为 {{中文}}，兼容传入 "用户姓名" / "{{用户姓名}}" / "{userName}" 三种写法
  const tagOf = (h: string) => {
    const m = h.match(/^\{\{?\s*(.+?)\s*\}?\}$/);
    const inner = (m ? m[1] : h).trim();
    return `{{${inner}}}`;
  };
  const tags = helpers.map(tagOf);

  const insertTag = (tag: string) => {
    if (!editing) return;
    const ta = contentRef.current;
    const cur = editing.content || "";
    if (!ta) { setEditing({ ...editing, content: cur + tag }); return; }
    const start = ta.selectionStart ?? cur.length;
    const end = ta.selectionEnd ?? cur.length;
    const next = cur.slice(0, start) + tag + cur.slice(end);
    setEditing({ ...editing, content: next });
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + tag.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) setList(JSON.parse(raw));
    else { localStorage.setItem(storageKey, JSON.stringify(sample)); setList(sample); }
  }, [storageKey]);

  const persist = (v: Tpl[]) => { setList(v); localStorage.setItem(storageKey, JSON.stringify(v)); };

  const save = (t: Tpl) => {
    const exists = list.find(x => x.id === t.id);
    const finalKey = (t.key || autoKey(t.name)).trim();
    if (!KEY_RE.test(finalKey)) { toast.error("Key 需以小写字母开头，仅允许小写字母/数字/下划线，长度 3-40"); return; }
    if (list.some(x => x.id !== t.id && x.key === finalKey)) { toast.error(`Key「${finalKey}」已存在`); return; }
    const next = { ...t, key: finalKey };
    const v = exists ? list.map(x => x.id === t.id ? next : x) : [next, ...list];
    persist(v);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: title, action: exists ? "编辑" : "新增", detail: t.name });
    toast.success(exists ? "已保存" : "已新增");
    setEditing(null);
  };

  const onDelete = () => {
    if (!deleting) return;
    persist(list.filter(x => x.id !== deleting.id));
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: title, action: "删除", detail: deleting.name });
    toast.success("已删除");
    setDeleting(null);
  };

  const sendTest = () => {
    if (!testing) return;
    if (!testTo.trim()) { toast.error("请填写接收方"); return; }
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: title, action: "测试发送", detail: `${testing.name} → ${testTo}` });
    toast.success(`测试${channel}已发送至 ${testTo} (mock)`);
    setTesting(null); setTestTo("");
  };

  const canEdit = role === "org_admin" || role === "super_admin";
  const copyKey = (k: string) => { navigator.clipboard?.writeText(k); toast.success(`已复制 Key：${k}`); };

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} actions={
        <PermissionTip action={`新增${title}`} prd={prd} allow={["org_admin", "super_admin"]}>
          <Button size="sm" disabled={!canEdit} onClick={() => setEditing({ id: "T" + Math.random().toString(36).slice(2, 8), key: "", name: "", content: "", channel, auto: true, createdAt: new Date().toLocaleString("zh-CN") })}><Plus className="h-4 w-4" /> 新增模板</Button>
        </PermissionTip>
      } />
      <DevNote prd={prd} title={title}>
        <div>· 触达通道：{channel}</div>
        <div>· 可用变量：{tags.join(" / ")}（统一采用 <code>{"{{中文}}"}</code> 双大括号格式，发送前由系统替换为真实数据）</div>
        <div>· 模板仅负责<b>文案</b>；是否发送、发送给谁，统一在「系统设置 → 通知事件」中按事件绑定渠道与模板</div>
        <div>· 触达内容/时间/结果均留痕（审核日志）</div>
        <div>· <b>模板 Key</b>：英文短标识（如 <code>renewal_reminder</code>），后端按 Key 调用，<b>创建后不可修改</b>；运营改名/改文案不影响触发。系统内置模板使用 <code>sys_</code> 前缀</div>
      </DevNote>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>模板名称</TableHead><TableHead>模板 Key</TableHead><TableHead>内容预览</TableHead><TableHead>创建时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>
                  <button onClick={() => copyKey(t.key)} className="group inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs hover:bg-muted/70" title="点击复制">
                    <code>{t.key}</code><Copy className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  </button>
                </TableCell>
                <TableCell className="max-w-md truncate text-sm text-muted-foreground">{t.content}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.createdAt}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => setTesting(t)}><Send className="h-3.5 w-3.5" /></Button>
                  <PermissionTip action="编辑" prd={prd} allow={["org_admin", "super_admin"]}><Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => setEditing(t)}><Edit className="h-3.5 w-3.5" /></Button></PermissionTip>
                  <PermissionTip action="删除" prd={prd} allow={["org_admin", "super_admin"]}><Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => setDeleting(t)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></PermissionTip>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">暂无模板</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing && list.find(x => x.id === editing.id) ? "编辑" : "新增"}{title}</DialogTitle><DialogDescription>点击下方变量标签可插入到光标位置，发送时自动替换为真实数据。</DialogDescription></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>模板名称 *</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="如：续报提醒" /></div>
              <div>
                <Label>模板 Key {list.find(x => x.id === editing.id) ? <span className="ml-1 text-xs text-muted-foreground">（创建后不可修改）</span> : <span className="ml-1 text-xs text-muted-foreground">（留空将根据名称自动生成）</span>}</Label>
                <Input value={editing.key} disabled={!!list.find(x => x.id === editing.id)} onChange={(e) => setEditing({ ...editing, key: e.target.value })} placeholder="如：renewal_reminder" className="font-mono" />
                <p className="mt-1 text-xs text-muted-foreground">小写字母开头，仅允许 a-z 0-9 _，长度 3-40，全局唯一。后端按此 Key 调用模板。</p>
              </div>
              <div>
                <Label>模板内容 *</Label>
                <Textarea ref={contentRef} rows={5} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder={`如：${tags[0]} 您好，您的课程将于 ${tags[1] || "{{上课时间}}"} 开始...`} />
                <div className="mt-2">
                  <div className="mb-1 text-xs text-muted-foreground">可插入变量（点击插入到光标处）</div>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <button key={t} type="button" onClick={() => insertTag(t)} className="rounded-md border border-dashed bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground hover:bg-accent hover:border-solid">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>取消</Button><Button onClick={() => editing && (editing.name && editing.content ? save(editing) : toast.error("名称与内容必填"))}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认删除？</AlertDialogTitle><AlertDialogDescription>将删除模板「{deleting?.name}」，删除后无法恢复，已配置自动触发的事件将停止使用该模板。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={onDelete}>确认删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!testing} onOpenChange={(v) => !v && setTesting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>测试发送 — {testing?.name}</DialogTitle><DialogDescription>占位符将不被替换，仅用于校验通道是否可达</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>接收方 *</Label><Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder={channel === "邮件" ? "test@example.com" : channel === "短信" ? "13800138000" : "微信 OpenID"} /></div>
            <div className="rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">{testing?.content}</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTesting(null)}>取消</Button><Button onClick={sendTest}>发送测试</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
