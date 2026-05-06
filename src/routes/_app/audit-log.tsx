import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/audit-log")({ component: () => <Placeholder title="审计日志" prd="§4.3 / §16.5" desc="贯穿全模块的操作留痕：操作人/时间/IP/模块/动作/详情" /> });
