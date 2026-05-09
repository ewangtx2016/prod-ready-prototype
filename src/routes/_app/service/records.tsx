import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { db, type ServiceRecord, type Order } from "@/lib/mock";
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
import { toast } from "sonner";
import { Eye, Download, UserCog, GraduationCap, Link2, Coffee, Image as ImageIcon, Video, Paperclip, FileText, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/service/records")({ component: Page });

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  submitted: { label: "已填写", color: "bg-info text-info-foreground" },
  pending_audit: { label: "待审核", color: "bg-warning text-warning-foreground" },
  approved: { label: "已通过", color: "bg-success text-success-foreground" },
  rejected: { label: "未通过", color: "bg-destructive text-destructive-foreground" },
};

const SERVICE_ROLE_META: Record<"planner" | "tutor", { label: string; icon: typeof UserCog; className: string }> = {
  planner: { label: "规划师", icon: UserCog, className: "bg-primary/10 text-primary border-primary/20" },
  tutor: { label: "学管师", icon: GraduationCap, className: "bg-accent/40 text-accent-foreground border-accent" },
};

function ServantBadge({ name, r, size = "sm" }: { name: string; r: "planner" | "tutor"; size?: "sm" | "md" }) {
  const meta = SERVICE_ROLE_META[r];
  const Icon = meta.icon;
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={size === "md" ? "text-sm font-medium" : "text-sm"}>{name}</span>
      <Badge variant="outline" className={`gap-1 px-1.5 py-0 text-[10px] font-normal ${meta.className}`}>
        <Icon className="h-3 w-3" />{meta.label}
      </Badge>
    </div>
  );
}

function fmtSize(n?: number) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentGallery({ items }: { items: import("@/lib/mock").ServiceAttachment[] }) {
  const [preview, setPreview] = useState<import("@/lib/mock").ServiceAttachment | null>(null);
  const images = items.filter((a) => a.type === "image");
  const videos = items.filter((a) => a.type === "video");
  const files = items.filter((a) => a.type === "file");
  return (
    <>
      {(images.length > 0 || videos.length > 0) && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((a) => (
            <button
              key={a.id}
              onClick={() => setPreview(a)}
              className="group relative aspect-[4/3] overflow-hidden rounded-md border bg-muted"
              title={a.name}
            >
              <img src={a.thumb || a.url} alt={a.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[10px] text-white">{a.name}</div>
            </button>
          ))}
          {videos.map((a) => (
            <button
              key={a.id}
              onClick={() => setPreview(a)}
              className="group relative aspect-[4/3] overflow-hidden rounded-md border bg-muted"
              title={a.name}
            >
              {a.thumb ? (
                <img src={a.thumb} alt={a.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40"><Video className="h-6 w-6 text-muted-foreground" /></div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-black/60 p-2 transition group-hover:bg-black/80"><Play className="h-4 w-4 fill-white text-white" /></div>
              </div>
              <div className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[10px] text-white">{a.name}</div>
            </button>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {files.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{a.name}</span>
                {a.size ? <span className="shrink-0 text-muted-foreground">· {fmtSize(a.size)}</span> : null}
              </div>
              <a href={a.url} download={a.name} onClick={(e) => { if (a.url.startsWith("#")) { e.preventDefault(); toast.info("Mock 附件：实际环境将下载文件"); } }}>
                <Button size="sm" variant="ghost" className="h-7 px-2"><Download className="h-3.5 w-3.5" /></Button>
              </a>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          {preview && (
            <>
              <DialogHeader><DialogTitle className="truncate text-sm font-normal">{preview.name}</DialogTitle></DialogHeader>
              <div className="flex items-center justify-center bg-black/90 rounded-md overflow-hidden">
                {preview.type === "image" ? (
                  <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-auto" />
                ) : (
                  <video src={preview.url} controls className="max-h-[70vh] w-full" />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Page() {
  const { role } = useApp();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [tab, setTab] = useState("all");
  const [viewing, setViewing] = useState<ServiceRecord | null>(null);
  const [fUser, setFUser] = useState("");
  const [fType, setFType] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fSubmitter, setFSubmitter] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fRecordType, setFRecordType] = useState<"all" | "delivery" | "presales">("all");
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => { setRecords(db.services()); setOrders(db.orders()); }, []);
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const typeOptions = Array.from(new Set(records.map((r) => r.serviceType)));
  const filtered = records.filter((r) => {
    if (role === "planner") return r.createdByRole === "planner";
    if (role === "tutor") return r.createdByRole === "tutor";
    return true;
  })
    .filter((r) => tab === "all" ? true : r.status === tab)
    .filter((r) => {
      if (fUser.trim()) {
        const q = fUser.trim().toLowerCase();
        if (!r.userName.toLowerCase().includes(q) && !r.userPhone.includes(q)) return false;
      }
      if (fType !== "all" && r.serviceType !== fType) return false;
      if (fStatus !== "all" && r.status !== fStatus) return false;
      if (fSubmitter.trim() && !r.createdBy.toLowerCase().includes(fSubmitter.trim().toLowerCase())) return false;
      if (fStart && r.createdAt < fStart) return false;
      if (fEnd && r.createdAt > fEnd + " 23:59") return false;
      if (fRecordType !== "all" && (r.recordType ?? "presales") !== fRecordType) return false;
      return true;
    });
  const resetFilters = () => { setFUser(""); setFType("all"); setFStatus("all"); setFSubmitter(""); setFStart(""); setFEnd(""); setFRecordType("all"); };

  return (
    <div>
      <PageHeader
        title="服务记录"
        subtitle="规划师/学管师与用户交互的全程留痕（由外部系统同步，只读）。"
        actions={
          <>
            <PermissionTip action="导出" prd="§14" allow={["org_admin"]}>
              <Button size="sm" variant="outline" disabled={role !== "org_admin"} onClick={() => { db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "服务记录", action: "导出", detail: `导出 ${filtered.length} 条 (脱敏)` }); toast.success("已导出 services.xlsx (mock)"); }}>
                <Download className="h-4 w-4" /> 导出
              </Button>
            </PermissionTip>
          </>
        }
      />

      <DevNote prd="§6.2 §6.5" title="服务列表（只读）">
        <div>· 规划师/学管师不在本系统新增或修改记录，记录由外部系统同步</div>
        <div>· 数据范围：管理员=全量；规划师=本人创建；学管师=本人创建</div>
        <div>· 当前列表条数：{filtered.length} / 全部 {records.length}</div>
      </DevNote>

      <div className="mb-3 grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 md:grid-cols-7">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">记录类型</Label>
          <Select value={fRecordType} onValueChange={(v) => setFRecordType(v as any)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="delivery">交付服务</SelectItem>
              <SelectItem value="presales">日常跟进</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">用户（姓名/手机）</Label>
          <Input value={fUser} onChange={(e) => setFUser(e.target.value)} placeholder="搜索用户" className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">类型</Label>
          <Select value={fType} onValueChange={setFType}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {typeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">状态</Label>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">服务人</Label>
          <Input value={fSubmitter} onChange={(e) => setFSubmitter(e.target.value)} placeholder="搜索服务人" className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">开始日期</Label>
          <Input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">结束日期</Label>
          <div className="flex gap-2">
            <Input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} className="h-8" />
            <Button variant="ghost" size="sm" className="h-8" onClick={resetFilters}>重置</Button>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="submitted">已填写</TabsTrigger>
          <TabsTrigger value="approved">已通过</TabsTrigger>
          <TabsTrigger value="rejected">未通过</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>记录类型</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>内容</TableHead>
                <TableHead>时长</TableHead>
                <TableHead>服务人</TableHead>
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
                  <TableCell>
                    {(r.recordType ?? "presales") === "delivery" ? (
                      <div className="space-y-0.5">
                        <Badge variant="outline" className="gap-1 border-success/40 bg-success/10 text-success"><Link2 className="h-3 w-3" />交付服务</Badge>
                        {r.orderIds && r.orderIds.length > 0 && (
                          <div className="text-[10px] text-muted-foreground font-mono">{r.orderIds.length === 1 ? r.orderIds[0] : `${r.orderIds[0]} 等${r.orderIds.length}单`}</div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground"><Coffee className="h-3 w-3" />日常跟进</Badge>
                    )}
                  </TableCell>
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
                    {r.attachments && r.attachments.length > 0 && (
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        {(() => {
                          const imgs = r.attachments!.filter((a) => a.type === "image").length;
                          const vids = r.attachments!.filter((a) => a.type === "video").length;
                          const files = r.attachments!.filter((a) => a.type === "file").length;
                          return (
                            <>
                              {imgs > 0 && <span className="inline-flex items-center gap-0.5"><ImageIcon className="h-3 w-3" />{imgs}</span>}
                              {vids > 0 && <span className="inline-flex items-center gap-0.5"><Video className="h-3 w-3" />{vids}</span>}
                              {files > 0 && <span className="inline-flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{files}</span>}
                            </>
                          );
                        })()}
                      </div>
                    )}
                    {r.status === "rejected" && r.rejectReason && (
                      <div className="mt-1 text-[11px] text-destructive">驳回：{r.rejectReason}</div>
                    )}
                  </TableCell>
                  <TableCell>{r.duration} 分钟</TableCell>
                  <TableCell><ServantBadge name={r.createdBy} r={r.createdByRole} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.createdAt}</TableCell>
                  <TableCell><Badge className={STATUS_LABEL[r.status].color}>{STATUS_LABEL[r.status].label}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-12">暂无数据</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* 查看 */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {viewing && (
            <>
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-5 border-b">
                <DialogHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary text-base font-semibold">
                        {maskName(viewing.userName, role).slice(0, 1)}
                      </div>
                      <div>
                        <DialogTitle className="text-base">{maskName(viewing.userName, role)}</DialogTitle>
                        <div className="mt-0.5 font-mono text-xs text-muted-foreground">{maskPhone(viewing.userPhone, role)}</div>
                      </div>
                    </div>
                    <Badge className={STATUS_LABEL[viewing.status].color}>{STATUS_LABEL[viewing.status].label}</Badge>
                  </div>
                </DialogHeader>
              </div>

              <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-auto">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground mb-1">服务类型</div>
                    <div className="text-sm font-medium">{viewing.serviceType}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground mb-1">服务时长</div>
                    <div className="text-sm font-medium">{viewing.duration} 分钟</div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground mb-1">提交时间</div>
                    <div className="text-sm font-medium">{viewing.createdAt}</div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-muted-foreground">服务人</div>
                    <ServantBadge name={viewing.createdBy} r={viewing.createdByRole} size="md" />
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">服务内容</div>
                  <div className="rounded-lg border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap">{viewing.content}</div>
                  {viewing.attachments && viewing.attachments.length > 0 && (
                    <div className="mt-3">
                      <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Paperclip className="h-3 w-3" />附件 · 共 {viewing.attachments.length} 项
                      </div>
                      <AttachmentGallery items={viewing.attachments} />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-muted-foreground">关联订单</div>
                    {(viewing.recordType ?? "presales") === "delivery"
                      ? <Badge variant="outline" className="gap-1 border-success/40 bg-success/10 text-success"><Link2 className="h-3 w-3" />交付服务</Badge>
                      : <Badge variant="outline" className="gap-1 text-muted-foreground"><Coffee className="h-3 w-3" />日常跟进</Badge>}
                  </div>
                  {viewing.orderIds && viewing.orderIds.length > 0 ? (
                    <div className="space-y-2">
                      {viewing.orderIds.map((oid) => {
                        const o = orderMap.get(oid);
                        if (!o) return <div key={oid} className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">订单 <span className="font-mono">{oid}</span>（已删除或同步中）</div>;
                        return (
                          <div key={oid} className="rounded-md border bg-card p-3 text-xs flex items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="font-mono text-[11px] text-muted-foreground">{o.id}</div>
                              <div className="text-sm font-medium">{o.course}</div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px]">{o.courseType}</Badge>
                                <Badge variant="outline" className="text-[10px]">{o.source}</Badge>
                                <Badge variant="outline" className="text-[10px]">{o.channel}</Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">¥{o.amount.toLocaleString()}</div>
                              <Badge variant={o.status === "已退费" ? "destructive" : o.status === "退费中" ? "secondary" : "default"} className="mt-1 text-[10px]">{o.status}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">未绑定订单（售前咨询 / 日常沟通类记录）</div>
                  )}
                </div>

                {viewing.pendingChange && (
                  <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
                      <span className="inline-flex h-2 w-2 rounded-full bg-warning animate-pulse" />修改申请待审核
                    </div>
                    <div className="text-xs text-muted-foreground">申请原因：<span className="text-foreground">{viewing.pendingChange.reason}</span></div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-md border bg-background/60 p-3">
                        <div className="text-[11px] text-muted-foreground mb-1">原内容</div>
                        <div className="text-xs line-through text-muted-foreground">{viewing.content}</div>
                      </div>
                      <div className="rounded-md border border-success/40 bg-success/5 p-3">
                        <div className="text-[11px] text-success mb-1">新内容</div>
                        <div className="text-xs">{viewing.pendingChange.newContent}</div>
                      </div>
                    </div>
                  </div>
                )}

                {viewing.rejectReason && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                    <div className="text-xs font-medium text-destructive mb-1">驳回原因</div>
                    <div className="text-sm">{viewing.rejectReason}</div>
                  </div>
                )}
              </div>

              <DialogFooter className="border-t px-6 py-3">
                <Button variant="outline" onClick={() => setViewing(null)}>关闭</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
