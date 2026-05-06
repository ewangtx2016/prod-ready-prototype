import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/ledger/abnormal")({ component: () => <Placeholder title="异常台账" prd="§10.3" desc="分账失败/金额异常/账户异常/退回失败；预警机构管理员+鼎校运营" /> });
