import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/ledger/settled")({ component: () => <Placeholder title="已结算台账" prd="§10" desc="已结算金额与明细；支持按周/月/季度筛选；导出走脱敏规则" /> });
