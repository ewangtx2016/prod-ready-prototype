import { createFileRoute } from "@tanstack/react-router";
import { TemplateCrud } from "@/components/dev/TemplateCrud";
export const Route = createFileRoute("/_app/notification/email")({ component: () => (
  <TemplateCrud storageKey="demo.tpl.email" channel="邮件" prd="§7.1" title="邮件模板" subtitle="邮件触达配置" helpers={["{userName}", "{course}", "{amount}"]}
    sample={[{ id: "T1", key: "monthly_statement", name: "月度账单", content: "{userName} 您好，附件为本月账单明细。", channel: "邮件", auto: true, createdAt: "2026-04-01 10:00" }]} />
)});
