import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/notification/inbox")({ component: () => <Placeholder title="站内信" prd="§7.2" desc="系统基础通知能力（P2）" /> });
