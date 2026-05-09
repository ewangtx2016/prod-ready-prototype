import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db, type Order, type ServiceRecord } from "@/lib/mock";
import { ShoppingCart, FileText, UserCog, GraduationCap, Clock } from "lucide-react";
import { useMemo } from "react";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  submitted: { label: "已填写", cls: "bg-info text-info-foreground" },
  pending_audit: { label: "待审核", cls: "bg-warning text-warning-foreground" },
  approved: { label: "已通过", cls: "bg-success text-success-foreground" },
  rejected: { label: "未通过", cls: "bg-destructive text-destructive-foreground" },
};

export function SalesServicesSheet({ order, onOpenChange }: { order: Order | null; onOpenChange: (v: boolean) => void }) {
  const records = useMemo<ServiceRecord[]>(() => {
    if (!order) return [];
    return db
      .services()
      .filter((s) => s.orderIds?.includes(order.id))
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [order]);
  const open = !!order;
  const totalMin = records.reduce((s, r) => s + r.duration, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />订单服务记录</SheetTitle>
          <SheetDescription className="font-mono text-xs">{order?.id}</SheetDescription>
        </SheetHeader>
        {order && (
          <div className="mt-4 space-y-4">
            <Card className="p-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">用户</span><span>{order.userName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">课程</span><span>{order.course}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">金额</span><span className="font-semibold">¥{order.amount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">规划师</span><span>{order.plannerName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">订单状态</span><Badge variant="outline">{order.status}</Badge></div>
            </Card>

            <div className="flex items-center justify-between text-xs">
              <div className="text-muted-foreground">关联服务记录</div>
              <div className="text-muted-foreground">共 <span className="text-foreground font-medium">{records.length}</span> 条 · 累计 <span className="text-foreground font-medium">{totalMin}</span> 分钟</div>
            </div>

            {records.length === 0 ? (
              <Card className="p-6 text-center text-xs text-muted-foreground">该订单暂无关联服务记录</Card>
            ) : (
              <ol className="relative ml-2 border-l border-border/70 pl-5 space-y-4">
                {records.map((r, idx) => {
                  const RoleIcon = r.createdByRole === "planner" ? UserCog : GraduationCap;
                  const roleLabel = r.createdByRole === "planner" ? "规划师" : "学管师";
                  const [datePart, timePart] = r.createdAt.split(" ");
                  return (
                    <li key={r.id} className="relative">
                      <span
                        className={`absolute -left-[26px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-background ${
                          idx === 0 ? "bg-primary" : "bg-muted-foreground/40"
                        }`}
                      />
                      <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="font-mono">{datePart}</span>
                        <span className="font-mono">{timePart}</span>
                        {idx === 0 && <Badge variant="outline" className="h-4 px-1.5 text-[10px]">最新</Badge>}
                      </div>
                      <Card className="p-3 text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{r.serviceType}</Badge>
                            <span className="text-xs text-muted-foreground">{r.duration} 分钟</span>
                          </div>
                          <Badge className={STATUS_LABEL[r.status]?.cls}>{STATUS_LABEL[r.status]?.label}</Badge>
                        </div>
                        <div className="text-sm leading-relaxed">{r.content}</div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-2">
                          <div className="inline-flex items-center gap-1.5">
                            <RoleIcon className="h-3 w-3" />
                            {r.createdBy} · {roleLabel}
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="rounded-md border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground flex gap-2">
              <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              服务记录由外部系统同步，本系统只读展示。结算流程不依赖服务记录数量（PRD §10）。
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}