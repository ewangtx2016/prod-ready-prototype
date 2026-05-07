import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, Bell, ShoppingCart, PieChart, BookOpen,
  Settings, ShieldCheck, Users, History, ChevronDown,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { MENU_PERMS, SUBMENU_PERMS } from "@/lib/roles";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; key: string };
type Group = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; children: Item[] };

const GROUPS: Group[] = [
  { key: "dashboard", label: "数据看板", icon: LayoutDashboard, children: [{ to: "/dashboard", label: "数据看板", icon: LayoutDashboard, key: "dashboard" }] },
  { key: "service", label: "服务记录", icon: FileText, children: [
    { to: "/service/records", label: "服务列表", icon: FileText, key: "service" },
    { to: "/service/settings", label: "审核模式", icon: Settings, key: "service" },
  ] },
  { key: "notification", label: "通知管理", icon: Bell, children: [
    { to: "/notification/virtual-no", label: "虚拟号", icon: Bell, key: "notification" },
    { to: "/notification/sms", label: "短信模板", icon: Bell, key: "notification" },
    { to: "/notification/wechat", label: "社群模板", icon: Bell, key: "notification" },
    { to: "/notification/email", label: "邮件模板", icon: Bell, key: "notification" },
    { to: "/notification/inbox", label: "站内信", icon: Bell, key: "notification" },
  ] },
  { key: "sales", label: "销售管理", icon: ShoppingCart, children: [{ to: "/sales", label: "销售明细", icon: ShoppingCart, key: "sales" }] },
  { key: "profit", label: "分成管理", icon: PieChart, children: [
    { to: "/profit/rules", label: "分成规则", icon: PieChart, key: "profit" },
    { to: "/profit/dimensions", label: "维度配置", icon: PieChart, key: "profit" },
  ] },
  { key: "ledger", label: "台账管理", icon: BookOpen, children: [
    { to: "/ledger/settled", label: "已结算", icon: BookOpen, key: "ledger" },
    { to: "/ledger/pending", label: "待结算", icon: BookOpen, key: "ledger" },
    { to: "/ledger/estimated", label: "预估收入", icon: BookOpen, key: "ledger" },
    { to: "/ledger/refund", label: "分账退回", icon: BookOpen, key: "ledger" },
    { to: "/ledger/abnormal", label: "异常台账", icon: BookOpen, key: "ledger" },
  ] },
  { key: "settings", label: "系统设置", icon: Settings, children: [
    { to: "/settings/org", label: "机构信息", icon: Settings, key: "settings" },
    { to: "/settings/ip", label: "IP 白名单", icon: Settings, key: "settings" },
    { to: "/settings/backup", label: "备份设置", icon: Settings, key: "settings" },
    { to: "/settings/alert", label: "操作预警", icon: Settings, key: "settings" },
    { to: "/settings/notification-events", label: "通知事件", icon: Settings, key: "settings" },
  ] },
  { key: "role", label: "角色管理", icon: ShieldCheck, children: [{ to: "/role", label: "角色管理", icon: ShieldCheck, key: "role" }] },
  { key: "user", label: "用户管理", icon: Users, children: [
    { to: "/user/accounts", label: "后台账号", icon: Users, key: "user" },
  ] },
  { key: "audit", label: "审计日志", icon: History, children: [{ to: "/audit-log", label: "审计日志", icon: History, key: "audit" }] },
];

export function AppSidebar() {
  const { role } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const visible = GROUPS
    .filter((g) => MENU_PERMS[g.key]?.includes(role))
    .map((g) => ({
      ...g,
      children: g.children.filter((c) => {
        const perms = SUBMENU_PERMS[c.to];
        return perms ? perms.includes(role) : true;
      }),
    }))
    .filter((g) => g.children.length > 0);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold text-sm">鼎</div>
        <span className="text-sm font-semibold">鼎校管理后台</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 text-sm">
        {visible.map((g) => (
          <Group key={g.key} group={g} currentPath={path} />
        ))}
      </nav>
      <div className="border-t p-3 text-[10px] text-muted-foreground">
        v1.0 · 高保真原型
      </div>
    </aside>
  );
}

function Group({ group, currentPath }: { group: Group; currentPath: string }) {
  const isActive = group.children.some((c) => currentPath === c.to);
  const [open, setOpen] = useState(isActive || group.children.length === 1);
  const Icon = group.icon;
  if (group.children.length === 1) {
    const c = group.children[0];
    return (
      <Link
        to={c.to}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-foreground/80 hover:bg-accent",
          currentPath === c.to && "bg-accent text-accent-foreground font-medium"
        )}
      >
        <Icon className="h-4 w-4" /> {c.label}
      </Link>
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-accent", isActive && "text-accent-foreground")}
      >
        <Icon className="h-4 w-4" />
        <span>{group.label}</span>
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && (
        <div className="ml-2 border-l pl-2">
          {group.children.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-foreground/70 hover:bg-accent",
                currentPath === c.to && "bg-accent text-accent-foreground font-medium"
              )}
            >
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}