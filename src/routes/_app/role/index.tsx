import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/role/")({ component: () => <Placeholder title="角色管理" prd="§12" desc="4 类预定义角色权限说明；规划师/学管师数据范围已固定" /> });
