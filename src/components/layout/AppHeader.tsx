import { useApp } from "@/lib/store";
import { ROLE_LIST, ROLE_META } from "@/lib/roles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { toast } from "sonner";

const PATH_LABEL: Record<string, string> = {
  dashboard: "数据看板", service: "服务管理", records: "服务列表", audit: "服务审核", settings: "系统设置",
  notification: "通知管理", templates: "通知模板", "virtual-no": "虚拟号", sms: "短信模板", wechat: "社群模板", email: "邮件模板", inbox: "站内信",
  sales: "销售管理", profit: "分成管理", rules: "分成规则", dimensions: "维度配置",
  ledger: "台账管理", settled: "已结算", pending: "待结算", estimated: "预估收入", refund: "分账退回", abnormal: "异常台账",
  org: "机构信息", ip: "IP 白名单", backup: "备份设置", "notification-events": "通知事件",
  role: "角色管理", user: "用户管理", accounts: "后台账号",
  "audit-log": "审计日志",
};

export function AppHeader() {
  const { role, setRole } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const segments = path.split("/").filter(Boolean);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">首页</Link>
        {segments.map((s, i) => (
          <span key={i} className="flex items-center gap-1">
            <span>/</span>
            <span className={i === segments.length - 1 ? "text-foreground font-medium" : ""}>{PATH_LABEL[s] || s}</span>
          </span>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border bg-warning/10 px-2 py-1">
          <span className="text-xs text-muted-foreground">演示身份</span>
          <Select value={role} onValueChange={(v) => { setRole(v as any); toast.success(`切换为 ${ROLE_META[v as keyof typeof ROLE_META].name}`); }}>
            <SelectTrigger className="h-7 w-32 border-0 bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_LIST.map((r) => (
                <SelectItem key={r} value={r}>
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${ROLE_META[r].color}`} />
                    {ROLE_META[r].name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="icon" variant="ghost" onClick={() => nav({ to: "/messages" })} title="我的消息"><Bell className="h-4 w-4" /></Button>
        <div className="flex items-center gap-2 pl-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-xs text-primary">{ROLE_META[role].name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{ROLE_META[role].name}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => nav({ to: "/login" })}>
          <LogOut className="h-4 w-4" /> 退出
        </Button>
      </div>
    </header>
  );
}