import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dev/Placeholder";
export const Route = createFileRoute("/_app/profit/dimensions")({ component: () => <Placeholder title="分成维度配置" prd="§9.2" desc="三维度配置：课程类型/用户来源/转化阶段；权重归一 W1+W2+W3=1；缺维度按原比例重新归一" /> });
