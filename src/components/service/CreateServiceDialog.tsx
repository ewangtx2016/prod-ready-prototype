import { useMemo, useRef, useState } from "react";
import { db, type ServiceRecord, type ServiceAttachment, type Order } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { maskPhone } from "@/lib/mask";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown, Check, Plus, Upload, X, Image as ImageIcon, Video, FileText, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Customer = { name: string; phone: string };

const SERVICE_TYPES = ["沟通", "督学", "答疑", "打卡", "社群"];

function rid() { return Math.random().toString(36).slice(2, 10); }
function fmtSize(n?: number) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** 当前登录人姓名（mock：按角色返回示例账号） */
function currentUserName(role: "planner" | "tutor") {
  return role === "planner" ? "李规划" : "陈学管";
}

export function CreateServiceDialog({ onCreated }: { onCreated?: () => void }) {
  const { role } = useApp();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 仅规划师/学管师可使用
  if (role !== "planner" && role !== "tutor") return null;
  const myName = currentUserName(role);

  // 构造「我负责的用户」候选：
  // 规划师 → orders.plannerName === myName 的用户；
  // 学管师 → 我已创建过服务记录的用户；
  // 兜底加入所有 orders 中出现过的用户（mock 演示宽松）。
  const customers: Customer[] = useMemo(() => {
    if (!open) return [];
    const orders = db.orders();
    const services = db.services();
    const map = new Map<string, Customer>();
    const add = (c: Customer) => { if (c.phone && !map.has(c.phone)) map.set(c.phone, c); };
    if (role === "planner") {
      orders.filter((o: Order) => o.plannerName === myName).forEach((o) => add({ name: o.userName, phone: o.userPhone }));
    } else {
      services.filter((s) => s.createdBy === myName).forEach((s) => add({ name: s.userName, phone: s.userPhone }));
    }
    // 演示宽松：再补充 orders 中其他用户
    orders.forEach((o) => add({ name: o.userName, phone: o.userPhone }));
    return Array.from(map.values());
  }, [open, role, myName]);

  // 表单状态
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [recordType, setRecordType] = useState<"presales" | "delivery">("presales");
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [serviceType, setServiceType] = useState<string>("沟通");
  const [content, setContent] = useState("");
  const [duration, setDuration] = useState<string>("15");
  const [attachments, setAttachments] = useState<ServiceAttachment[]>([]);

  // 选定用户的可绑定订单
  const userOrders = useMemo(() => {
    if (!customer) return [];
    return db.orders().filter((o) => o.userPhone === customer.phone);
  }, [customer]);

  const reset = () => {
    setCustomer(null); setRecordType("presales"); setOrderIds([]);
    setServiceType("沟通"); setContent(""); setDuration("15");
    attachments.forEach((a) => { try { if (a.url.startsWith("blob:")) URL.revokeObjectURL(a.url); } catch {} });
    setAttachments([]);
  };

  const onPickFiles = (files: FileList | null) => {
    if (!files) return;
    const next: ServiceAttachment[] = [];
    Array.from(files).forEach((f) => {
      const type: ServiceAttachment["type"] = f.type.startsWith("image/")
        ? "image"
        : f.type.startsWith("video/")
        ? "video"
        : "file";
      const url = URL.createObjectURL(f);
      next.push({ id: rid(), type, name: f.name, url, size: f.size, thumb: type === "image" ? url : undefined });
    });
    setAttachments((prev) => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const t = prev.find((a) => a.id === id);
      if (t && t.url.startsWith("blob:")) { try { URL.revokeObjectURL(t.url); } catch {} }
      return prev.filter((a) => a.id !== id);
    });
  };

  const submit = () => {
    if (!customer) { toast.error("请选择用户"); return; }
    if (!content.trim()) { toast.error("请填写服务内容"); return; }
    const dur = Number(duration);
    if (!dur || dur <= 0) { toast.error("请填写有效时长（分钟）"); return; }
    if (recordType === "delivery" && orderIds.length === 0) { toast.error("交付服务需至少绑定一个订单"); return; }

    const rec: ServiceRecord = {
      id: rid(),
      userName: customer.name,
      userPhone: customer.phone,
      serviceType,
      content: content.trim(),
      duration: dur,
      createdBy: myName,
      createdByRole: role,
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-"),
      status: "submitted",
      recordType,
      orderIds: recordType === "delivery" ? orderIds : [],
      attachments,
    };
    db.addService(rec);
    db.log({ operator: myName, role: ROLE_META[role].name, module: "服务记录", action: "新增", detail: `用户 ${customer.name} · ${serviceType} · ${dur}min`, after: { id: rec.id, recordType, orderIds: rec.orderIds, attachments: attachments.length } });
    toast.success("服务记录已创建");
    reset();
    setOpen(false);
    onCreated?.();
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> 新增服务记录
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增服务记录</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* 用户姓名（搜索下拉） */}
              <div className="space-y-1.5">
                <Label className="text-xs">用户姓名 <span className="text-destructive">*</span></Label>
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="h-9 w-full justify-between font-normal">
                      {customer ? (
                        <span className="truncate">{customer.name}</span>
                      ) : (
                        <span className="text-muted-foreground">选择用户（支持姓名搜索）</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="输入姓名搜索…" />
                      <CommandList>
                        <CommandEmpty>未找到用户</CommandEmpty>
                        <CommandGroup>
                          {customers.map((c) => (
                            <CommandItem
                              key={c.phone}
                              value={c.name + " " + c.phone}
                              onSelect={() => { setCustomer(c); setOrderIds([]); setPickerOpen(false); }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", customer?.phone === c.phone ? "opacity-100" : "opacity-0")} />
                              <span className="flex-1 truncate">{c.name}</span>
                              <span className="ml-3 font-mono text-xs text-muted-foreground">{maskPhone(c.phone, role)}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 手机号（只读） */}
              <div className="space-y-1.5">
                <Label className="text-xs">手机号</Label>
                <Input value={customer ? maskPhone(customer.phone, role) : ""} readOnly placeholder="选择用户后自动带入" className="h-9 font-mono" />
              </div>

              {/* 记录类型 */}
              <div className="space-y-1.5">
                <Label className="text-xs">记录类型 <span className="text-destructive">*</span></Label>
                <Select value={recordType} onValueChange={(v) => { setRecordType(v as any); setOrderIds([]); }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presales">日常跟进（不绑定订单）</SelectItem>
                    <SelectItem value="delivery">交付服务（绑定订单）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 服务类型 */}
              <div className="space-y-1.5">
                <Label className="text-xs">类型 <span className="text-destructive">*</span></Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* 时长 */}
              <div className="space-y-1.5">
                <Label className="text-xs">时长（分钟） <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className="h-9" />
              </div>
            </div>

            {/* 关联订单（仅交付服务） */}
            {recordType === "delivery" && (
              <div className="space-y-1.5">
                <Label className="text-xs">关联订单 <span className="text-destructive">*</span></Label>
                {!customer ? (
                  <div className="rounded-md border border-dashed bg-muted/20 p-3 text-center text-xs text-muted-foreground">请先选择用户</div>
                ) : userOrders.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-muted/20 p-3 text-center text-xs text-muted-foreground">该用户暂无订单</div>
                ) : (
                  <div className="space-y-1.5">
                    {userOrders.map((o) => {
                      const checked = orderIds.includes(o.id);
                      return (
                        <label key={o.id} className={cn("flex items-center justify-between gap-3 rounded-md border bg-card p-2.5 cursor-pointer text-xs", checked && "border-primary bg-primary/5")}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary"
                              checked={checked}
                              onChange={(e) => setOrderIds((p) => e.target.checked ? [...p, o.id] : p.filter((x) => x !== o.id))}
                            />
                            <div className="min-w-0">
                              <div className="font-mono text-[10px] text-muted-foreground">{o.id}</div>
                              <div className="font-medium truncate">{o.course}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold">¥{o.amount.toLocaleString()}</div>
                            <Badge variant="outline" className="mt-0.5 text-[10px]">{o.status}</Badge>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 内容 */}
            <div className="space-y-1.5">
              <Label className="text-xs">服务内容 <span className="text-destructive">*</span></Label>
              <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="描述本次服务的具体内容、过程与结论…" />
            </div>

            {/* 附件 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">附件（图片 / 视频 / 音频 / 文件）</Label>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                  onChange={(e) => onPickFiles(e.target.files)}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" /> 上传
                </Button>
              </div>
              {attachments.length === 0 ? (
                <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                  支持多文件；演示环境仅在本地预览，刷新后失效
                </div>
              ) : (
                <div className="space-y-1.5">
                  {attachments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-2 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        {a.type === "image" && a.thumb ? (
                          <img src={a.thumb} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                        ) : a.type === "image" ? (
                          <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : a.type === "video" ? (
                          <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{a.name}</span>
                        {a.size ? <span className="shrink-0 text-muted-foreground">· {fmtSize(a.size)}</span> : null}
                      </div>
                      <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeAttachment(a.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Paperclip className="h-3 w-3" />共 {attachments.length} 项附件
                  </div>
                </div>
              )}
            </div>

            {/* 服务人 */}
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              服务人：<span className="text-foreground font-medium">{myName}</span>
              <Badge variant="outline" className="ml-2 text-[10px]">{ROLE_META[role].name}</Badge>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>取消</Button>
            <Button onClick={submit}>提交</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}