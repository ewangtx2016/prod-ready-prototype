import { createFileRoute } from "@tanstack/react-router";
import { TemplateCrud } from "@/components/dev/TemplateCrud";
export const Route = createFileRoute("/_app/notification/sms")({ component: () => (
  <TemplateCrud storageKey="demo.tpl.sms" channel="短信" prd="§7.1" title="短信模板" subtitle="自动 / 手动短信触达配置"
    helpers={["用户姓名", "手机号", "机构名称", "课程名称", "上课时间", "授课老师", "校区", "到期日期", "续报链接", "订单金额", "分润金额", "结算月份"]}
    sample={[
      { id: "T1", key: "renewal_reminder", name: "续报提醒", content: "{{用户姓名}} 家长您好，{{课程名称}} 将于 {{到期日期}} 到期，可点击链接完成续报：{{续报链接}}", channel: "短信", auto: true, createdAt: "2026-04-01 10:00" },
      { id: "T2", key: "settlement_arrived", name: "结算到账提醒", content: "{{用户姓名}}，您 {{结算月份}} 的分润 ¥{{分润金额}} 已到账。", channel: "短信", auto: true, createdAt: "2026-04-10 09:00" },
    ]} />
)});
