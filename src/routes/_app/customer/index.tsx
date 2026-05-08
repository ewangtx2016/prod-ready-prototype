import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { db, type Order, type ServiceRecord, type LedgerItem } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { maskName, maskPhone } from "@/lib/mask";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, UserCircle2, ShoppingCart, FileText, Coins, UserCog, GraduationCap } from "lucide-react";

type Search = { phone?: string };

export const Route = createFileRoute("/_app/customer/")({
  component: Page,
  validateSearch: (s: Record<string, unknown>): Search => ({ phone: typeof s.phone === "string" ? s.phone : undefined }),
});

type Customer = {
  phone: string;
  name: string;
  orders: Order[];
  services: ServiceRecord[];
  totalAmount: number;
  lastActivity: string;
};

function buildCustomers(): Customer[] {
  const orders = db.orders();
  const services = db.services();
  const map = new Map<string, Customer>();
  const upsert = (phone: string, name: string) => {
    if (!map.has(phone)) map.set(phone, { phone, name, orders: [], services: [], totalAmount: 0, lastActivity: "" });
    return map.get(phone)!;
  };
  orders.forEach((o) => {
    const c = upsert(o.userPhone, o.userName);
    c.orders.push(o);
    if (o.status === "已支付") c.totalAmount += o.amount;
    if (o.createdAt > c.lastActivity) c.lastActivity = o.createdAt;
  });
  services.forEach((s) => {
    const c = upsert(s.userPhone, s.userName);
    c.services.push(s);
    if (s.createdAt > c.lastActivity) c.lastActivity = s.createdAt;
  });
  return [...map.values()].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

function Page() {
  const { phone } = useSearch({ from: "/_app/customer/" });
  const navigate = useNavigate({ from: "/_app/customer/" });
  const [customers, setCustomers] = useState<Customer[]>([]);
  useEffect(() => { setCustomers(buildCustomers()); }, []);
  if (phone) return <Detail phone={phone} onBack={() => navigate({ search: {} })} />;
  return <List customers={customers} onOpen={(p) => navigate({ search: { phone: p } })} />;
}

function List({ customers, onOpen }: { customers: Customer[]; onOpen: (phone: string) => void }) {
  const { role } = useApp();
  const [q, setQ] = useState("");
  const filtered = customers.filter((c) => !q.trim() || c.name.includes(q.trim()) || c.phone.includes(q.trim()));
  return (
    <div>
      <PageHeader title="用户管理" subtitle="C 端用户聚合视图：订单、服务、分润全程追溯（数据来自销售明细 + 服务记录）" />
      <DevNote prd="§关联设计" title="用户 360">· 数据自动聚合：相同手机号合并；· 聚合维度：订单 / 服务记录 / 累计金额 / 最近活动· 入口：销售明细 / 服务记录详情中点击用户名亦可跳转</DevNote>
      <div className="mb-3 flex items-end gap-3 rounded-lg border bg-card p-3">
        <div className="space-y-1 flex-1 max-w-sm">
          <Label className="text-xs text-muted-foreground">用户（姓名/手机）</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索用户" className="h-8" />
        </div>
        <div className="ml-auto text-xs text-muted-foreground">共 {filtered.length} 位用户</div>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>用户</TableHead><TableHead>手机号</TableHead>
            <TableHead className="text-right">订单</TableHead>
            <TableHead className="text-right">已支付金额</TableHead>
            <TableHead className="text-right">服务记录</TableHead>
            <TableHead>最近活动</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.phone}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold">{maskName(c.name, role).slice(0, 1)}</div>
                    {maskName(c.name, role)}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{maskPhone(c.phone, role)}</TableCell>
                <TableCell className="text-right">{c.orders.length}</TableCell>
                <TableCell className="text-right font-medium">¥{c.totalAmount.toLocaleString()}</TableCell>
                <TableCell className="text-right">{c.services.length}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.lastActivity || "-"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => onOpen(c.phone)}><UserCircle2 className="h-3.5 w-3.5" />查看 360</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Detail({ phone, onBack }: { phone: string; onBack: () => void }) {
  const { role } = useApp();
  const customer = useMemo(() => buildCustomers().find((c) => c.phone === phone), [phone]);
  const ledger: LedgerItem[] = useMemo(() => {
    if (!customer) return [];
    const ids = new Set(customer.orders.map((o) => o.id));
    return db.ledger().filter((l) => ids.has(l.orderId));
  }, [customer]);

  if (!customer) return <div className="p-6"><Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" />返回</Button><div className="mt-4 text-sm text-muted-foreground">未找到该用户</div></div>;

  const totalPlanner = ledger.reduce((s, l) => s + l.plannerAmount, 0);
  const totalOrg = ledger.reduce((s, l) => s + l.orgAmount, 0);

  // 时间线：合并订单 + 服务
  const timeline = [
    ...customer.orders.map((o) => ({ time: o.createdAt, type: "order" as const, payload: o })),
    ...customer.services.map((s) => ({ time: s.createdAt, type: "service" as const, payload: s })),
  ].sort((a, b) => b.time.localeCompare(a.time));

  return (
    <div>
      <div className="mb-3"><Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" />返回用户列表</Button></div>
      <Card className="p-5 mb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary text-xl font-semibold">{maskName(customer.name, role).slice(0, 1)}</div>
          <div className="flex-1">
            <div className="text-lg font-semibold">{maskName(customer.name, role)}</div>
            <div className="font-mono text-xs text-muted-foreground mt-0.5">{maskPhone(customer.phone, role)}</div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <Stat icon={ShoppingCart} label="订单数" value={customer.orders.length} />
            <Stat icon={Coins} label="已支付" value={`¥${customer.totalAmount.toLocaleString()}`} />
            <Stat icon={FileText} label="服务记录" value={customer.services.length} />
            <Stat icon={Coins} label="规划师分润" value={`¥${totalPlanner.toLocaleString()}`} />
          </div>
        </div>
      </Card>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">时间线</TabsTrigger>
          <TabsTrigger value="orders">订单 ({customer.orders.length})</TabsTrigger>
          <TabsTrigger value="services">服务 ({customer.services.length})</TabsTrigger>
          <TabsTrigger value="ledger">分润 ({ledger.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="rounded-lg border bg-card p-4">
          {timeline.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">暂无活动</div> : (
            <ol className="relative ml-3 border-l">
              {timeline.map((t, i) => (
                <li key={i} className="ml-4 pb-4">
                  <span className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full ${t.type === "order" ? "bg-primary" : "bg-success"}`} />
                  <div className="text-xs text-muted-foreground">{t.time}</div>
                  {t.type === "order" ? (
                    <div className="mt-1 text-sm"><Badge variant="outline" className="mr-2">订单</Badge>{(t.payload as Order).course} · ¥{(t.payload as Order).amount.toLocaleString()} · <span className="text-muted-foreground">{(t.payload as Order).status}</span></div>
                  ) : (
                    <div className="mt-1 text-sm">
                      <Badge variant="outline" className="mr-2 border-success/40 bg-success/10 text-success">服务</Badge>
                      {(t.payload as ServiceRecord).serviceType} · {(t.payload as ServiceRecord).duration} 分钟 · <span className="text-muted-foreground">{(t.payload as ServiceRecord).createdBy}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">{(t.payload as ServiceRecord).content}</div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="orders" className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>订单号</TableHead><TableHead>课程</TableHead><TableHead>类型</TableHead><TableHead>金额</TableHead><TableHead>渠道</TableHead><TableHead>状态</TableHead><TableHead>下单时间</TableHead></TableRow></TableHeader>
            <TableBody>
              {customer.orders.map((o) => (
                <TableRow key={o.id}><TableCell className="font-mono text-xs">{o.id}</TableCell><TableCell>{o.course}</TableCell><TableCell><Badge variant="outline">{o.courseType}</Badge></TableCell><TableCell>¥{o.amount.toLocaleString()}</TableCell><TableCell>{o.channel}</TableCell><TableCell><Badge variant={o.status === "已退费" ? "destructive" : o.status === "退费中" ? "secondary" : "default"}>{o.status}</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{o.createdAt}</TableCell></TableRow>
              ))}
              {customer.orders.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">暂无订单</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="services" className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>类型</TableHead><TableHead>内容</TableHead><TableHead>时长</TableHead><TableHead>关联订单</TableHead><TableHead>服务人</TableHead><TableHead>时间</TableHead></TableRow></TableHeader>
            <TableBody>
              {customer.services.map((s) => {
                const Icon = s.createdByRole === "planner" ? UserCog : GraduationCap;
                return (
                  <TableRow key={s.id}>
                    <TableCell>{s.serviceType}</TableCell>
                    <TableCell className="max-w-md text-xs">{s.content}</TableCell>
                    <TableCell>{s.duration} 分钟</TableCell>
                    <TableCell className="font-mono text-[11px]">{s.orderIds && s.orderIds.length > 0 ? s.orderIds.join(", ") : <span className="text-muted-foreground">日常跟进</span>}</TableCell>
                    <TableCell className="text-xs"><span className="inline-flex items-center gap-1"><Icon className="h-3 w-3" />{s.createdBy}</span></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.createdAt}</TableCell>
                  </TableRow>
                );
              })}
              {customer.services.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">暂无服务记录</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="ledger" className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>结算单</TableHead><TableHead>订单</TableHead><TableHead>金额</TableHead><TableHead>机构</TableHead><TableHead>规划师</TableHead><TableHead>状态</TableHead></TableRow></TableHeader>
            <TableBody>
              {ledger.map((l) => (
                <TableRow key={l.id}><TableCell className="font-mono text-xs">{l.id}</TableCell><TableCell className="font-mono text-xs">{l.orderId}</TableCell><TableCell>¥{l.amount.toLocaleString()}</TableCell><TableCell>¥{l.orgAmount.toLocaleString()}</TableCell><TableCell>¥{l.plannerAmount.toLocaleString()}</TableCell><TableCell><Badge variant="outline">{l.status}</Badge></TableCell></TableRow>
              ))}
              {ledger.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">暂无分润记录</TableCell></TableRow>}
            </TableBody>
          </Table>
          <div className="border-t p-3 text-right text-sm">机构合计：<span className="font-semibold text-info">¥{totalOrg.toLocaleString()}</span> · 规划师合计：<span className="font-semibold text-success">¥{totalPlanner.toLocaleString()}</span></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-background/60 px-3 py-2 border min-w-[100px]">
      <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><Icon className="h-3 w-3" />{label}</div>
      <div className="text-base font-semibold mt-0.5">{value}</div>
    </div>
  );
}