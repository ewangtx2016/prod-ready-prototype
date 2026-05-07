import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db, type LedgerItem, type Order, type ProfitRule } from "@/lib/mock";
import { CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { useMemo } from "react";

/**
 * 分成明细抽屉 — 把命中的分成规则与四方金额计算过程一目了然展示
 * PRD §10 / §8（分成规则）
 */
export function SplitDetailSheet({
  item,
  onOpenChange,
}: {
  item: LedgerItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!item;

  const { order, rule } = useMemo(() => {
    if (!item) return { order: null as Order | null, rule: null as ProfitRule | null };
    const order = db.orders().find((o) => o.id === item.orderId) || null;
    const rule = db.rules().find((r) => r.status === "active") || null;
    return { order, rule };
  }, [item]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> 分成明细
          </SheetTitle>
          <SheetDescription className="font-mono text-xs">
            订单 {item?.orderId} · 结算单 {item?.id}
          </SheetDescription>
        </SheetHeader>

        {item && (
          <div className="mt-4 space-y-4">
            {/* ① 订单概要 */}
            <Card className="p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">用户</span><span>{item.userName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">课程</span><span>{item.course}</span></div>
              {order && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">课程类型</span><Badge variant="outline">{order.courseType}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">用户来源</span><Badge variant="outline">{order.source}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">渠道</span><span>{order.channel}</span></div>
                </>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">规划师</span><span>{item.plannerName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">订单金额</span><span className="font-semibold">¥{item.amount.toLocaleString()}</span></div>
            </Card>

            {/* ② 命中规则 */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">命中分成规则</div>
              {rule ? (
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{rule.name}</span>
                    <Badge variant="secondary" className="font-mono text-[10px]">{rule.version}</Badge>
                    <Badge className="bg-success text-success-foreground text-[10px]">生效中</Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    {rule.dims.courseType && order && (
                      <HitLine
                        ok
                        label={`课程类型维度 (权重 ${(rule.dims.courseType.weight * 100) | 0}%)`}
                        detail={`命中「${order.courseType}」 → 机构 ${rule.dims.courseType.ratios[order.courseType]?.org}% / 规划师 ${rule.dims.courseType.ratios[order.courseType]?.planner}% / 平台 ${rule.dims.courseType.ratios[order.courseType]?.platform}%`}
                      />
                    )}
                    {rule.dims.userSource && order && (
                      <HitLine
                        ok
                        label={`用户来源维度 (权重 ${(rule.dims.userSource.weight * 100) | 0}%)`}
                        detail={`命中「${order.source}」 → 机构 ${rule.dims.userSource.ratios[order.source]?.org}% / 规划师 ${rule.dims.userSource.ratios[order.source]?.planner}% / 平台 ${rule.dims.userSource.ratios[order.source]?.platform}%`}
                      />
                    )}
                    {rule.dims.convStage && (
                      <HitLine ok={false} label="转化阶段维度" detail="未命中（订单无试听/续报标记）" />
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="p-3 text-xs text-warning flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> 未匹配生效中的分成规则
                </Card>
              )}
            </div>

            {/* ③ 计算过程 */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">计算过程</div>
              <Card className="p-3 text-sm">
                <Row label="订单总额" value={`¥${item.amount.toLocaleString()}`} />
                <Separator className="my-2" />
                <Row label="机构分成" value={`¥${item.orgAmount.toLocaleString()}`} accent="info" pct={item.amount ? (item.orgAmount / item.amount) * 100 : 0} />
                <Row label="规划师分成" value={`¥${item.plannerAmount.toLocaleString()}`} accent="success" pct={item.amount ? (item.plannerAmount / item.amount) * 100 : 0} />
                <Row label="平台留存" value={`¥${item.platformAmount.toLocaleString()}`} accent="muted" pct={item.amount ? (item.platformAmount / item.amount) * 100 : 0} />
                <Separator className="my-2" />
                <Row
                  label="合计校验"
                  value={`¥${(item.orgAmount + item.plannerAmount + item.platformAmount).toLocaleString()}`}
                  ok={item.orgAmount + item.plannerAmount + item.platformAmount === item.amount}
                />
              </Card>
            </div>

            {/* ④ 状态 */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">结算状态</div>
              <Card className="p-3 text-sm space-y-1.5">
                <StatusRow target="机构" status={item.status} settledAt={item.settledAt} />
                <StatusRow target="规划师" status={item.status} settledAt={item.settledAt} />
                <StatusRow target="平台" status={item.status} settledAt={item.settledAt} />
              </Card>
            </div>

            <p className="text-[11px] text-muted-foreground">
              本明细按订单产生时的规则版本快照计算，规则修订不会影响历史订单。
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function HitLine({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" /> : <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />}
      <div className={ok ? "" : "text-muted-foreground line-through"}>
        <div className="font-medium">{label}</div>
        <div className="text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}

function Row({ label, value, accent, pct, ok }: { label: string; value: string; accent?: "info" | "success" | "muted"; pct?: number; ok?: boolean }) {
  const cls = accent === "info" ? "text-info" : accent === "success" ? "text-success" : accent === "muted" ? "text-muted-foreground" : "";
  return (
    <div className="flex items-center justify-between py-1">
      <span className="flex items-center gap-2">
        {label}
        {pct !== undefined && <span className="text-[10px] text-muted-foreground">({pct.toFixed(1)}%)</span>}
        {ok === true && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
        {ok === false && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
      </span>
      <span className={`font-mono ${cls}`}>{value}</span>
    </div>
  );
}

function StatusRow({ target, status, settledAt }: { target: string; status: LedgerItem["status"]; settledAt?: string }) {
  const map: Record<LedgerItem["status"], { label: string; cls: string }> = {
    settled: { label: "已结算", cls: "text-success" },
    pending: { label: "待结算", cls: "text-warning" },
    estimated: { label: "预估中", cls: "text-info" },
    refund_pending: { label: "退回中", cls: "text-warning" },
    refund_settled: { label: "已退回", cls: "text-destructive" },
    abnormal: { label: "异常", cls: "text-destructive" },
  };
  const m = map[status];
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{target}</span>
      <span className="flex items-center gap-2">
        <span className={`text-xs ${m.cls}`}>● {m.label}</span>
        {settledAt && <span className="text-xs text-muted-foreground">{settledAt}</span>}
      </span>
    </div>
  );
}