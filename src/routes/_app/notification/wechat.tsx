import { createFileRoute } from "@tanstack/react-router";
import { TemplateCrud } from "@/components/dev/TemplateCrud";
export const Route = createFileRoute("/_app/notification/wechat")({ component: () => (
  <TemplateCrud storageKey="demo.tpl.wechat" channel="社群" prd="§7.1" title="社群/微信模板" subtitle="微信公众号 / 企业微信模板消息" helpers={["{userName}", "{course}", "{teacher}"]}
    sample={[{ id: "T1", name: "上课提醒", content: "{userName} 同学，{course} 将于今晚 {time} 开课，老师：{teacher}", channel: "社群", auto: true, createdAt: "2026-04-01 10:00" }]} />
)});
