import { createFileRoute } from "@tanstack/react-router";
import { TemplateCrud } from "@/components/dev/TemplateCrud";
export const Route = createFileRoute("/_app/notification/email")({ component: () => (
  <TemplateCrud storageKey="demo.tpl.email" channel="邮件" prd="§7.1" title="邮件模板" subtitle="邮件触达配置"
    helpers={["用户姓名", "机构名称", "课程名称", "结算月份", "订单金额", "分润金额", "到账金额", "操作链接"]}
    sample={[{ id: "T1", key: "monthly_statement", name: "月度账单", content: "{{用户姓名}} 您好，{{结算月份}} 账单明细已生成，到账金额 ¥{{到账金额}}，详情请查看：{{操作链接}}", channel: "邮件", auto: true, createdAt: "2026-04-01 10:00" }]} />
)});
