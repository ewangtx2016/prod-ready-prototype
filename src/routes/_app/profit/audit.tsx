import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/profit/audit")({ component: () => <Placeholder title="规则审核" prd="§9.3" desc="机构管理员审核鼎校超管提交的分成规则；驳回需填原因" /> });
