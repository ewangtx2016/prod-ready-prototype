import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { PageHeader } from "@/components/dev/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { Download, Settings2, TrendingUp, Users, ShieldAlert, BookOpen, Activity, Info, Wallet, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/mock";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

/** PRD §5 数据看板 · 五大模块
 *  M1 用户概览 / M2 服务概览 / M3 业务转化 / M4 分成财务 / M5 风险合规
 *  每个模块至少含 1 项核心指标(core=true，默认勾选不可取消) */
type ModuleKey = "user" | "service" | "conversion" | "profit" | "risk";
const MODULES: { key: ModuleKey; name: string; desc: string; icon: typeof Users }[] = [
  { key: "user",       name: "用户概览",   desc: "机构用户规模与活跃度", icon: Users },
  { key: "service",    name: "服务概览",   desc: "规划师/学管师服务覆盖与频次", icon: Activity },
  { key: "conversion", name: "业务转化",   desc: "学科课订单与老用户转化", icon: TrendingUp },
  { key: "profit",     name: "分成财务",   desc: "订单金额、已结算 / 待结算 / 预估", icon: Wallet },
  { key: "risk",       name: "风险合规",   desc: "敏感操作预警与异常账款", icon: ShieldAlert },
];
const ALL_METRICS: { key: string; module: ModuleKey; label: string; value: string; trend?: string; core?: boolean; icon?: typeof Users; formula: string }[] = [
  // M1 用户概览
  { key: "total_user",    module: "user", label: "机构总用户数",   value: "1,248", icon: Users,         formula: "归属当前机构、状态为正常或停用的全部用户数（不含已删除）。" },
  { key: "active_user",   module: "user", label: "活跃用户数",     value: "892",   trend: "+8.4%", core: true, icon: Users, formula: "近 30 天内有过登录、上课或服务记录的去重用户数。活跃用户=登录∪上课∪服务记录。" },
  { key: "new_user",      module: "user", label: "周期新增用户",   value: "126",   icon: Users,         formula: "周期内首次注册或首次付费的用户数（取较早者）。" },
  // M2 服务概览
  { key: "service_ratio", module: "service", label: "规划师服务用户占比", value: "78.5%", trend: "+5.2%", core: true, icon: Activity, formula: "周期内有过规划师 1V1 服务记录的用户数 / 机构活跃用户数 × 100%。活跃用户口径：近 30 天有登录或上课。" },
  { key: "service_freq",  module: "service", label: "服务频次与续报关联度", value: "+15pp", trend: "高频续报率领先 15pp", core: true, icon: Activity, formula: "高频服务用户(周期内服务≥4次)的续报率 − 低频服务用户(<4次)的续报率，单位为百分点(pp)。" },
  { key: "group_active",  module: "service", label: "社群回复率", value: "76%", icon: Activity, formula: "周期内学员/家长在社群发问后 24 小时内被服务人员回复的会话数 / 总发问会话数 × 100%。" },
  // M3 业务转化
  { key: "old_user_conv", module: "conversion", label: "学科课转化中老用户占比", value: "62.3%", trend: "+3.1%", core: true, icon: TrendingUp, formula: "周期内学科课订单中，下单人为老用户的订单数 / 学科课总订单数 × 100%。老用户：首次付费距今 ≥30 天。" },
  { key: "order_count",   module: "conversion", label: "学科课订单数", value: "156", icon: TrendingUp, formula: "周期内课程类型为「学科课」且订单状态非「已取消」的订单数量。" },
  { key: "pass_rate",     module: "conversion", label: "艺考等级通过率", value: "85%", icon: GraduationCap, formula: "周期内通过艺考等级考试的学员数 / 报考学员数 × 100%。" },
  // M4 分成财务
  { key: "order_amount",  module: "profit", label: "订单总金额", value: "¥328,400", core: true, icon: Wallet, formula: "周期内全部有效订单的应收金额合计（含未结算部分，不扣退款）。" },
  { key: "settled",       module: "profit", label: "已结算金额", value: "¥186,300", icon: Wallet, formula: "周期内已完成结算流程并入账的金额合计。结算口径：T+N 到账且对账无异常。" },
  { key: "pending",       module: "profit", label: "待结算金额", value: "¥98,200",  icon: Wallet, formula: "已确认收入但尚未完成结算流程的金额合计（已上课/已确权但未到结算日）。" },
  { key: "estimated",     module: "profit", label: "预估收入",   value: "¥43,800",  icon: Wallet, formula: "按当前规则对未确权订单(如未上课/试听)估算的潜在分成，仅用于预测，不计入财务。" },
  // M5 风险合规
  { key: "alert_count",   module: "risk", label: "敏感操作预警次数", value: "3",  trend: "本月", core: true, icon: ShieldAlert, formula: "周期内触发敏感操作风控规则的次数（含批量导出、越权访问、IP 异常、验证码失败超阈值等）。" },
  { key: "abnormal",      module: "risk", label: "异常账款笔数",     value: "5",  icon: ShieldAlert, formula: "周期内被标记为「异常」的账款笔数（金额不一致 / 重复支付 / 退款争议等）。" },
  { key: "refund_rate",   module: "risk", label: "退款率",           value: "1.8%", icon: ShieldAlert, formula: "周期内退款订单数 / 周期内全部订单数 × 100%。" },
];

function Dashboard() {
  const { role } = useApp();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(ALL_METRICS.filter((m) => m.core).map((m) => m.key));

  const visible = ALL_METRICS.filter((m) => selected.includes(m.key));
  const isPlanner = role === "planner";
  const isTutor = role === "tutor";

  return (
    <div>
      <PageHeader
        title="数据看板"
        subtitle={`当前身份：${ROLE_META[role].name} · ${isPlanner ? "仅展示个人数据" : isTutor ? "仅展示个人服务数据" : "全量经营数据概览"}`}
        actions={
          <>
            <PermissionTip action="自定义指标" prd="§5.2" allow={["org_admin"]} desc="点击弹出指标池，勾选/取消显示">
              <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={isPlanner || isTutor}>
                <Settings2 className="h-4 w-4" /> 自定义指标
              </Button>
            </PermissionTip>
            <PermissionTip action="导出看板" prd="§5.2 / §14" allow={["org_admin"]} desc="规划师/学管师不可导出">
              <Button size="sm" onClick={() => { db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "数据看板", action: "导出", detail: "导出全量看板数据 (脱敏)" }); toast.success("已导出 dashboard.xlsx (mock)"); }} disabled={isPlanner || isTutor}>
                <Download className="h-4 w-4" /> 导出
              </Button>
            </PermissionTip>
          </>
        }
      />

      <DevNote prd="§5" title="数据看板 · 五大模块">
        <div>· <b>M1 用户概览</b>：总用户 / 活跃 / 新增；<b>M2 服务概览</b>：规划师服务覆盖、频次关联度、社群</div>
        <div>· <b>M3 业务转化</b>：学科课订单、老用户转化、艺考通过；<b>M4 分成财务</b>：订单金额、已结算 / 待结算 / 预估</div>
        <div>· <b>M5 风险合规</b>：敏感操作预警、异常账款、退款率</div>
        <div>· 数据范围：机构管理员=全量；规划师=本人；学管师=本人服务；鼎校超管=按授权</div>
        <div>· 刷新延迟 ≤5s；指标池由运营后台维护，机构可勾选/取消显示（核心指标默认勾选不可取消）</div>
        <div>· 鼠标悬停指标名称右侧 <Info className="inline h-3 w-3 text-info" /> 图标，可查看 <b>计算口径</b>（开发注释开启时显示）</div>
        <div>· <b>待确认</b>：指标池首期具体数量与定义（PRD §5.4）</div>
      </DevNote>

      <div className="mb-4 flex items-center gap-3">
        <Select defaultValue="month">
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">今日</SelectItem>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
            <SelectItem value="quarter">本季度</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all_course">
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all_course">全部课程类型</SelectItem>
            <SelectItem value="subject">学科课</SelectItem>
            <SelectItem value="quality">素养课</SelectItem>
            <SelectItem value="trial">体验课</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all_channel">
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all_channel">全部来源渠道</SelectItem>
            <SelectItem value="dingtuan">鼎团团</SelectItem>
            <SelectItem value="zhenxuan">甄选</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="space-y-6">
          {MODULES.map((mod, idx) => {
            const items = visible.filter((m) => m.module === mod.key);
            if (items.length === 0) return null;
            const ModIcon = mod.icon;
            return (
              <section key={mod.key}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-[11px] font-medium text-primary">M{idx + 1}</span>
                  <ModIcon className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">{mod.name}</h2>
                  <span className="text-xs text-muted-foreground">· {mod.desc}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {items.map((m) => {
                    const Icon = m.icon || BookOpen;
                    return (
                      <Card key={m.key} className="p-4">
                        <div className="flex items-start justify-between">
                          <FormulaTip label={m.label} formula={m.formula} />
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="mt-2 text-2xl font-semibold">{m.value}</div>
                        {m.trend && <div className="mt-1 text-xs text-success">{m.trend}</div>}
                        {m.core && <div className="mt-1 inline-block rounded bg-primary/10 px-1.5 text-[10px] text-primary">核心指标</div>}
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </TooltipProvider>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-medium">用户总览 · 趋势图</h3>
          <div className="flex h-48 items-end gap-2">
            {[42, 58, 65, 71, 80, 92, 88, 105, 112, 128, 134, 156].map((v, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary/70 transition-all hover:bg-primary" style={{ height: `${v / 1.6}%` }} title={`第${i + 1}周: ${v}`} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>1月</span><span>12月</span></div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-medium">分成数据 · 分布</h3>
          <div className="space-y-3">
            {[{ k: "已结算金额", v: 186300, c: "bg-success" }, { k: "待结算金额", v: 98200, c: "bg-info" }, { k: "预估收入", v: 43800, c: "bg-warning" }].map((x) => (
              <div key={x.k}>
                <div className="mb-1 flex justify-between text-sm"><span>{x.k}</span><span className="font-medium">¥{x.v.toLocaleString()}</span></div>
                <div className="h-2 rounded-full bg-muted">
                  <div className={`h-full rounded-full ${x.c}`} style={{ width: `${(x.v / 200000) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>自定义指标池</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground mb-2">指标池由运营后台维护，机构可勾选/取消展示。核心 4 项默认勾选不可取消。</div>
          <div className="max-h-96 space-y-4 overflow-auto">
            {MODULES.map((mod, idx) => (
              <div key={mod.key}>
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">M{idx + 1} · {mod.name}</div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_METRICS.filter((m) => m.module === mod.key).map((m) => (
                    <label key={m.key} className="flex items-center gap-2 rounded border p-2 text-sm">
                      <Checkbox
                        checked={selected.includes(m.key)}
                        disabled={m.core}
                        onCheckedChange={(v) => {
                          if (m.core) return;
                          setSelected(v ? [...selected, m.key] : selected.filter((k) => k !== m.key));
                        }}
                      />
                      <span>{m.label}</span>
                      {m.core && <span className="ml-auto rounded bg-primary/10 px-1 text-[10px] text-primary">核心</span>}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => { setOpen(false); toast.success("看板已实时更新"); }}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormulaTip({ label, formula }: { label: string; formula: string }) {
  const { showDevNote } = useApp();
  if (!showDevNote) {
    return <div className="text-sm text-muted-foreground">{label}</div>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="relative inline-flex cursor-help text-sm text-muted-foreground">
          {label}
          <Info className="pointer-events-none absolute -right-3 -top-1 h-3 w-3 rounded-full bg-info text-info-foreground p-[1px]" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs space-y-1">
        <div className="font-medium">计算方式</div>
        <div className="text-xs leading-relaxed">{formula}</div>
      </TooltipContent>
    </Tooltip>
  );
}