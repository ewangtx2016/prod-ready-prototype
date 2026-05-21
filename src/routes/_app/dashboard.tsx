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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useState, useEffect, type ReactElement } from "react";
import { Download, Settings2, TrendingUp, Users, ShieldAlert, BookOpen, Info, Wallet, Repeat, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { RoleGate } from "@/components/dev/RoleGate";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, RadialBar, RadialBarChart, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

/** PRD §5 数据看板 · 五大模块
 *  M1 用户概览 / M2 服务概览 / M3 业务转化 / M4 分成财务 / M5 风险合规
 *  每个模块至少含 1 项核心指标(core=true，默认勾选不可取消) */
type ModuleKey = "user" | "service" | "conversion" | "profit" | "risk";
const MODULES: { key: ModuleKey; name: string; desc: string; icon: typeof Users }[] = [
  { key: "user",       name: "用户总览",   desc: "总用户 / 活跃 / 转化", icon: Users },
  { key: "conversion", name: "转化数据",   desc: "学科课订单数、订单金额、转化率", icon: TrendingUp },
  { key: "profit",     name: "分成数据",   desc: "已结算 / 待结算 / 预估收入", icon: Wallet },
  { key: "risk",       name: "风险预警",   desc: "敏感操作预警 (超量导出 / 批量查看 / 越权访问)", icon: ShieldAlert },
];
/** PRD §5.3 默认置顶展示的 4 项核心指标（跨模块派生指标，不属于 5 大模块明细） */
const CORE_METRICS: { key: string; label: string; value: string; trend?: string; icon: typeof Users; formula: string }[] = [
  {
    key: "core_old_user_in_subject",
    label: "转化用户中机构老用户占比",
    value: "67.8%",
    trend: "194 / 286",
    icon: Repeat,
    formula: "已转化的用户中，属于机构老用户（注册≥90天且历史有付费记录）的人数 / 转化用户总数 × 100%。",
  },
  {
    key: "core_alert_count",
    label: "敏感操作预警次数",
    value: "12",
    trend: "本月",
    icon: ShieldAlert,
    formula: "统计周期内触发敏感操作预警（超量导出、批量查看、越权访问、IP 异常等）的次数合计。",
  },
];

const ALL_METRICS: { key: string; module: ModuleKey; label: string; value: string; trend?: string; icon?: typeof Users; formula: string }[] = [
  // M1 用户总览
  { key: "total_user",     module: "user", label: "总用户数",       value: "1,248", icon: Users, formula: "归属当前机构、状态为正常或停用的全部用户数（不含已删除）。" },
  { key: "active_user",    module: "user", label: "活跃用户数",     value: "892",   trend: "+8.4%", icon: Users, formula: "近 30 天内有过登录、上课或服务记录的去重用户数。活跃=登录∪上课∪服务记录。" },
  { key: "converted_user", module: "user", label: "转化用户数",     value: "286",   trend: "转化率 22.9%", icon: TrendingUp, formula: "周期内由意向 / 体验状态成功转为已付费学员的去重用户数。" },
  // M2 转化数据
  { key: "order_count",    module: "conversion", label: "订单数", value: "156", icon: TrendingUp, formula: "周期内全部产品类型（课程/学习机/会员服务等）且订单状态非「已取消」的订单数量。" },
  { key: "product_order_dist", module: "conversion", label: "产品类型订单分布", value: "156", icon: TrendingUp, formula: "周期内各产品类型（课程/学习机/会员服务等）的有效订单数量分布。" },
  { key: "order_amount",   module: "conversion", label: "订单金额",     value: "¥328,400", icon: Wallet, formula: "周期内全部有效订单的应收金额合计（含未结算部分，不扣退款）。" },
  { key: "conv_rate",      module: "conversion", label: "转化率",       value: "22.9%", trend: "+3.1pp", icon: TrendingUp, formula: "周期内转化用户数 / 周期内进入服务流程的意向用户数 × 100%。" },
  // M3 分成数据
  { key: "settled",        module: "profit", label: "已结算金额", value: "¥186,300", trend: "+12.6%", icon: Wallet, formula: "周期内已完成结算流程并入账的金额合计。结算口径：T+N 到账且对账无异常。" },
  { key: "pending",        module: "profit", label: "待结算金额", value: "¥98,200",  icon: Wallet, formula: "已确认收入但尚未完成结算流程的金额合计（已上课/已确权但未到结算日）。" },
  { key: "estimated",      module: "profit", label: "预估收入",   value: "¥43,800",  icon: Wallet, formula: "按当前规则对未确权订单(如未上课/试听)估算的潜在分成，仅用于预测，不计入财务。" },
  // M5 风险预警
  { key: "alert_count",    module: "risk", label: "敏感操作预警次数", value: "12",  trend: "本月", icon: ShieldAlert, formula: "周期内触发风控规则的次数合计：超量导出、批量查看、越权访问、IP 异常、验证码失败超阈值等。" },
];

/* ========== 规划师专属指标（数据已按 planner_id = 当前用户 过滤） ========== */
const PLANNER_CORE_METRICS: typeof CORE_METRICS = [
  { key: "converted_user",  label: "我的转化用户数",   value: "42",      trend: "转化率 32.8%", icon: TrendingUp, formula: "周期内由本人服务并成功转化为已付费学员的去重用户数（仅本人名下）。" },
  { key: "estimated",       label: "我的预估收入",     value: "¥8,420",  trend: "未确权", icon: Wallet, formula: "本人名下未确权订单按当前分成规则估算的潜在收入，仅供预测，不计入财务。" },
  { key: "pending",         label: "我的待结算金额",   value: "¥21,560", trend: "已确权", icon: Wallet, formula: "本人名下已确权但尚未完成结算流程的金额合计。" },
];
const PLANNER_METRICS: typeof ALL_METRICS = [
  // M1 我的用户
  { key: "total_user",     module: "user", label: "我的名下用户数", value: "186", icon: Users, formula: "归属本人名下的全部用户数（仅本人名下）。" },
  { key: "active_user",    module: "user", label: "活跃用户数",     value: "128", trend: "+6.2%", icon: Users, formula: "近 30 天内有过登录、上课或本人服务记录的去重用户数（仅本人名下）。" },
  { key: "converted_user", module: "user", label: "我的转化用户数", value: "42",  trend: "转化率 32.8%", icon: TrendingUp, formula: "周期内由本人服务并成功转化的去重用户数。" },
  // M2 我的转化
  { key: "order_count",    module: "conversion", label: "我的订单数", value: "26",      icon: TrendingUp, formula: "周期内本人名下全部产品类型且非取消的订单数量。" },
  { key: "order_amount",   module: "conversion", label: "我的订单金额",     value: "¥58,200", icon: Wallet, formula: "周期内本人名下全部有效订单的应收金额合计（含未结算，不扣退款）。" },
  { key: "conv_rate",      module: "conversion", label: "我的转化率",       value: "32.8%",   trend: "+2.4pp", icon: TrendingUp, formula: "本人转化用户数 / 本人服务用户数 × 100%。" },
  // M3 我的分成
  { key: "settled",        module: "profit", label: "已结算金额", value: "¥34,820", trend: "+9.1%", icon: Wallet, formula: "本人名下已完成结算流程并入账的金额合计。" },
  { key: "pending",        module: "profit", label: "待结算金额", value: "¥21,560", icon: Wallet, formula: "本人名下已确权但尚未完成结算流程的金额合计。" },
  { key: "estimated",      module: "profit", label: "预估收入",   value: "¥8,420",  icon: Wallet, formula: "本人名下未确权订单按当前规则估算的潜在分成。" },
];

/* ========== 学管师专属指标（仅个人服务相关） ========== */
const TUTOR_CORE_METRICS: typeof CORE_METRICS = [
  { key: "active_user",     label: "我的活跃用户数",   value: "82",    icon: Users, formula: "近 30 天内有过本人服务记录的去重用户数。" },
];
const TUTOR_METRICS: typeof ALL_METRICS = [
];

/* ---------------- 图表数据 (mock) — 必须定义在使用组件之前 ---------------- */
const SPARK: Record<string, { x: string; v: number }[]> = {
  _default: [3,5,4,6,7,6,8,9,8,10,11,13].map((v,i)=>({x:`${i+1}`,v})),
  active_user:    [620,640,680,700,720,750,770,800,820,850,870,892].map((v,i)=>({x:`${i+1}`,v})),
  total_user:     [980,1010,1040,1070,1090,1120,1140,1160,1180,1210,1230,1248].map((v,i)=>({x:`${i+1}`,v})),
  conv_rate:      [16,17,18,18.5,19,20,20.5,21,21.5,22,22.5,22.9].map((v,i)=>({x:`${i+1}`,v})),
  order_amount:   [180,200,220,240,260,270,280,290,300,310,320,328.4].map((v,i)=>({x:`${i+1}`,v})),
  alert_count:    [4,6,5,8,7,9,11,10,12,9,11,12].map((v,i)=>({x:`${i+1}`,v})),
  core_served_ratio:        [42,44,46,48,49,50,51,52,53,54,55,56.2].map((v,i)=>({x:`${i+1}`,v})),
  core_old_user_in_subject: [55,57,58,60,61,62,63,64,65,66,67,67.8].map((v,i)=>({x:`${i+1}`,v})),
  core_freq_renew_corr:     [6,7,9,10,11,12,13,13,14,14,15,15].map((v,i)=>({x:`${i+1}`,v})),
  core_alert_count:         [4,6,5,8,7,9,11,10,12,9,11,12].map((v,i)=>({x:`${i+1}`,v})),
};
const TREND_12M = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const TREND_30D = Array.from({ length: 30 }, (_, i) => `${i + 1}日`);

// 将任意长度数据插值为 30 天趋势
function to30(vals: number[]) {
  return TREND_30D.map((x, i) => {
    const t = i / 29;
    const idx = t * (vals.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, vals.length - 1);
    const ratio = idx - lo;
    const v = vals[lo] * (1 - ratio) + vals[hi] * ratio;
    return { x, v: Math.round(v * 10) / 10 };
  });
}

function Dashboard() {
  const { role, orgName } = useApp();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(ALL_METRICS.map((m) => m.key));
  const [orgs, setOrgs] = useState<string[]>([]);
  const [orgFilter, setOrgFilter] = useState("all");

  useEffect(() => {
    if (role === "org_admin") {
      setOrgs([orgName]);
    } else {
      const orderList = db.orders();
      const orgNames = Array.from(new Set(orderList.map((o) => o.orgName))).filter(Boolean);
      setOrgs(orgNames);
    }
  }, [role, orgName]);

  const visible = ALL_METRICS.filter((m) => selected.includes(m.key));
  const isPlanner = role === "planner";
  const isTutor = role === "tutor";
  const isOrgAdmin = role === "org_admin";
  const isSuperAdmin = role === "super_admin";
  const isOrg = isOrgAdmin || isSuperAdmin;

  // 按角色切换指标集合（数据范围：规划师/学管师 = 本人）
  const coreMetrics = isPlanner ? PLANNER_CORE_METRICS : isTutor ? TUTOR_CORE_METRICS : CORE_METRICS;
  const allMetrics = isPlanner ? PLANNER_METRICS : isTutor ? TUTOR_METRICS : ALL_METRICS;
  const visibleMetrics = isOrg ? visible : allMetrics; // 个人视角固定布局，不参与"自定义指标"

  return (
    <RoleGate allow={["org_admin", "super_admin", "planner"]}>
    <div>
      <PageHeader
        title="数据看板"
        subtitle={`当前身份：${ROLE_META[role].name} · ${isPlanner ? "仅展示个人数据" : isTutor ? "仅展示个人服务数据" : "全量经营数据概览"}`}
        actions={
          <>
            {isOrg && (
              <PermissionTip action="自定义指标" prd="§5.2" allow={["org_admin"]} desc="点击弹出指标池，勾选/取消显示">
                <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                  <Settings2 className="h-4 w-4" /> 自定义指标
                </Button>
              </PermissionTip>
            )}
            <PermissionTip action="导出看板" prd="§5.2 / §14" allow={["org_admin", "planner", "tutor"]} desc={isOrg ? "导出全机构看板（脱敏）" : "仅导出本人范围数据"}>
              <Button size="sm" onClick={() => {
                const scope = isOrg ? "全量看板数据 (脱敏)" : "本人范围看板数据";
                db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "数据看板", action: "导出", detail: `导出${scope}` });
                const link = document.createElement("a");
                link.href = "/数据看板-导出模板.xlsx";
                link.download = `数据看板_${new Date().toISOString().slice(0,10)}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success(`已导出 数据看板_${new Date().toISOString().slice(0,10)}.xlsx`);
              }}>
                <Download className="h-4 w-4" /> {isOrg ? "导出" : "导出本人数据"}
              </Button>
            </PermissionTip>
          </>
        }
      />

      {isOrg && <DevNote prd="§5" title="数据看板 · 四大模块">
        <div>· <b>M1 用户总览</b>：总用户数 / 活跃用户数 / 转化用户数</div>
        <div>· <b>M2 转化数据</b>：学科课订单数 / 订单金额 / 转化率</div>
        <div>· <b>M3 分成数据</b>：已结算金额 / 待结算金额 / 预估收入</div>
        <div>· <b>M4 风险预警</b>：敏感操作预警次数（超量导出、批量查看、越权访问、IP 异常等）</div>
        <div>· <b>顶部 2 项核心指标</b>（PRD §5.3 默认置顶、不可取消）：转化用户中机构老用户占比 / 敏感操作预警次数</div>
        <div>· 数据范围：机构管理员=全量；规划师=本人；学管师=本人服务；鼎校超管=按授权</div>
        <div>· 刷新延迟 ≤5s；指标池由运营后台维护，机构可勾选/取消显示（核心指标默认勾选不可取消）</div>
        <div>· 鼠标悬停指标名称右侧 <Info className="inline h-3 w-3 text-info" /> 图标，可查看 <b>计算口径</b>（开发注释开启时显示）</div>
        <div>· 规划师/学管师直访本页返回 403（PRD §5.5 验收项）</div>
      </DevNote>}
      {!isOrg && <DevNote prd="§5" title={`${ROLE_META[role].name}视角 · 个人经营看板`}>
        <div>· 数据范围：所有指标已按 <b>当前用户</b> 过滤，仅展示本人名下数据，无任何机构级或他人数据。</div>
        <div>· 顶部核心 KPI：{isPlanner ? "我的转化 / 我的预估收入 / 我的待结算" : "我的活跃用户数"}。</div>
        <div>· 已隐藏：自定义指标池（固定布局更聚焦）、风险预警模块（仅机构管理员可见）{isTutor ? "、转化与分成模块（非学管师 KPI）" : ""}。</div>
        <div>· 已保留：「导出本人数据」按钮，便于个人存档对账（导出范围仅本人，全程脱敏）。</div>
        <div>· 鼠标悬停指标名称右侧 <Info className="inline h-3 w-3 text-info" /> 图标，可查看 <b>个人维度计算口径</b>。</div>
      </DevNote>}

      <div className="mb-4 flex items-center gap-3">
        <Select defaultValue="month">
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
            <SelectItem value="quarter">本季度</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="course">课程</SelectItem>
          </SelectContent>
        </Select>
        {(isOrg || isPlanner) && (
          <>
            {/* 机构筛选 */}
            {isOrgAdmin ? (
              <SearchSelect
                value={orgFilter}
                onChange={setOrgFilter}
                options={["all", orgName]}
                labels={{ all: "全部机构", [orgName]: orgName }}
                placeholder="搜索机构"
                width="w-40"
              />
            ) : (
              <SearchSelect
                value={orgFilter}
                onChange={setOrgFilter}
                options={["all", ...orgs]}
                labels={{ all: "全部机构" }}
                placeholder="搜索机构"
                width="w-40"
              />
            )}
          </>
        )}
      </div>

      <TooltipProvider delayDuration={150}>
        {/* 顶部：4 张核心指标卡片 */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {coreMetrics.map((m) => {
            const Icon = m.icon || BookOpen;
            const sparkColor =
              m.key === "core_old_user_in_subject" ? "var(--color-success)"
              : m.key === "core_freq_renew_corr" ? "var(--color-info)"
              : m.key === "core_alert_count" ? "var(--color-destructive)"
              : "var(--color-primary)";
            const isSimpleCard = m.key === "core_old_user_in_subject" || m.key === "core_alert_count";
            return (
              <Card key={m.key} className="relative overflow-hidden p-5">
                {!isSimpleCard && (
                  <>
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5" />
                    <div className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                  </>
                )}
                <FormulaTip label={m.label} formula={m.formula} />
                <div className="mt-2 text-3xl font-semibold tracking-tight">{m.value}</div>
                {m.trend && <div className="mt-1 text-xs text-success">{m.trend}</div>}
                {!isSimpleCard && (
                  <div className="mt-3 h-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={to30((SPARK[m.key] || SPARK._default).map((d) => d.v))}>
                        <defs>
                          <linearGradient id={`sp-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={sparkColor} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={2} fill={`url(#sp-${m.key})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* 五大模块 · 每个指标独立图表卡片 */}
        <div className="space-y-8">
          {MODULES.map((mod) => {
            const items = visibleMetrics.filter((m) => m.module === mod.key);
            if (items.length === 0) return null;
            const ModIcon = mod.icon;
            return (
              <section key={mod.key}>
                <div className="mb-3 flex items-center gap-2 border-l-2 border-primary pl-3">
                  <ModIcon className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold">{mod.name}</h2>
                  <span className="text-xs text-muted-foreground">· {mod.desc}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((m) => <MetricChartCard key={m.key} metric={m} />)}
                </div>
              </section>
            );
          })}
        </div>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>自定义指标池</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground mb-2">
            指标池由运营后台维护，机构可勾选/取消展示。<br />
            <b className="text-foreground">PRD §5.3 默认置顶 2 项核心指标</b>（转化用户中机构老用户占比 / 敏感操作预警次数）始终展示，不在此池中。
          </div>
          <div className="max-h-96 space-y-4 overflow-auto">
            {MODULES.map((mod, idx) => (
              <div key={mod.key}>
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">M{idx + 1} · {mod.name}</div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_METRICS.filter((m) => m.module === mod.key).map((m) => (
                    <label key={m.key} className="flex items-center gap-2 rounded border p-2 text-sm">
                      <Checkbox
                        checked={selected.includes(m.key)}
                        onCheckedChange={(v) => {
                          setSelected(v ? [...selected, m.key] : selected.filter((k) => k !== m.key));
                        }}
                      />
                      <span>{m.label}</span>
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
    </RoleGate>
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

function MetricChartCard({ metric }: { metric: typeof ALL_METRICS[number] }) {
  const Icon = metric.icon || BookOpen;
  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <FormulaTip label={metric.label} formula={metric.formula} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-2xl font-semibold tracking-tight">{metric.value}</div>
            {metric.trend && <span className="text-xs text-success">{metric.trend}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 h-36">
        {metric.key === "served_user" ? (
          <ServedUserCoverage />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(metric)}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function ServedUserCoverage() {
  const served = 701;
  const total = 892;
  const percent = 78.5;
  const data = [
    { name: "已服务", value: served, fill: "var(--color-primary)" },
    { name: "未服务", value: total - served, fill: "var(--color-muted)" },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="60%"
          outerRadius="90%"
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground"
          style={{ fontSize: 16, fontWeight: 600 }}
        >
          {percent}%
        </text>
        <RTooltip
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function renderChart(m: typeof ALL_METRICS[number]): ReactElement {
  const axis = { fontSize: 10, stroke: "var(--color-muted-foreground)" };
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />;
  const tip = <RTooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--color-accent)", opacity: 0.3 }} />;
  const xAxis30 = <XAxis dataKey="x" tick={axis} tickLine={false} axisLine={false} interval={4} />;

  // ---- 按指标性质选图表 ----
  switch (m.key) {
    // M1 用户总览
    case "total_user": {
      const data = to30([980,1010,1040,1070,1090,1120,1140,1160,1180,1210,1230,1248]);
      return (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g-total" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis30}
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          {tip}
          <Area type="monotone" dataKey="v" stroke="var(--color-primary)" strokeWidth={2} fill="url(#g-total)" />
        </AreaChart>
      );
    }
    case "active_user": {
      const data = to30([620,640,680,700,720,750,770,800,820,850,870,892]);
      return (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g-active" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis30}
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          {tip}
          <Area type="monotone" dataKey="v" stroke="var(--color-info)" strokeWidth={2} fill="url(#g-active)" />
        </AreaChart>
      );
    }
    case "served_user": {
      const v = 78.5;
      const data = [{ name: "覆盖", value: v, fill: "var(--color-primary)" }];
      return (
        <RadialBarChart innerRadius="65%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
          <RadialBar background={{ fill: "var(--color-muted)" } as any} dataKey="value" cornerRadius={8} />
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: 18, fontWeight: 600 }}>覆盖 {v}%</text>
        </RadialBarChart>
      );
    }
    case "converted_user": {
      const data = to30([5,10,7,15,10,18,14,22,18,26,20,25]);
      return (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g-conv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis30}
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          {tip}
          <Area type="monotone" dataKey="v" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#g-conv)" />
        </AreaChart>
      );
    }
    // M2 转化数据
    case "order_count": {
      const data = to30([3,6,4,7,5,8,6,7,5,6,7,8]);
      return (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g-order-cnt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis30}
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          {tip}
          <Area type="monotone" dataKey="v" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#g-order-cnt)" />
        </AreaChart>
      );
    }
    case "order_amount": {
      const data = to30([8,12,10,14,12,16,14,18,16,20,18,22]);
      return (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g-order-amt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis30}
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          {tip}
          <Area type="monotone" dataKey="v" stroke="var(--color-warning)" strokeWidth={2} fill="url(#g-order-amt)" />
        </AreaChart>
      );
    }
    case "product_order_dist": {
      const data = [
        { name: "课程", value: 98, fill: "var(--color-primary)" },
        { name: "学习机", value: 38, fill: "var(--color-info)" },
        { name: "会员服务", value: 20, fill: "var(--color-success)" },
      ];
      return (
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          {tip}
        </PieChart>
      );
    }
    case "conv_rate": {
      const data = to30([16,17,18,18.5,19,20,20.5,21,21.5,22,22.5,22.9]);
      return (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g-conv-rate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis30}
          <YAxis tick={axis} tickLine={false} axisLine={false} domain={[10, 30]} />
          {tip}
          <Area type="monotone" dataKey="v" stroke="var(--color-success)" strokeWidth={2} fill="url(#g-conv-rate)" />
        </AreaChart>
      );
    }
    // M3 分成数据
    case "settled": {
      const data = to30([5000,5500,5200,6000,5800,6500,6200,6800,6400,7000,6600,7200]);
      return (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g-settled" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis30}
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          {tip}
          <Area type="monotone" dataKey="v" stroke="var(--color-success)" strokeWidth={2} fill="url(#g-settled)" />
        </AreaChart>
      );
    }
    case "pending": {
      const data = to30([3000,3500,3200,3800,3600,4000,3800,4200,4000,4400,4200,4500]);
      return (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g-pending" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis30}
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          {tip}
          <Area type="monotone" dataKey="v" stroke="var(--color-info)" strokeWidth={2} fill="url(#g-pending)" />
        </AreaChart>
      );
    }
    case "estimated": {
      const data = to30([1000,1200,1100,1400,1300,1500,1400,1600,1500,1700,1600,1800]);
      return (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g-est" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis30}
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          {tip}
          <Area type="monotone" dataKey="v" stroke="var(--color-warning)" strokeWidth={2} fill="url(#g-est)" />
        </AreaChart>
      );
    }
    // M4 服务数据
    case "service_count": {
      const data = to30([1000,1100,1050,1150,1120,1180,1160,1220,1200,1250,1230,1300]);
      return (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g-svc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis30}
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          {tip}
          <Area type="monotone" dataKey="v" stroke="var(--color-info)" strokeWidth={2} fill="url(#g-svc)" />
        </AreaChart>
      );
    }
    case "tutor_complete": {
      const data = [{ name: "完成率", value: 91.4, fill: "var(--color-success)" }];
      return (
        <RadialBarChart innerRadius="65%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
          <RadialBar background={{ fill: "var(--color-muted)" } as any} dataKey="value" cornerRadius={8} />
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: 18, fontWeight: 600 }}>91.4%</text>
        </RadialBarChart>
      );
    }
    // M5 风险预警
    case "alert_count": {
      const data = [
        { name: "超量导出", value: 4, fill: "var(--color-destructive)" },
        { name: "批量查看", value: 5, fill: "var(--color-warning)" },
      ];
      return (
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          {tip}
        </PieChart>
      );
    }
    default: {
      const spark = SPARK[m.key] || SPARK._default;
      const data = to30(spark.map((d) => d.v));
      return (
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`g-def-${m.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis30}
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          {tip}
          <Area type="monotone" dataKey="v" stroke="var(--color-primary)" strokeWidth={2} fill={`url(#g-def-${m.key})`} />
        </AreaChart>
      );
    }
  }
}

/** 可搜索下拉选择器（Combobox） */
function SearchSelect({
  value,
  onChange,
  options,
  labels,
  placeholder,
  width = "w-40",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
  placeholder?: string;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const display = labels?.[value] ?? value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", width)}
        >
          {display}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", width)}>
        <Command>
          <CommandInput placeholder={placeholder ?? "搜索..."} />
          <CommandList>
            <CommandEmpty>未找到</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {labels?.[opt] ?? opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
