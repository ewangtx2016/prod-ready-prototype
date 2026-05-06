import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/notification/sms")({ component: () => <Placeholder title="短信模板" prd="§7.1" desc="短信触达配置：创建/编辑/删除，自动/手动发送，触达内容/时间/结果留痕" /> });
