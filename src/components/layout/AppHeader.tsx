import { useApp } from "@/lib/store";
import { ROLE_META } from "@/lib/roles";
import { Bell, LogOut, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

const PATH_LABEL: Record<string, string> = {
  dashboard: "数据看板", service: "服务管理", records: "服务列表", audit: "服务审核", settings: "系统设置",
  notification: "通知管理", templates: "通知模板", "virtual-no": "虚拟号", sms: "短信模板", wechat: "社群模板", email: "邮件模板", inbox: "站内信",
  sales: "销售管理", profit: "分成管理", rules: "分成规则", dimensions: "维度配置",
  ledger: "台账管理", settled: "已结算", pending: "待结算", estimated: "预估收入", refund: "分账退回", abnormal: "异常台账",
  org: "机构信息", ip: "IP 白名单", "notification-events": "通知事件",
  role: "角色管理", user: "用户管理", accounts: "后台账号",
  "audit-log": "审计日志",
};

export function AppHeader() {
  const { role } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const segments = path.split("/").filter(Boolean);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdData, setPwdData] = useState({ old: "", n1: "", n2: "" });

  const doPwd = () => {
    if (!pwdData.old || !pwdData.n1) { toast.error("请填写完整"); return; }
    if (pwdData.n1 !== pwdData.n2) { toast.error("两次新密码不一致"); return; }
    if (pwdData.n1.length < 8) { toast.error("密码至少 8 位"); return; }
    toast.success("密码已重置");
    setPwdOpen(false);
    setPwdData({ old: "", n1: "", n2: "" });
  };

  return (
    <>
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
          <Button size="icon" variant="ghost" onClick={() => nav({ to: "/messages" })} title="我的消息"><Bell className="h-4 w-4" /></Button>
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
              <DropdownMenuItem onClick={() => setPwdOpen(true)}>
                <KeyRound className="h-4 w-4" /> 修改密码
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => nav({ to: "/login" })}>
                <LogOut className="h-4 w-4" /> 退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 修改密码弹窗 */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>新密码至少 8 位，需包含字母与数字</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>当前密码</Label><Input type="password" value={pwdData.old} onChange={(e) => setPwdData({ ...pwdData, old: e.target.value })} /></div>
            <div><Label>新密码</Label><Input type="password" value={pwdData.n1} onChange={(e) => setPwdData({ ...pwdData, n1: e.target.value })} /></div>
            <div><Label>确认新密码</Label><Input type="password" value={pwdData.n2} onChange={(e) => setPwdData({ ...pwdData, n2: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(false)}>取消</Button>
            <Button onClick={doPwd}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}