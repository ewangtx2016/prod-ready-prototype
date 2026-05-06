import { PageHeader } from "./PageHeader";
import { DevNote } from "./DevNote";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function Placeholder({ title, prd, desc, perms }: { title: string; prd: string; desc: string; perms?: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle={desc} />
      <DevNote prd={prd} title={title}>
        <div>{desc}</div>
        {perms && <div>· 权限：{perms}</div>}
      </DevNote>
      <Card className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <Construction className="h-10 w-10 text-warning" />
        <div>本页面为原型占位 — 字段与交互细节请参考 PRD {prd}</div>
        <div className="text-xs">完整可交互演示页：数据看板、服务记录、服务审核、审核模式、销售明细、分成规则</div>
      </Card>
    </div>
  );
}