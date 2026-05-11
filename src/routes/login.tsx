import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ROLE_LIST, ROLE_META, type Role } from "@/lib/roles";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { LogIn, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const { setRole } = useApp();
  const nav = useNavigate();
  const [pwd, setPwd] = useState("");

  const loginAs = (r: Role) => {
    setRole(r);
    toast.success(`已以「${ROLE_META[r].name}」身份登录`);
    nav({ to: r === "tutor" ? "/service/records" : "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-info/10 p-6">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
        <div className="hidden flex-col justify-center gap-4 p-8 lg:flex">
          <div className="flex items-center gap-2 text-primary">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">鼎</div>
            <span className="text-xl font-semibold">鼎校 · 机构用户全生命周期管理系统</span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight">
            机构用户资产保险柜
            <br />+ 规划师服务展示台
          </h1>
          <p className="text-muted-foreground">
            在不丧失用户资产控制权的前提下，引入规划师与学管师完成用户服务、转化、分成结算与审计追溯。
          </p>
          <div className="rounded-lg border border-info/30 bg-info/5 p-4 text-sm">
            <div className="mb-1 flex items-center gap-1 font-medium text-info">
              <Sparkles className="h-4 w-4" />
              原型演示说明
            </div>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>本系统为 PRD v1.0 的高保真可交互原型</li>
              <li>请通过右侧选择角色一键登录，登录后顶栏可随时切换身份</li>
              <li>所有按钮带「权限注释」鼠标悬停查看</li>
              <li>短信验证码输入任意 6 位数字即通过</li>
            </ul>
          </div>
        </div>

        <Card className="p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">登录后台</h2>
            <p className="mt-1 text-sm text-muted-foreground">选择演示身份一键登录</p>
          </div>
          <div className="space-y-3 mb-6">
            <div>
              <Label>账号</Label>
              <Input defaultValue="demo@dingxiao.com" disabled />
            </div>
            <div>
              <Label>密码</Label>
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="演示模式无需输入" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">选择身份登录：</div>
            {ROLE_LIST.map((r) => (
              <Button
                key={r}
                variant="outline"
                className="w-full justify-between"
                onClick={() => loginAs(r)}
              >
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${ROLE_META[r].color}`} />
                  {ROLE_META[r].name}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <LogIn className="h-3 w-3" />
                  一键登录
                </span>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}