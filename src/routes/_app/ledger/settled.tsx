import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type LedgerItem } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { maskName } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { PermissionTip } from "@/components/dev/PermissionTip";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Coins } from "lucide-react";
import { SplitDetailSheet } from "@/components/ledger/SplitDetailSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ledger/settled")({ component: Page });

function Page() {
  const { role } = useApp();
  const [list, setList] = useState<LedgerItem[]>([]);
  const [period, setPeriod] = useState("month");
  const [detail, setDetail] = useState<LedgerItem | null>(null);
  useEffect(() => {
    let arr = db.ledger().filter(l => l.status === "settled");
    if (role === "planner") arr = arr.filter(l => l.plannerName === "李规划");
    setList(arr);
  }, [role]);

  const total = list.reduce((s, x) => s + x.amount, 0);
  const orgTotal = list.reduce((s, x) => s + x.orgAmount, 0);
  const planTotal = list.reduce((s, x) => s + x.plannerAmount, 0);

  const onExport = () => {
    db.log({ operator: ROLE_META[role].name, role: ROLE_META[role].name, module: "已结算台账", action: "导出", detail: `${list.length} 条 (脱敏)` });
    toast.success("已导出 settled.xlsx (脱敏，敏感信息已隐藏)");
  };

  return (
    <div>
      <PageHeader title="已结算台账" subtitle="查看已完成分账的订单结算明细" actions={
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="week">本周</SelectItem><SelectItem value="month">本月</SelectItem><SelectItem value="quarter">本季度</SelectItem></SelectContent></Select>
          <PermissionTip action="导出已结算" prd="§10 / §16.5" allow={["org_admin", "planner"]} desc="导出走脱敏规则">
            <Button size="sm" onClick={onExport}><Download className="h-4 w-4" /> 导出</Button>
          </PermissionTip>
        </div>
      } />
      <DevNote prd="§10" title="已结算台账">
        <div>· 数据来源：分账成功事件回调 (准实时)</div>
        <div>· 周期筛选：本周 / 本月 / 本季度（PRD 默认 = 本月）</div>
        <div>· 导出：按当前筛选项导出 .xlsx；非机构管理员仅看到脱敏数据</div>
      </DevNote>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">订单总额</div><div className="text-2xl font-semibold mt-1">¥{total.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">机构分成</div><div className="text-2xl font-semibold mt-1 text-info">¥{orgTotal.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">规划师分成</div><div className="text-2xl font-semibold mt-1 text-success">¥{planTotal.toLocaleString()}</div></Card>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>结算单号</TableHead><TableHead>订单号</TableHead><TableHead>用户</TableHead><TableHead>课程</TableHead><TableHead>订单金额</TableHead><TableHead>机构</TableHead><TableHead>规划师</TableHead><TableHead>平台</TableHead><TableHead>结算时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.id}</TableCell>
                <TableCell className="font-mono text-xs">{l.orderId}</TableCell>
                <TableCell>{maskName(l.userName, role)}</TableCell>
                <TableCell>{l.course}</TableCell>
                <TableCell>¥{l.amount.toLocaleString()}</TableCell>
                <TableCell className="text-info">¥{l.orgAmount.toLocaleString()}</TableCell>
                <TableCell className="text-success">¥{l.plannerAmount.toLocaleString()}</TableCell>
                <TableCell>¥{l.platformAmount.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.settledAt || "-"}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setDetail(l)}><Coins className="h-3.5 w-3.5" /> 分成明细</Button></TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={10} className="py-12 text-center text-muted-foreground">暂无已结算数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <SplitDetailSheet item={detail} onOpenChange={(v) => !v && setDetail(null)} />
    </div>
  );
}
