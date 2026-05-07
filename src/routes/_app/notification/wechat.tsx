import { createFileRoute } from "@tanstack/react-router";
import { TemplateCrud } from "@/components/dev/TemplateCrud";
export const Route = createFileRoute("/_app/notification/wechat")({ component: () => (
  <TemplateCrud storageKey="demo.tpl.wechat" channel="社群" prd="§7.1" title="社群/微信模板" subtitle="微信公众号 / 企业微信模板消息"
    helpers={["用户姓名", "机构名称", "课程名称", "上课时间", "授课老师", "校区", "到期日期", "续报链接", "操作链接"]}
    sample={[{ id: "T1", key: "class_start_notice", name: "上课提醒", content: "{{用户姓名}} 同学，{{课程名称}} 将于 {{上课时间}} 在 {{校区}} 开课，老师：{{授课老师}}", channel: "社群", auto: true, createdAt: "2026-04-01 10:00" }]} />
)});
