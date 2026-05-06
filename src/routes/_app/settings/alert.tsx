import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/settings/alert")({ component: () => <Placeholder title="操作预警" prd="§11.3" desc="敏感操作预警阈值与通知对象配置" /> });
