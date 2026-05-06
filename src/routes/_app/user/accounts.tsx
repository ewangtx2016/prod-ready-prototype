import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/user/accounts")({ component: () => <Placeholder title="后台账号" prd="§13" desc="管理后台账号；分配角色（单账号单角色）" /> });
