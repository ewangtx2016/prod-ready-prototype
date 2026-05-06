import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/ledger/estimated")({ component: () => <Placeholder title="预估收入" prd="§10" desc="按当前规则对待结算订单预估；标注「仅供参考」；刷新 ≤10s" /> });
