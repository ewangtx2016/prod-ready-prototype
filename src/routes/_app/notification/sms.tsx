import { createFileRoute } from "@tanstack/react-router";
import { TemplateCrud } from "@/components/dev/TemplateCrud";
export const Route = createFileRoute("/_app/notification/sms")({ component: () => (
  <TemplateCrud storageKey="demo.tpl.sms" channel="短信" prd="§7.1" title="短信模板" subtitle="自动 / 手动短信触达配置" helpers={["{userName}", "{course}", "{date}"]}
    sample={[
      { id: "T1", name: "续报提醒", content: "{userName} 家长您好，{course} 即将到期，可点击链接完成续报：{link}", channel: "短信", auto: true, createdAt: "2026-04-01 10:00" },
      { id: "T2", name: "结算到账提醒", content: "{userName}，您本月分成 ¥{amount} 已到账。", channel: "短信", auto: true, createdAt: "2026-04-10 09:00" },
    ]} />
)});
