import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { LogOut, Download, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db, type AsyncExportTask } from "@/lib/mock";
import { useMemo } from "react";
import { toast } from "sonner";

const PATH_LABEL: Record<string, string> = {
  dashboard: "数据看板", service: "服务管理", records: "服务管理", audit: "服务审核", settings: "系统设置",
  notification: "通知管理", templates: "通知模板", "virtual-no": "虚拟号", sms: "短信模板", wechat: "社群模板", email: "邮件模板", inbox: "站内信",
  sales: "销售管理", profit: "分成管理", rules: "分成规则", dimensions: "维度配置",
  ledger: "资金账单", settled: "已结算", pending: "待结算", estimated: "预估收入", refund: "分账退回", abnormal: "异常台账",
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

const STATUS_META: Record<AsyncExportTask["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "处理中", variant: "outline" },
  success: { label: "成功", variant: "default" },
  failed: { label: "失败", variant: "destructive" },
};

function ExportTaskPopover() {
  const tasks = useMemo(() => db.exportTasks().slice(0, 20), []);
  const pendingCount = tasks.filter((t) => t.status === "pending").length;

  const onDownload = (task: AsyncExportTask) => {
    if (task.status !== "success" || !task.fileName) {
      toast.error("任务未完成，暂不可下载");
      return;
    }
    toast.success(`已开始下载 ${task.fileName}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors">
          <Download className="h-4 w-4 text-muted-foreground" />
          {pendingCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-medium">导出任务</span>
          <span className="text-xs text-muted-foreground">共 {tasks.length} 条</span>
        </div>
        <ScrollArea className="h-[360px]">
          <div className="divide-y">
            {tasks.map((task) => {
              const meta = STATUS_META[task.status];
              return (
                <div key={task.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{task.taskName}</span>
                    <Badge variant={meta.variant} className="text-[10px] h-5">
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Progress value={task.progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {task.progress}%
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {task.createdAt}
                    </span>
                    {task.status === "success" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => onDownload(task)}
                      >
                        下载
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {tasks.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                暂无导出任务
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function AppHeader() {
  const { role } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const segments = path.split("/").filter(Boolean);

  return (
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
        <ExportTaskPopover />
        <a
          href="http://192.168.100.110/platform/#/home/home-child"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="打开鼎团团管理平台"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          鼎团团管理平台
        </a>
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
  );
}
