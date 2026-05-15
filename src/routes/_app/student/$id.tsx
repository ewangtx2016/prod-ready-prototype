import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { db, type Student, type ArchiveChangeLog, type FollowUpRecord, type Parent, type HistoryPlanner } from "@/lib/mock";
import { PageHeader } from "@/components/dev/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePagination } from "@/components/dev/TablePagination";
import { ArrowLeft, Search, Play, Eye } from "lucide-react";

export const Route = createFileRoute("/_app/student/$id")({ component: Page });

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "待服务", className: "bg-amber-50 text-amber-700 border-amber-200" },
  serving: { label: "服务中", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  expired: { label: "已过期", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_MAP[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={`${meta.className} text-xs font-normal`}>{meta.label}</Badge>;
}

function calcAge(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years < 0) return "0岁";
  return months > 0 ? `${years}岁${months}个月` : `${years}岁`;
}

function Page() {
  const { id } = Route.useParams();
  const student = useMemo(() => db.students().find((s) => s.id === id), [id]);
  const [activeTab, setActiveTab] = useState("archive");

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-muted-foreground">学员不存在</div>
        <Link to="/student">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" />返回列表</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="学员详情"
        subtitle={`${student.name} · ${student.studentNo}`}
        actions={
          <Link to="/student">
            <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />返回列表</Button>
          </Link>
        }
      />

      {/* 学员基本信息 */}
      <Card className="mb-4 p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium border-l-2 border-primary pl-3">
          学员基本信息
        </div>
        <div className="flex gap-6">
          {/* 头像 */}
          <div className="shrink-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-semibold">
              {student.name.charAt(0)}
            </div>
          </div>
          {/* 信息网格 */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-6 text-sm">
            <InfoItem label="姓名" value={student.name} />
            <InfoItem label="性别" value={student.gender} />
            <InfoItem label="出生日期" value={student.birthDate} />
            <InfoItem label="年龄" value={calcAge(student.birthDate)} />
            <InfoItem label="学校" value={student.school} />
            <InfoItem label="学员编号" value={student.studentNo} />
            <InfoItem label="年级" value={student.grade} />
            <InfoItem label="学习机账号" value={student.learningMachineAccount ?? "--"} />
            <InfoItem label="设备绑定码" value={student.deviceBindCode ?? "--"} />
            <div />
            <InfoItem label="学员假期类型" value={student.holidayType ?? "--"} />
            <InfoItem label="学员假期时间" value={student.holidayTime ?? "--"} />
            <InfoItem label="会员账号" value={student.memberAccount ?? "--"} />
            <InfoItem label="是否平板会员" value={student.isTabletMember ? "是" : "否"} />
            <InfoItem label="会员类型" value={student.memberType ?? "--"} />
            <InfoItem label="会员时长" value={student.memberDuration ?? "--"} />
          </div>
        </div>
      </Card>

      {/* 权益信息 */}
      <Card className="mb-4 p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium border-l-2 border-primary pl-3">
          权益信息
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-6 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1">权益状态</div>
            <StatusBadge status={student.status} />
          </div>
          <InfoItem label="所属学管师" value={student.tutorName} />
          <InfoItem label="权益时间" value={student.benefitStartDate && student.benefitEndDate ? `${student.benefitStartDate} 至 ${student.benefitEndDate}` : "--"} />
          <InfoItem label="权益时长" value={student.remainingDays != null ? `${student.remainingDays}天` : "--"} />
          <InfoItem label="所属规划师" value={student.plannerName} />
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="archive">档案修改记录</TabsTrigger>
          <TabsTrigger value="followup">跟进记录</TabsTrigger>
          <TabsTrigger value="parents">家长信息</TabsTrigger>
          <TabsTrigger value="history">历史规划师</TabsTrigger>
        </TabsList>

        <TabsContent value="archive">
          <ArchiveChangeLogTab logs={student.archiveChangeLogs ?? []} />
        </TabsContent>
        <TabsContent value="followup">
          <FollowUpRecordTab records={student.followUpRecords ?? []} />
        </TabsContent>
        <TabsContent value="parents">
          <ParentsTab parents={student.parents ?? []} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryPlannersTab planners={student.historyPlanners ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

/* ========== 档案修改记录 Tab ========== */
function ArchiveChangeLogTab({ logs }: { logs: ArchiveChangeLog[] }) {
  const [fOpId, setFOpId] = useState("");
  const filtered = logs.filter((l) => !fOpId.trim() || l.operatorId.includes(fOpId.trim()));
  const { paged, Pagination } = usePagination(filtered, 10);

  return (
    <Card>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">操作人ID</Label>
          <Input value={fOpId} onChange={(e) => setFOpId(e.target.value)} placeholder="输入操作人ID" className="h-8 w-48" />
        </div>
        <Button size="sm"><Search className="h-3.5 w-3.5 mr-1" />查询</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>记录ID</TableHead>
            <TableHead>操作人</TableHead>
            <TableHead>操作人ID</TableHead>
            <TableHead>操作人角色</TableHead>
            <TableHead>操作时间</TableHead>
            <TableHead>操作内容</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-mono text-xs">{l.id}</TableCell>
              <TableCell>{l.operator}</TableCell>
              <TableCell className="font-mono text-xs">{l.operatorId}</TableCell>
              <TableCell>{l.operatorRole}</TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.operationTime}</TableCell>
              <TableCell className="text-sm">{l.content}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5 mr-1" />查看</Button>
              </TableCell>
            </TableRow>
          ))}
          {paged.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">暂无数据</TableCell></TableRow>}
        </TableBody>
      </Table>
      <Pagination />
    </Card>
  );
}

/* ========== 跟进记录 Tab ========== */
function FollowUpRecordTab({ records }: { records: FollowUpRecord[] }) {
  return (
    <Card className="p-4">
      <div className="relative pl-6">
        {/* 时间线竖线 */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
        {records.map((r, idx) => (
          <div key={r.id} className="relative mb-6 last:mb-0">
            {/* 圆点 */}
            <div className="absolute -left-[25px] top-1 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background" />
            <div className="text-sm font-medium text-muted-foreground mb-2">{r.time}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-2">
              <div><span className="text-muted-foreground">{r.operatorRole}：</span>{r.operatorName}</div>
              <div><span className="text-muted-foreground">跟进记录ID：</span>{r.recordId}</div>
              <div><span className="text-muted-foreground">跟进类型：</span>{r.type}</div>
              <div><span className="text-muted-foreground">关联的待办ID：</span>{r.relatedTodoId}</div>
            </div>
            <div className="text-sm mb-2">
              <span className="text-muted-foreground">跟进内容：</span>{r.content}
            </div>
            {r.attachments && r.attachments.length > 0 && (
              <div className="flex gap-2">
                {r.attachments.map((a, aidx) => (
                  <div key={aidx} className="relative w-24 h-16 rounded-md overflow-hidden border bg-muted">
                    {a.type === "video" ? (
                      <>
                        <img src={a.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="rounded-full bg-black/60 p-1.5"><Play className="h-3 w-3 fill-white text-white" /></div>
                        </div>
                      </>
                    ) : (
                      <img src={a.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {records.length === 0 && <div className="text-center text-muted-foreground py-12">暂无跟进记录</div>}
      </div>
    </Card>
  );
}

/* ========== 家长信息 Tab ========== */
function ParentsTab({ parents }: { parents: Parent[] }) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>姓名</TableHead>
            <TableHead>关系</TableHead>
            <TableHead>手机号</TableHead>
            <TableHead>微信账号</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parents.map((p, idx) => (
            <TableRow key={idx}>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.relation}</TableCell>
              <TableCell className="font-mono text-xs">{p.phone}</TableCell>
              <TableCell>{p.wechat}</TableCell>
            </TableRow>
          ))}
          {parents.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-12">暂无数据</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ========== 历史规划师 Tab ========== */
function HistoryPlannersTab({ planners }: { planners: HistoryPlanner[] }) {
  const [fPlannerId, setFPlannerId] = useState("");
  const filtered = planners.filter((p) => !fPlannerId.trim() || p.id.toLowerCase().includes(fPlannerId.trim().toLowerCase()));
  const { paged, Pagination } = usePagination(filtered, 10);

  return (
    <Card>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">规划师ID</Label>
          <Input value={fPlannerId} onChange={(e) => setFPlannerId(e.target.value)} placeholder="输入规划师ID" className="h-8 w-48" />
        </div>
        <Button size="sm"><Search className="h-3.5 w-3.5 mr-1" />查询</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>规划师ID</TableHead>
            <TableHead>规划师姓名</TableHead>
            <TableHead>账号</TableHead>
            <TableHead>所属级别</TableHead>
            <TableHead>所属品牌</TableHead>
            <TableHead>所属俱乐部</TableHead>
            <TableHead>入驻时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs">{p.id}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell className="font-mono text-xs">{p.account}</TableCell>
              <TableCell>{p.level}</TableCell>
              <TableCell>{p.brand}</TableCell>
              <TableCell>{p.club}</TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{p.joinTime}</TableCell>
            </TableRow>
          ))}
          {paged.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">暂无数据</TableCell></TableRow>}
        </TableBody>
      </Table>
      <Pagination />
    </Card>
  );
}
