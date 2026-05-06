import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/ledger/refund")({ component: () => <Placeholder title="分账退回" prd="§10" desc="已结算/待结算退回明细，逆向分账" /> });
