import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { db, type ServiceRecord } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { maskName, maskPhone } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, Download, UserCog, GraduationCap, Link2, Coffee, Image as ImageIcon, Video, Paperclip, FileText, Play, User as UserIcon, Cake, IdCard, School, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePagination } from "@/components/dev/TablePagination";
import { SearchSelect } from "@/components/dev/SearchSelect";

export const Route = createFileRoute("/_app/service/records")({ component: Page });

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

/** 基于姓名/手机的确定性 mock 学生档案 */
function studentProfile(name: string, phone: string) {
  let h = 0;
  for (const c of name + phone) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const genders = ["男", "女"] as const;
  const schools = ["市第一中学", "实验中学", "外国语学校", "育才中学", "新华中学", "明德中学"];
  const grades = ["小学六年级", "初一", "初二", "初三", "高一", "高二", "高三"];
  const gender = genders[h % 2];
  const grade = grades[h % grades.length];
  // 根据年级估算年龄
  const baseAge = [12, 13, 14, 15, 16, 17, 18][grades.indexOf(grade)] ?? 15;
  const age = baseAge;
  const year = 2026 - age;
  const month = ((h >> 3) % 12) + 1;
  const day = ((h >> 5) % 27) + 1;
  const birth = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const studentId = "S" + String(100000 + (h % 899999)).padStart(6, "0");
  const school = schools[h % schools.length];
  return { gender, age, birth, studentId, school, grade };
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
  const [viewing, setViewing] = useState<ServiceRecord | null>(null);
  const [fUser, setFUser] = useState("");
  const [fSubmitter, setFSubmitter] = useState("");
  const [fOrgName, setFOrgName] = useState("all");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fRecordType, setFRecordType] = useState<"all" | "delivery" | "presales">("all");
  const [fServantRole, setFServantRole] = useState<"all" | "planner" | "tutor">("all");

  useEffect(() => { setRecords(db.services()); }, []);
  const isServantView = role === "planner" || role === "tutor";
  const currentServantName = role === "planner" ? "李规划" : role === "tutor" ? "陈学管" : "";
  const scopedRecords = useMemo(() => {
    if (!isServantView) return records;
    return records.filter((r) => r.createdByRole === role && r.createdBy === currentServantName);
  }, [records, isServantView, role, currentServantName]);
  const orgOptions = useMemo(() => Array.from(new Set(scopedRecords.map((r) => r.orgName ?? "").filter(Boolean))), [scopedRecords]);
  const filtered = scopedRecords.filter((r) => {
      if (fUser.trim()) {
        const q = fUser.trim().toLowerCase();
        if (!r.userName.toLowerCase().includes(q) && !r.userPhone.includes(q)) return false;
      }
      if (!isServantView && fSubmitter.trim() && !r.createdBy.toLowerCase().includes(fSubmitter.trim().toLowerCase())) return false;
      if (fOrgName !== "all" && (r.orgName ?? "") !== fOrgName) return false;
      if (!isServantView && fServantRole !== "all" && r.createdByRole !== fServantRole) return false;
      if (fStart && r.createdAt < fStart) return false;
      if (fEnd && r.createdAt > fEnd + " 23:59") return false;
      if (fRecordType !== "all" && (r.recordType ?? "presales") !== fRecordType) return false;
      return true;
    });
  const { paged, Pagination } = usePagination(filtered, 10);
  const resetFilters = () => { setFUser(""); setFSubmitter(""); setFOrgName("all"); setFServantRole("all"); setFStart(""); setFEnd(""); setFRecordType("all"); };

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
        <div>· 数据范围：{isServantView ? "本人名下记录" : "全部记录"}</div>
        <div>· 当前列表条数：{filtered.length} / 可见 {scopedRecords.length}</div>
      </DevNote>

      {/* 统计卡片 */}
      {(() => {
        const uniqueUsers = new Set(filtered.map((r) => r.userPhone)).size;
        const plannerUsers = new Set(filtered.filter((r) => r.createdByRole === "planner").map((r) => r.userPhone)).size;
        const tutorUsers = new Set(filtered.filter((r) => r.createdByRole === "tutor").map((r) => r.userPhone)).size;
        if (isServantView) {
          return (
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">服务用户总数</div>
                <div className="mt-1 text-2xl font-semibold">{uniqueUsers}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">服务记录总数</div>
                <div className="mt-1 text-2xl font-semibold">{filtered.length}</div>
              </Card>
            </div>
          );
        }
        return (
          <>
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">覆盖用户总数</div>
                <div className="mt-1 text-2xl font-semibold">{uniqueUsers}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">服务记录总数</div>
                <div className="mt-1 text-2xl font-semibold">{filtered.length}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">规划师覆盖用户</div>
                <div className="mt-1 text-2xl font-semibold">{plannerUsers}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">学管师覆盖用户</div>
                <div className="mt-1 text-2xl font-semibold">{tutorUsers}</div>
              </Card>
            </div>
          </>
        );
      })()}

      <div className={`mb-3 grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 ${isServantView ? "md:grid-cols-5" : "md:grid-cols-7"}`}>
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
          <Label className="text-xs text-muted-foreground">机构名称</Label>
          <SearchSelect
            value={fOrgName}
            onChange={setFOrgName}
            options={["all", ...orgOptions]}
            labels={{ all: "全部机构" }}
            placeholder="搜索机构名称"
          />
        </div>
        {!isServantView && (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">服务人类型</Label>
              <Select value={fServantRole} onValueChange={(v) => setFServantRole(v as any)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="planner">规划师</SelectItem>
                  <SelectItem value="tutor">学管师</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">服务人姓名</Label>
              <Input value={fSubmitter} onChange={(e) => setFSubmitter(e.target.value)} placeholder="搜索服务人姓名" className="h-8" />
            </div>
          </>
        )}
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

      <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>记录类型</TableHead>
                <TableHead>内容</TableHead>
                <TableHead>机构名称</TableHead>
                <TableHead>服务人</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((r) => (
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
                  <TableCell className="max-w-xs text-xs">
                    <div className="truncate">{r.content}</div>
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
                  </TableCell>
                  <TableCell>{r.orgName || "-"}</TableCell>
                  <TableCell><ServantBadge name={r.createdBy} r={r.createdByRole} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.createdAt}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">暂无数据</TableCell></TableRow>}
            </TableBody>
          </Table>
          <Pagination />
      </div>

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
                        <DialogTitle className="text-base flex items-center gap-2">
                          {maskName(viewing.userName, role)}
                          {(() => {
                            const p = studentProfile(viewing.userName, viewing.userPhone);
                            return (
                              <>
                                <Badge variant="outline" className="gap-1 text-[10px] font-normal"><UserIcon className="h-3 w-3" />{p.gender}</Badge>
                                <Badge variant="outline" className="text-[10px] font-normal">{p.age} 岁</Badge>
                              </>
                            );
                          })()}
                        </DialogTitle>
                        <div className="mt-0.5 font-mono text-xs text-muted-foreground">{maskPhone(viewing.userPhone, role)}</div>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const p = studentProfile(viewing.userName, viewing.userPhone);
                    const items: { icon: typeof IdCard; label: string; value: string }[] = [
                      { icon: IdCard, label: "学员编号", value: p.studentId },
                      { icon: Cake, label: "出生年月", value: p.birth },
                      { icon: School, label: "学校", value: p.school },
                      { icon: BookOpen, label: "年级", value: p.grade },
                    ];
                    return (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-2">
                        {items.map((it) => {
                          const Icon = it.icon;
                          return (
                            <div key={it.label} className="rounded-md border bg-background/60 px-3 py-2">
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="h-3 w-3" />{it.label}</div>
                              <div className="mt-0.5 text-sm font-medium truncate">{it.value}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </DialogHeader>
              </div>

              <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground mb-1">记录类型</div>
                    <div className="text-sm font-medium">{(viewing.recordType ?? "presales") === "delivery" ? "交付服务" : "日常跟进"}</div>
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
