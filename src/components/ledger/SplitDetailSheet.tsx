import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db, type LedgerItem, type Order, type ProfitRule } from "@/lib/mock";
import { CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { useMemo } from "react";

type DimCalc = {
  label: string;
  rawWeight: number;
  normWeight: number;
  hit: boolean;
  hitKey?: string;
  ratios?: { org: number; planner: number; platform: number };
  reason?: string;
};
type Calc = {
  dims: DimCalc[];
  percents: { org: number; planner: number; platform: number };
  amounts: { org: number; planner: number; platform: number };
};

function computeSplit(order: Order, rule: ProfitRule, amount: number): Calc {
  const dims: DimCalc[] = [];
  const ct = rule.dims.courseType;
  if (ct) {
    const r = ct.ratios[order.courseType];
    dims.push({ label: "课程类型维度", rawWeight: ct.weight, normWeight: 0, hit: !!r, hitKey: r ? order.courseType : undefined, ratios: r, reason: r ? undefined : `订单课程类型「${order.courseType}」未在规则中` });
  }
  const us = rule.dims.userSource;
  if (us) {
    const r = us.ratios[order.source];
    dims.push({ label: "用户来源维度", rawWeight: us.weight, normWeight: 0, hit: !!r, hitKey: r ? order.source : undefined, ratios: r, reason: r ? undefined : `订单用户来源「${order.source}」未在规则中` });
  }
  const cs = rule.dims.convStage;
  if (cs) {
    dims.push({ label: "转化阶段维度", rawWeight: cs.weight, normWeight: 0, hit: false, reason: "订单无试听/续报标记" });
  }
  const sumHitWeight = dims.filter((d) => d.hit).reduce((s, d) => s + d.rawWeight, 0);
  dims.forEach((d) => { d.normWeight = d.hit && sumHitWeight > 0 ? d.rawWeight / sumHitWeight : 0; });
  const pct = (k: "org" | "planner" | "platform") => dims.filter((d) => d.hit).reduce((s, d) => s + d.normWeight * d.ratios![k], 0);
  const percents = { org: pct("org"), planner: pct("planner"), platform: pct("platform") };
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const amounts = { org: round2(amount * percents.org / 100), planner: round2(amount * percents.planner / 100), platform: round2(amount * percents.platform / 100) };
  return { dims, percents, amounts };
}

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

  const { order, rule, calc } = useMemo(() => {
    if (!item) return { order: null as Order | null, rule: null as ProfitRule | null, calc: null as Calc | null };
    const order = db.orders().find((o) => o.id === item.orderId) || null;
    const rule = db.rules().find((r) => r.status === "active") || null;
    const calc = order && rule ? computeSplit(order, rule, item.amount) : null;
    return { order, rule, calc };
  }, [item]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> 分成明细
          </SheetTitle>
          <SheetDescription className="font-mono text-xs">
            订单 {item?.orderId} · 账单ID {item?.billId}
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

            {/* ② 分成计算（数据来源：鼎团团等第三方分账系统） */}
            {calc && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">分成计算</div>
                <Card className="p-3 text-sm space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>订单金额</span>
                    <span className="font-mono">¥{item.amount.toLocaleString()}</span>
                  </div>
                  <Separator />
                  {(["org", "planner", "platform"] as const).map((k) => {
                    const meta = { org: { name: "机构", accent: "info" as const }, planner: { name: "规划师", accent: "success" as const }, platform: { name: "平台", accent: "muted" as const } }[k];
                    return (
                      <SimpleSplitRow
                        key={k}
                        name={meta.name}
                        accent={meta.accent}
                        pct={calc.percents[k]}
                        amount={calc.amounts[k]}
                        base={item.amount}
                      />
                    );
                  })}
                  <Separator />
                  <Row
                    label="三方合计"
                    value={`¥${(calc.amounts.org + calc.amounts.planner + calc.amounts.platform).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    ok={Math.abs(calc.amounts.org + calc.amounts.planner + calc.amounts.platform - item.amount) < 0.01}
                  />
                </Card>
              </div>
            )}

            {/* ④ 状态 */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">结算状态</div>
              <Card className="p-3 text-sm space-y-1.5">
                <StatusRow target="机构" status={item.status} settledAt={item.settledAt} />
                <StatusRow target="规划师" status={item.status} settledAt={item.settledAt} />
                <StatusRow target="平台" status={item.status} settledAt={item.settledAt} />
              </Card>
            </div>

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

function SimpleSplitRow({ name, accent, pct, amount, base }: { name: string; accent: "info" | "success" | "muted"; pct: number; amount: number; base: number }) {
  const cls = accent === "info" ? "text-info" : accent === "success" ? "text-success" : "text-muted-foreground";
  const barCls = accent === "info" ? "bg-info" : accent === "success" ? "bg-success" : "bg-muted-foreground/60";
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${barCls}`} />
          <span>{name}分成</span>
          <span className="text-xs text-muted-foreground">占 {pct.toFixed(1)}%</span>
        </span>
        <span className={`font-mono ${cls}`}>¥{amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      </div>
      <div className="mt-1 ml-4 h-1 rounded bg-muted overflow-hidden">
        <div className={`h-full ${barCls}`} style={{ width: `${Math.min(100, pct)}%` }} />
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