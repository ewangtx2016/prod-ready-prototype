import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

/** 短信验证弹框（PRD §9.1.3） — 验证码 10 分钟有效，输错 3 次锁定 30 分钟。原型：任意 6 位数字通过。 */
export function SmsVerifyDialog({
  open,
  onOpenChange,
  title,
  scene,
  phone = "138****5678（机构管理员）",
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  scene: string;
  phone?: string;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [errors, setErrors] = useState(0);

  useEffect(() => {
    if (open) {
      setCode("");
      setErrors(0);
      setCountdown(60);
    }
  }, [open]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const submit = () => {
    if (!/^\d{6}$/.test(code)) {
      toast.error("请输入 6 位数字验证码");
      return;
    }
    // 原型：任意 6 位即通过
    if (code === "000000") {
      const n = errors + 1;
      setErrors(n);
      if (n >= 3) {
        toast.error("连续输错 3 次，账号已锁定 30 分钟");
        onOpenChange(false);
        return;
      }
      toast.error(`验证码错误（${n}/3）`);
      return;
    }
    toast.success("短信验证通过");
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{scene}</DialogDescription>
        </DialogHeader>
        <Alert className="border-warning/40 bg-warning/10">
          <AlertDescription className="text-xs">
            <b>PRD §9.1.3：</b>验证码 10 分钟有效，连续输错 3 次锁定 30 分钟。
            <br />
            <span className="text-info">演示提示：任意 6 位数字均可通过；输入 <code className="font-mono">000000</code> 模拟错误。</span>
          </AlertDescription>
        </Alert>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">系统已向 <b>{phone}</b> 发送 6 位验证码</div>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6 位验证码"
              className="font-mono tracking-widest"
              autoFocus
            />
            <Button
              variant="outline"
              disabled={countdown > 0}
              onClick={() => {
                setCountdown(60);
                toast.success("验证码已重新发送");
              }}
            >
              {countdown > 0 ? `${countdown}s` : "重新发送"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}