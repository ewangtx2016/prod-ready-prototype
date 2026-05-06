import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { db } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { SmsVerifyDialog } from "@/components/dev/SmsVerifyDialog";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profit/dimensions")({ component: Page });

const KEY = "demo.dim.cfg";
type Cfg = { w1: number; w2: number; w3: number; courseType: Record<string, [number, number, number]>; userSource: Record<string, [number, number, number]>; convStage: Record<string, [number, number, number]> };
const init: Cfg = {
  w1: 0.4, w2: 0.3, w3: 0.3,
  courseType: { 学科课: [60, 30, 10], 素养课: [50, 35, 15], 体验课: [40, 50, 10] },
  userSource: { 机构老用户: [70, 20, 10], 规划师新拓: [40, 50, 10] },
  convStage: { 试听转正价课: [50, 40, 10], 续报课: [65, 25, 10] },
};

function Page() {
  const { role } = useApp();
  const [cfg, setCfg] = useState<Cfg>(init);
  const [sms, setSms] = useState(false);
  useEffect(() => { const raw = localStorage.getItem(KEY); if (raw) setCfg(JSON.parse(raw)); }, []);

  const sumW = +(cfg.w1 + cfg.w2 + cfg.w3).toFixed(2);
  const canEdit = role === "super_admin";

  const requestSave = () => {
    if (sumW !== 1) { toast.error(`权重之和必须为 1，当前=${sumW}`); return; }
    for (const [k, dim] of Object.entries({ "课程类型": cfg.courseType, "用户来源": cfg.userSource, "转化阶段": cfg.convStage })) {
      for (const [cat, vals] of Object.entries(dim as any)) {
        const s = (vals as number[]).reduce((a, b) => a + b, 0);
        if (s !== 100) { toast.error(`${k} - ${cat} 三方比例之和必须为 100，当前=${s}`); return; }
      }
    }
    setSms(true);
  };

  const onSmsSuccess = () => {
    localStorage.setItem(KEY, JSON.stringify(cfg));
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "分成维度", action: "保存配置", detail: `W1=${cfg.w1} W2=${cfg.w2} W3=${cfg.w3}` });
    toast.success("维度配置已保存");
  };

  const RatioRow = ({ dim, cat }: { dim: keyof Cfg; cat: string }) => {
    const vals = (cfg as any)[dim][cat] as [number, number, number];
    const upd = (i: number, v: number) => {
      const next = { ...cfg } as any; next[dim] = { ...next[dim], [cat]: [...vals] }; next[dim][cat][i] = v; setCfg(next);
    };
    const sum = vals[0] + vals[1] + vals[2];
    return (
      <TableRow>
        <TableCell className="font-medium">{cat}</TableCell>
        <TableCell><Input className="w-20" type="number" disabled={!canEdit} value={vals[0]} onChange={(e) => upd(0, +e.target.value)} /></TableCell>
        <TableCell><Input className="w-20" type="number" disabled={!canEdit} value={vals[1]} onChange={(e) => upd(1, +e.target.value)} /></TableCell>
        <TableCell><Input className="w-20" type="number" disabled={!canEdit} value={vals[2]} onChange={(e) => upd(2, +e.target.value)} /></TableCell>
        <TableCell><span className={sum === 100 ? "text-success" : "text-destructive"}>{sum}%</span></TableCell>
      </TableRow>
    );
  };

  const renderDim = (dim: "courseType" | "userSource" | "convStage") => (
    <Card className="p-4">
      <Table>
        <TableHeader><TableRow><TableHead>分类</TableHead><TableHead>机构 %</TableHead><TableHead>规划师 %</TableHead><TableHead>平台 %</TableHead><TableHead>合计</TableHead></TableRow></TableHeader>
        <TableBody>{Object.keys(cfg[dim]).map(cat => <RatioRow key={cat} dim={dim} cat={cat} />)}</TableBody>
      </Table>
    </Card>
  );

  return (
    <div>
      <PageHeader title="分成维度配置" subtitle="三维度独立配置 + 权重归一" actions={
        <PermissionTip action="保存维度配置" prd="§9.2" allow={["super_admin"]} desc="保存触发机构管理员短信验证">
          <Button size="sm" disabled={!canEdit} onClick={requestSave}><Save className="h-4 w-4" /> 保存</Button>
        </PermissionTip>
      } />
      <DevNote prd="§9.2" title="维度配置">
        <div>· 三维度：课程类型 / 用户来源 / 转化阶段</div>
        <div>· 约束：W₁ + W₂ + W₃ = 1</div>
        <div>· 缺维度按原比例重新归一（如某订单缺转化阶段，则重算 W'₁ = W₁/(W₁+W₂)）</div>
        <div>· 每维度内部「机构+规划师+平台 = 100%」</div>
      </DevNote>
      <Card className="p-4 mb-4">
        <div className="font-medium mb-2">维度权重（W₁ + W₂ + W₃ = 1）</div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label className="text-xs">W₁ 课程类型</Label><Input type="number" step="0.1" disabled={!canEdit} value={cfg.w1} onChange={(e) => setCfg({ ...cfg, w1: +e.target.value })} /></div>
          <div><Label className="text-xs">W₂ 用户来源</Label><Input type="number" step="0.1" disabled={!canEdit} value={cfg.w2} onChange={(e) => setCfg({ ...cfg, w2: +e.target.value })} /></div>
          <div><Label className="text-xs">W₃ 转化阶段</Label><Input type="number" step="0.1" disabled={!canEdit} value={cfg.w3} onChange={(e) => setCfg({ ...cfg, w3: +e.target.value })} /></div>
        </div>
        <Alert className={`mt-3 ${sumW === 1 ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"}`}>
          {sumW !== 1 && <AlertTriangle className="h-4 w-4 text-destructive" />}
          <AlertDescription>当前权重和：<b>{sumW}</b> {sumW === 1 ? "✓" : "✗ 必须等于 1"}</AlertDescription>
        </Alert>
      </Card>
      <Tabs defaultValue="courseType">
        <TabsList><TabsTrigger value="courseType">课程类型</TabsTrigger><TabsTrigger value="userSource">用户来源</TabsTrigger><TabsTrigger value="convStage">转化阶段</TabsTrigger></TabsList>
        <TabsContent value="courseType">{renderDim("courseType")}</TabsContent>
        <TabsContent value="userSource">{renderDim("userSource")}</TabsContent>
        <TabsContent value="convStage">{renderDim("convStage")}</TabsContent>
      </Tabs>
      <SmsVerifyDialog open={sms} onOpenChange={setSms} title="机构管理员短信验证" scene="鼎校超管修改分成维度配置" onSuccess={onSmsSuccess} />
    </div>
  );
}
