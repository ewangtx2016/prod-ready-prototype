import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PATH_LABEL: Record<string, string> = {
  dashboard: "数据看板", service: "服务管理", records: "服务管理", audit: "服务审核", settings: "系统设置",
  notification: "通知管理", templates: "通知模板", "virtual-no": "虚拟号", sms: "短信模板", wechat: "社群模板", email: "邮件模板", inbox: "站内信",
  sales: "销售管理", profit: "分成管理", rules: "分成规则", dimensions: "维度配置",
  ledger: "台账管理", settled: "已结算", pending: "待结算", estimated: "预估收入", refund: "分账退回", abnormal: "异常台账",
  org: "机构信息", ip: "IP 白名单", "notification-events": "通知事件",
  role: "角色管理", user: "用户管理", accounts: "后台账号",
  "audit-log": "日志管理",
  student: "学员管理",
};

/** 动态路由参数 → 面包屑显示文本 */
const DYNAMIC_LABEL: Record<string, string> = {
  "$id": "学员详情",
};

/** 根据当前段构造可点击的前置路径 */
function buildPathTo(segments: string[], index: number): string {
  return "/" + segments.slice(0, index + 1).join("/");
}

export function AppHeader() {
  const { role } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const segments = path.split("/").filter(Boolean);

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b bg-card px-4">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground">首页</Link>
          {segments.map((s, i) => {
            const isLast = i === segments.length - 1;
            const label = DYNAMIC_LABEL[s] || PATH_LABEL[s] || s;
            const pathTo = buildPathTo(segments, i);
            const isDynamic = s.startsWith("$") || /^[a-zA-Z0-9]{8}$/.test(s);
            return (
              <span key={i} className="flex items-center gap-1">
                <span className="text-muted-foreground/50">/</span>
                {isLast || isDynamic ? (
                  <span className={isLast ? "text-foreground font-medium" : ""}>{label}</span>
                ) : (
                  <Link to={pathTo} className="hover:text-foreground">{label}</Link>
                )}
              </span>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-2 cursor-pointer hover:bg-accent rounded-sm px-2 py-1 transition-colors">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">{ROLE_META[role].name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{ROLE_META[role].name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => nav({ to: "/login" })}>
                <LogOut className="h-4 w-4" /> 退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}