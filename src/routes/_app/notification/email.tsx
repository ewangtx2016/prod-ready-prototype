import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/notification/email")({ component: () => <Placeholder title="邮件模板" prd="§7.1" desc="邮件通知模板：创建/编辑/删除" /> });
