import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/user/groups")({ component: () => <Placeholder title="用户组" prd="§13" desc="用户组管理 + 批量角色分配" /> });
