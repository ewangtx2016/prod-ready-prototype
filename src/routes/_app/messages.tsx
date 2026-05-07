import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MailOpen, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/notification/inbox")({ component: Page });

type Msg = { id: string; title: string; body: string; type: "system" | "audit" | "alert"; read: boolean; time: string };
const initial: Msg[] = [
  { id: "M1", title: "分账规则待审核", body: "鼎校超管提交了新规则「2026 Q3 续报激励规则」，请尽快审核。", type: "audit", read: false, time: "2026-04-28 16:05" },
  { id: "M2", title: "异常分账", body: "订单 O-12345 分账失败：账户余额不足", body_alt: "", type: "alert", read: false, time: "2026-04-28 14:00" } as any,
  { id: "M3", title: "本月账单已生成", body: "2026 年 4 月账单已生成，请到「已结算台账」查看。", type: "system", read: true, time: "2026-04-28 09:00" },
];

function Page() {
  const [list, setList] = useState<Msg[]>(initial);
  const [tab, setTab] = useState("all");
  const filtered = list.filter(m => tab === "all" ? true : tab === "unread" ? !m.read : m.read);
  const markRead = (id: string) => setList(list.map(m => m.id === id ? { ...m, read: true } : m));
  const markAll = () => { setList(list.map(m => ({ ...m, read: true }))); toast.success("已全部标记为已读"); };
  return (
    <div>
      <PageHeader title="站内信" subtitle="系统通知 / 审核提醒 / 异常预警" actions={<Button size="sm" variant="outline" onClick={markAll}>全部标记已读</Button>} />
      <DevNote prd="§7.2" title="站内信"><div>· 系统级基础通知能力</div><div>· 类型：system 系统 / audit 审核 / alert 预警</div></DevNote>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="all">全部 ({list.length})</TabsTrigger><TabsTrigger value="unread">未读 ({list.filter(m => !m.read).length})</TabsTrigger><TabsTrigger value="read">已读</TabsTrigger></TabsList>
        <TabsContent value={tab}>
          <div className="space-y-2">
            {filtered.map(m => (
              <Card key={m.id} className={`p-3 cursor-pointer hover:bg-muted/50 ${!m.read ? "border-l-4 border-l-primary" : ""}`} onClick={() => markRead(m.id)}>
                <div className="flex items-start gap-3">
                  {m.type === "alert" ? <AlertTriangle className="h-4 w-4 text-destructive mt-1" /> : m.read ? <MailOpen className="h-4 w-4 text-muted-foreground mt-1" /> : <Mail className="h-4 w-4 text-primary mt-1" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><span className="font-medium">{m.title}</span><Badge variant="outline" className="text-xs">{m.type === "system" ? "系统" : m.type === "audit" ? "审核" : "预警"}</Badge>{!m.read && <Badge className="bg-primary text-primary-foreground text-xs">未读</Badge>}</div>
                    <div className="text-sm text-muted-foreground mt-1">{m.body}</div>
                    <div className="text-xs text-muted-foreground mt-1">{m.time}</div>
                  </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && <Card className="py-12 text-center text-muted-foreground">暂无消息</Card>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
