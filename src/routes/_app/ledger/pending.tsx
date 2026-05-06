import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/ledger/pending")({ component: () => <Placeholder title="待结算台账" prd="§10" desc="待结算金额与明细" /> });
