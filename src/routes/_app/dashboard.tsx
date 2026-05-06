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
import { useState } from "react";
import { Download, Settings2, TrendingUp, Users, ShieldAlert, BookOpen, Activity } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/mock";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const ALL_METRICS = [
  { key: "service_ratio", label: "规划师服务用户占比", value: "78.5%", trend: "+5.2%", core: true, icon: Users },
  { key: "old_user_conv", label: "学科课转化中老用户占比", value: "62.3%", trend: "+3.1%", core: true, icon: TrendingUp },
  { key: "service_freq", label: "服务频次与续报关联度", value: "+15%", trend: "高频续报率领先 15pp", core: true, icon: Activity },
  { key: "alert_count", label: "敏感操作预警次数", value: "3", trend: "本月", core: true, icon: ShieldAlert },
  { key: "total_user", label: "机构总用户数", value: "1,248" },
  { key: "active_user", label: "活跃用户数", value: "892" },
  { key: "order_count", label: "学科课订单数", value: "156" },
  { key: "order_amount", label: "订单总金额", value: "¥328,400" },
  { key: "settled", label: "已结算金额", value: "¥186,300" },
  { key: "pending", label: "待结算金额", value: "¥98,200" },
  { key: "pass_rate", label: "艺考等级通过率", value: "85%" },
  { key: "group_active", label: "社群回复率", value: "76%" },
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

      <DevNote prd="§5" title="数据看板模块">
        <div>· 默认置顶 4 项核心指标：服务用户占比、老用户转化占比、服务频次关联度、敏感预警次数</div>
        <div>· 数据范围：机构管理员=全量；规划师=本人；学管师=本人服务；鼎校超管=按授权</div>
        <div>· 刷新延迟 ≤5s；指标池由运营后台维护，机构勾选/取消显示</div>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {visible.map((m) => {
          const Icon = m.icon || BookOpen;
          return (
            <Card key={m.key} className="p-4">
              <div className="flex items-start justify-between">
                <div className="text-sm text-muted-foreground">{m.label}</div>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{m.value}</div>
              {m.trend && <div className="mt-1 text-xs text-success">{m.trend}</div>}
              {m.core && <div className="mt-1 inline-block rounded bg-primary/10 px-1.5 text-[10px] text-primary">核心指标</div>}
            </Card>
          );
        })}
      </div>

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
          <div className="grid grid-cols-2 gap-3 max-h-80 overflow-auto">
            {ALL_METRICS.map((m) => (
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => { setOpen(false); toast.success("看板已实时更新"); }}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}