import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { db } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { SmsVerifyDialog } from "@/components/dev/SmsVerifyDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePagination } from "@/components/dev/TablePagination";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert, Database, Download, RotateCw, Trash2, HardDrive, Cloud, Server, Plus, Pencil, CheckCircle2, AlertTriangle, XCircle, Clock, Star, Activity, Copy, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/backup")({ component: Page });

/* -------------------- 类型 & 常量 -------------------- */
type TargetType = "local" | "s3" | "sftp" | "webdav";
type Target = {
  id: string;
  name: string;
  type: TargetType;
  primary: boolean;
  status: "ok" | "warn" | "error";
  usagePct: number; // 容量占用 %
  latencyMs?: number;
  config: Record<string, string>;
  createdAt: string;
};

type Backup = {
  id: string;
  size: string;
  time: string;
  type: "auto" | "manual";
  duration: string; // 耗时
  targets: string[]; // 目标 id 列表
  status: "success" | "failed" | "running";
  progress?: number;
  checksum: string;
  errorLog?: string;
};

type Strategy = {
  enabled: boolean;
  period: "daily" | "weekly" | "monthly";
  time: string; // HH:mm
};

const K_TARGETS = "demo.backup.targets";
const K_BACKUPS = "demo.backup.list";
const K_STRATEGY = "demo.backup.strategy";

const sampleTargets: Target[] = [
  { id: "T1", name: "本地主存储", type: "local", primary: true, status: "ok", usagePct: 42, latencyMs: 8, config: { path: "/var/backups/db" }, createdAt: "2026-01-10 09:00" },
  { id: "T2", name: "阿里云 OSS 异地", type: "s3", primary: false, status: "warn", usagePct: 82, latencyMs: 156, config: { endpoint: "oss-cn-hangzhou.aliyuncs.com", bucket: "edu-backup", region: "cn-hangzhou", prefix: "prod/db/" }, createdAt: "2026-02-03 14:21" },
  { id: "T3", name: "灾备 SFTP", type: "sftp", primary: false, status: "error", usagePct: 0, config: { host: "10.20.30.40", port: "22", user: "backup", path: "/data/db" }, createdAt: "2026-03-12 10:00" },
];

const sampleBackups: Backup[] = [
  { id: "B1", size: "1.28 GB", time: "2026-05-07 02:00", type: "auto", duration: "3m12s", targets: ["T1", "T2"], status: "success", checksum: "a3f1c89e2b…d04f" },
  { id: "B2", size: "1.26 GB", time: "2026-05-06 02:00", type: "auto", duration: "2m58s", targets: ["T1", "T2"], status: "success", checksum: "9c2e7a14f0…b7a1" },
  { id: "B3", size: "—", time: "2026-05-05 02:00", type: "auto", duration: "0m41s", targets: ["T1", "T3"], status: "failed", checksum: "—", errorLog: "ssh: connect to host 10.20.30.40 port 22: Connection timed out\n[backup] target T3 unreachable, marking job FAILED" },
  { id: "B4", size: "1.20 GB", time: "2026-04-28 18:30", type: "manual", duration: "3m05s", targets: ["T1"], status: "success", checksum: "117b8f30a2…ee29" },
];

const defaultStrategy: Strategy = { enabled: true, period: "daily", time: "02:00" };

const TYPE_META: Record<TargetType, { label: string; icon: typeof HardDrive }> = {
  local: { label: "本地磁盘", icon: HardDrive },
  s3: { label: "对象存储 (S3/OSS/COS)", icon: Cloud },
  sftp: { label: "SFTP / FTP", icon: Server },
  webdav: { label: "WebDAV", icon: Server },
};

const STATUS_META: Record<Target["status"], { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: "可用", cls: "text-success", Icon: CheckCircle2 },
  warn: { label: "容量告警", cls: "text-warning", Icon: AlertTriangle },
  error: { label: "不可达", cls: "text-destructive", Icon: XCircle },
};

function useLS<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(fallback);
  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw) { try { setV(JSON.parse(raw)); } catch { setV(fallback); } }
    else { localStorage.setItem(key, JSON.stringify(fallback)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = (nv: T) => { setV(nv); localStorage.setItem(key, JSON.stringify(nv)); };
  return [v, set];
}

/* -------------------- 主页面 -------------------- */
function Page() {
  const { role } = useApp();
  const canEdit = role === "org_admin";
  const [targets, setTargets] = useLS<Target[]>(K_TARGETS, sampleTargets);
  const [list, setList] = useLS<Backup[]>(K_BACKUPS, sampleBackups);
  const [strategy, setStrategy] = useLS<Strategy>(K_STRATEGY, defaultStrategy);

  const [smsScene, setSmsScene] = useState<{ b?: Backup; t?: Target; type: "delete-backup" | "restore" | "delete-target" } | null>(null);
  const [editTarget, setEditTarget] = useState<Target | null>(null);
  const [showAddTarget, setShowAddTarget] = useState(false);
  const [logBackup, setLogBackup] = useState<Backup | null>(null);

  const stats = useMemo(() => {
    const success = list.filter(b => b.status === "success");
    const failRate = list.length ? Math.round((list.filter(b => b.status === "failed").length / list.length) * 100) : 0;
    return {
      total: list.length,
      successCount: success.length,
      failRate,
      lastSuccess: success[0]?.time || "-",
      space: "5.74 GB",
    };
  }, [list]);

  const nextRun = useMemo(() => {
    if (!strategy.enabled) return "未启用";
    return `明日 ${strategy.time}`;
  }, [strategy]);

  /* -------- 操作 -------- */
  const onSmsSuccess = () => {
    if (!smsScene) return;
    if (smsScene.type === "delete-backup" && smsScene.b) {
      setList(list.filter(x => x.id !== smsScene.b!.id));
      toast.success("已删除备份");
    } else if (smsScene.type === "restore" && smsScene.b) {
      toast.success("已开始恢复，约需 5 分钟");
    } else if (smsScene.type === "delete-target" && smsScene.t) {
      if (smsScene.t.primary) { toast.error("请先指定其它目标为主目标"); setSmsScene(null); return; }
      setTargets(targets.filter(x => x.id !== smsScene.t!.id));
      toast.success("已删除备份目标");
    }
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "备份", action: smsScene.type, detail: smsScene.b?.id || smsScene.t?.id || "" });
    setSmsScene(null);
  };

  const doBackupNow = () => {
    const primaryIds = targets.filter(t => t.primary || t.status === "ok").map(t => t.id);
    if (!primaryIds.length) { toast.error("请先配置至少一个可用的备份目标"); return; }
    const b: Backup = {
      id: "B" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      size: (Math.random() * 0.5 + 1).toFixed(2) + " GB",
      time: new Date().toLocaleString("zh-CN"),
      type: "manual",
      duration: Math.floor(Math.random() * 3 + 2) + "m" + Math.floor(Math.random() * 50) + "s",
      targets: primaryIds,
      status: "success",
      checksum: Math.random().toString(16).slice(2, 12) + "…" + Math.random().toString(16).slice(2, 6),
    };
    setList([b, ...list]);
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "备份", action: "立即备份", detail: b.id });
    toast.success("备份已创建并写入 " + primaryIds.length + " 个目标");
  };

  const setPrimary = (id: string) => {
    setTargets(targets.map(t => ({ ...t, primary: t.id === id })));
    toast.success("已设为主目标");
  };

  const testConn = (t: Target) => {
    toast.loading("正在测试连接…", { id: "test-" + t.id });
    setTimeout(() => {
      const ok = t.status !== "error";
      const latency = Math.floor(Math.random() * 200 + 10);
      if (ok) {
        setTargets(targets.map(x => x.id === t.id ? { ...x, latencyMs: latency, status: x.usagePct > 80 ? "warn" : "ok" } : x));
        toast.success(`连接成功 · ${latency}ms`, { id: "test-" + t.id });
      } else {
        toast.error("连接失败：Connection timed out", { id: "test-" + t.id });
      }
    }, 800);
  };

  const saveTarget = (t: Target) => {
    const exists = targets.find(x => x.id === t.id);
    if (exists) setTargets(targets.map(x => x.id === t.id ? t : x));
    else setTargets([...targets, { ...t, id: "T" + (targets.length + 1) }]);
    setEditTarget(null);
    setShowAddTarget(false);
    toast.success("已保存目标配置");
  };

  return (
    <div>
      <PageHeader title="数据备份" subtitle="全量数据库备份 · 多目标双写 · 删除/恢复需短信验证" actions={
        <PermissionTip action="立即备份" prd="§11.2" allow={["org_admin"]}>
          <Button size="sm" disabled={!canEdit} onClick={doBackupNow}><Database className="h-4 w-4" /> 立即备份</Button>
        </PermissionTip>
      } />
      <DevNote prd="§11.2" title="数据备份">
        <div>· 备份内容：<b>全量数据库</b>（含表结构、数据、索引），不分模块</div>
        <div>· 备份目标：支持本地磁盘 / 对象存储 / SFTP / WebDAV，可配多个目标双写</div>
        <div>· 自动备份：默认每日 02:00</div>
        <div>· <b>删除/恢复 / 删除主目标</b> 需机构管理员短信验证</div>
      </DevNote>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Database className="h-3.5 w-3.5" />备份总数</div>
          <div className="text-2xl font-semibold mt-1">{stats.total}</div>
          <div className="text-xs text-muted-foreground mt-1">成功 {stats.successCount} · 失败率 {stats.failRate}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><HardDrive className="h-3.5 w-3.5" />占用空间</div>
          <div className="text-2xl font-semibold mt-1">{stats.space}</div>
          <div className="text-xs text-muted-foreground mt-1">{targets.length} 个目标</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />最近成功</div>
          <div className="text-base font-semibold mt-2">{stats.lastSuccess}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" />下次执行</div>
          <div className="text-base font-semibold mt-2 text-primary">{nextRun}</div>
        </Card>
      </div>

      <Tabs defaultValue="strategy" className="mb-4">
        <TabsList>
          <TabsTrigger value="strategy">备份策略</TabsTrigger>
          <TabsTrigger value="targets">备份目标 <Badge variant="secondary" className="ml-1">{targets.length}</Badge></TabsTrigger>
        </TabsList>

        {/* Tab1：策略 */}
        <TabsContent value="strategy">
          <Card className="p-4 grid md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="md:col-span-2 flex items-center justify-between border-b pb-3">
              <div>
                <div className="font-medium">启用自动备份</div>
                <div className="text-xs text-muted-foreground mt-1">关闭后仅支持手动备份</div>
              </div>
              <Switch checked={strategy.enabled} disabled={!canEdit} onCheckedChange={v => setStrategy({ ...strategy, enabled: v })} />
            </div>
            <div>
              <Label>备份周期</Label>
              <Select value={strategy.period} onValueChange={v => setStrategy({ ...strategy, period: v as Strategy["period"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">每日</SelectItem>
                  <SelectItem value="weekly">每周（周日）</SelectItem>
                  <SelectItem value="monthly">每月（1 号）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>执行时间</Label>
              <Input type="time" value={strategy.time} disabled={!canEdit} onChange={e => setStrategy({ ...strategy, time: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button size="sm" disabled={!canEdit} onClick={() => { db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "备份", action: "更新策略", detail: `${strategy.period}/${strategy.time}` }); toast.success("策略已保存"); }}>保存策略</Button>
            </div>
          </Card>
        </TabsContent>

        {/* Tab2：目标 */}
        <TabsContent value="targets">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-muted-foreground">支持配置多个目标实现 <b className="text-foreground">双写灾备</b>。主目标用于「下载/恢复」时的默认源。</div>
            <PermissionTip action="新增目标" prd="§11.2" allow={["org_admin"]}>
              <Button size="sm" disabled={!canEdit} onClick={() => setShowAddTarget(true)}><Plus className="h-4 w-4" /> 新增目标</Button>
            </PermissionTip>
          </div>
          {targets.length === 0 ? (
            <Card className="p-12 text-center">
              <Cloud className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <div className="font-medium">尚未配置任何备份目标</div>
              <div className="text-sm text-muted-foreground mt-1 mb-4">备份将无处可写，请先添加</div>
              <Button onClick={() => setShowAddTarget(true)}><Plus className="h-4 w-4" /> 添加第一个备份目标</Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {targets.map(t => <TargetCard key={t.id} t={t} canEdit={canEdit} onTest={() => testConn(t)} onPrimary={() => setPrimary(t.id)} onEdit={() => setEditTarget(t)} onDelete={() => setSmsScene({ t, type: "delete-target" })} />)}
            </div>
          )}
        </TabsContent>

      </Tabs>

      {/* 备份记录 */}
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium flex items-center gap-2"><Activity className="h-4 w-4" />备份记录</div>
        <div className="text-xs text-muted-foreground">共 {list.length} 条 · 失败率 {stats.failRate}%</div>
      </div>
      <Alert className="mb-3 border-warning/40 bg-warning/10">
        <ShieldAlert className="h-4 w-4 text-warning" />
        <AlertDescription>恢复操作将覆盖当前数据库，请确认在低峰时段执行，并提前知会业务方。</AlertDescription>
      </Alert>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>备份编号</TableHead>
              <TableHead>大小</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>目标位置</TableHead>
              <TableHead>耗时</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>校验码</TableHead>
              <TableHead>备份时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map(b => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.id}</TableCell>
                <TableCell>{b.size}</TableCell>
                <TableCell><Badge variant={b.type === "auto" ? "secondary" : "outline"}>{b.type === "auto" ? "自动" : "手动"}</Badge></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {b.targets.map(tid => {
                      const t = targets.find(x => x.id === tid);
                      return <Badge key={tid} variant="outline" className="text-xs">{t?.name || tid}</Badge>;
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{b.duration}</TableCell>
                <TableCell>
                  {b.status === "success" && <Badge className="bg-success/15 text-success hover:bg-success/15"><CheckCircle2 className="h-3 w-3 mr-1" />成功</Badge>}
                  {b.status === "failed" && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />失败</Badge>}
                  {b.status === "running" && <div className="w-24"><Progress value={b.progress || 50} className="h-2" /></div>}
                </TableCell>
                <TableCell>
                  {b.checksum === "—" ? <span className="text-muted-foreground">—</span> : (
                    <button className="font-mono text-xs hover:text-primary inline-flex items-center gap-1" onClick={() => { navigator.clipboard.writeText(b.checksum); toast.success("已复制校验码"); }}>
                      {b.checksum}<Copy className="h-3 w-3" />
                    </button>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{b.time}</TableCell>
                <TableCell className="text-right space-x-1 whitespace-nowrap">
                  {b.status === "failed" && <Button size="sm" variant="ghost" onClick={() => setLogBackup(b)}><FileText className="h-3.5 w-3.5" /> 日志</Button>}
                  {b.status === "success" && <>
                    <Button size="sm" variant="ghost" onClick={() => toast.success(`下载 ${b.id} (mock)`)}><Download className="h-3.5 w-3.5" /></Button>
                    <PermissionTip action="恢复备份" prd="§11.2" allow={["org_admin"]}>
                      <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => setSmsScene({ b, type: "restore" })}><RotateCw className="h-3.5 w-3.5" /> 恢复</Button>
                    </PermissionTip>
                  </>}
                  <PermissionTip action="删除备份" prd="§11.2" allow={["org_admin"]}>
                    <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => setSmsScene({ b, type: "delete-backup" })}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </PermissionTip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* 弹窗们 */}
      <SmsVerifyDialog open={!!smsScene} onOpenChange={v => !v && setSmsScene(null)} title="机构管理员短信验证"
        scene={smsScene ? (smsScene.type === "delete-backup" ? `删除备份 ${smsScene.b?.id}` : smsScene.type === "restore" ? `恢复备份 ${smsScene.b?.id}` : `删除目标 ${smsScene.t?.name}`) : ""}
        onSuccess={onSmsSuccess} />

      <TargetFormDialog open={showAddTarget || !!editTarget} initial={editTarget} onClose={() => { setShowAddTarget(false); setEditTarget(null); }} onSave={saveTarget} />

      <Sheet open={!!logBackup} onOpenChange={v => !v && setLogBackup(null)}>
        <SheetContent className="w-[640px] sm:max-w-[640px]">
          <SheetHeader><SheetTitle>失败日志 · {logBackup?.id}</SheetTitle></SheetHeader>
          <pre className="mt-4 text-xs bg-muted p-3 rounded-md whitespace-pre-wrap font-mono">{logBackup?.errorLog || "（无日志）"}</pre>
          <div className="mt-3 text-xs text-muted-foreground">建议：检查 SFTP 目标网络连通性，或暂时移除该目标后重试。</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* -------------------- 目标卡片 -------------------- */
function TargetCard({ t, canEdit, onTest, onPrimary, onEdit, onDelete }: { t: Target; canEdit: boolean; onTest: () => void; onPrimary: () => void; onEdit: () => void; onDelete: () => void }) {
  const meta = TYPE_META[t.type];
  const status = STATUS_META[t.status];
  const Icon = meta.icon;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-muted"><Icon className="h-5 w-5" /></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{t.name}</span>
              {t.primary && <Badge className="bg-primary/15 text-primary hover:bg-primary/15"><Star className="h-3 w-3 mr-1" />主目标</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{meta.label}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs ${status.cls}`}>
          <status.Icon className="h-3.5 w-3.5" />{status.label}
          {t.latencyMs !== undefined && t.status !== "error" && <span className="text-muted-foreground ml-1">· {t.latencyMs}ms</span>}
        </div>
      </div>

      <div className="mt-3 text-xs space-y-1 text-muted-foreground font-mono bg-muted/40 rounded p-2">
        {Object.entries(t.config).map(([k, v]) => (
          <div key={k} className="truncate"><span className="text-foreground/70">{k}:</span> {k.toLowerCase().includes("secret") || k.toLowerCase().includes("password") ? "••••••••" : v}</div>
        ))}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">容量占用</span>
          <span className={t.usagePct > 80 ? "text-warning" : "text-muted-foreground"}>{t.usagePct}%</span>
        </div>
        <Progress value={t.usagePct} className="h-1.5" />
      </div>

      <div className="mt-3 flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={onTest}><Activity className="h-3.5 w-3.5" /> 测试</Button>
        {!t.primary && <Button size="sm" variant="ghost" disabled={!canEdit} onClick={onPrimary}><Star className="h-3.5 w-3.5" /> 设为主</Button>}
        <Button size="sm" variant="ghost" disabled={!canEdit} onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" disabled={!canEdit} onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
      </div>
    </Card>
  );
}

/* -------------------- 目标新增/编辑对话框 -------------------- */
function TargetFormDialog({ open, initial, onClose, onSave }: { open: boolean; initial: Target | null; onClose: () => void; onSave: (t: Target) => void }) {
  const [type, setType] = useState<TargetType>("local");
  const [name, setName] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initial) { setType(initial.type); setName(initial.name); setConfig(initial.config); }
    else { setType("local"); setName(""); setConfig({ path: "/var/backups/db" }); }
  }, [initial, open]);

  const onTypeChange = (v: TargetType) => {
    setType(v);
    setConfig(v === "local" ? { path: "/var/backups/db" }
      : v === "s3" ? { endpoint: "", bucket: "", region: "", accessKey: "", secretKey: "", prefix: "" }
      : v === "sftp" ? { host: "", port: "22", user: "", password: "", path: "" }
      : { url: "", user: "", password: "" });
  };

  const fields = useMemo(() => {
    switch (type) {
      case "local": return [["path", "存储路径", "/var/backups/db"]];
      case "s3": return [
        ["endpoint", "Endpoint", "oss-cn-hangzhou.aliyuncs.com"],
        ["bucket", "Bucket 名称", "edu-backup"],
        ["region", "Region", "cn-hangzhou"],
        ["prefix", "路径前缀", "prod/db/"],
        ["accessKey", "Access Key", ""],
        ["secretKey", "Secret Key", ""],
      ];
      case "sftp": return [
        ["host", "主机地址", "10.20.30.40"],
        ["port", "端口", "22"],
        ["user", "用户名", "backup"],
        ["password", "密码 / 密钥", ""],
        ["path", "远程路径", "/data/db"],
      ];
      case "webdav": return [
        ["url", "WebDAV URL", "https://dav.example.com/backup"],
        ["user", "用户名", ""],
        ["password", "密码", ""],
      ];
    }
  }, [type]) as [string, string, string][];

  const submit = () => {
    if (!name.trim()) { toast.error("请填写目标名称"); return; }
    const required = fields.filter(([k]) => !["prefix"].includes(k));
    for (const [k, label] of required) if (!config[k]) { toast.error(`请填写「${label}」`); return; }
    onSave({
      id: initial?.id || "",
      name,
      type,
      primary: initial?.primary || false,
      status: "ok",
      usagePct: initial?.usagePct ?? 0,
      config,
      createdAt: initial?.createdAt || new Date().toLocaleString("zh-CN"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "编辑备份目标" : "新增备份目标"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>目标名称</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="例如：本地主存储 / 阿里云 OSS 异地" />
          </div>
          <div>
            <Label>类型</Label>
            <Select value={type} onValueChange={v => onTypeChange(v as TargetType)} disabled={!!initial}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_META) as TargetType[]).map(k => <SelectItem key={k} value={k}>{TYPE_META[k].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fields.map(([k, label, ph]) => (
              <div key={k} className={k === "path" || k === "url" || k === "endpoint" ? "col-span-2" : ""}>
                <Label>{label}</Label>
                <Input
                  type={k.toLowerCase().includes("secret") || k.toLowerCase().includes("password") ? "password" : "text"}
                  placeholder={ph}
                  value={config[k] || ""}
                  onChange={e => setConfig({ ...config, [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="outline" onClick={() => toast.success("连接测试成功 · 86ms (mock)")}><Activity className="h-4 w-4" /> 测试连接</Button>
          <Button onClick={submit}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}