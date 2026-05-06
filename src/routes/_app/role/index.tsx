import { createFileRoute } from "@tanstack/react-router";
import { ROLE_META, ROLE_LIST, MENU_PERMS } from "@/lib/roles";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/_app/role/")({ component: Page });

const MENU_LABELS: Record<string, string> = {
  dashboard: "数据看板", service: "服务记录", notification: "触达通知", sales: "销售明细", profit: "分成管理", ledger: "台账", settings: "系统设置", role: "角色管理", user: "账号管理", audit: "审核日志",
};

function Page() {
  return (
    <div>
      <PageHeader title="角色管理" subtitle="4 类预定义角色 + 菜单权限矩阵（数据范围已固化）" />
      <DevNote prd="§12 / §14" title="角色管理">
        <div>· 系统提供 4 类预定义角色，单账号单角色</div>
        <div>· 规划师 = 仅本人服务用户；学管师 = 仅被分配用户（数据范围固化，不可配置）</div>
        <div>· 按钮级权限矩阵详见 <code>src/lib/roles.ts → can()</code></div>
      </DevNote>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {ROLE_LIST.map(r => (
          <Card key={r} className="p-4">
            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs text-white ${ROLE_META[r].color}`}>{ROLE_META[r].short}</div>
            <div className="mt-2 font-medium">{ROLE_META[r].name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{ROLE_META[r].desc}</div>
          </Card>
        ))}
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>菜单 / 模块</TableHead>{ROLE_LIST.map(r => <TableHead key={r} className="text-center">{ROLE_META[r].short}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {Object.entries(MENU_PERMS).map(([menu, allowed]) => (
              <TableRow key={menu}>
                <TableCell className="font-medium">{MENU_LABELS[menu] || menu}</TableCell>
                {ROLE_LIST.map(r => <TableCell key={r} className="text-center">{allowed.includes(r) ? <Check className="inline h-4 w-4 text-success" /> : <X className="inline h-4 w-4 text-muted-foreground" />}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="mt-4 p-4 text-xs text-muted-foreground">
        <div className="font-medium text-foreground mb-1">数据范围说明（PRD §16）</div>
        <div>· <Badge variant="outline">规划师</Badge>：仅本人服务/转化用户的服务记录、销售明细、分成数据</div>
        <div>· <Badge variant="outline">学管师</Badge>：仅被规划师分配的用户的服务记录</div>
        <div>· <Badge variant="outline">机构管理员</Badge>：本机构全部数据 + 明文敏感字段</div>
        <div>· <Badge variant="outline">鼎校超管</Badge>：跨机构配置 + 默认脱敏</div>
      </Card>
    </div>
  );
}
