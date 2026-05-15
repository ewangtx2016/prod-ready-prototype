import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { db, type Student } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { PageHeader } from "@/components/dev/PageHeader";
import { DevNote } from "@/components/dev/DevNote";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, ArrowUp, ArrowDown, ArrowUpDown, Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePagination } from "@/components/dev/TablePagination";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/student/")({ component: Page });

const GRADE_OPTIONS = [
  "小学一年级", "小学二年级", "小学三年级", "小学四年级", "小学五年级", "小学六年级",
  "初中一年级", "初中二年级", "初中三年级",
  "高中一年级", "高中二年级", "高中三年级",
];

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "待服务", className: "bg-amber-50 text-amber-700 border-amber-200" },
  serving: { label: "服务中", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  expired: { label: "已过期", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_MAP[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={`${meta.className} text-xs font-normal`}>{meta.label}</Badge>;
}

function Page() {
  const { role } = useApp();
  const [students, setStudents] = useState<Student[]>([]);

  // 筛选状态
  const [fName, setFName] = useState("");
  const [fGender, setFGender] = useState<"all" | "男" | "女">("all");
  const [fSchool, setFSchool] = useState("");
  const [fGrade, setFGrade] = useState("all");
  const [fStudentNo, setFStudentNo] = useState("");
  const [fStatus, setFStatus] = useState<"all" | "pending" | "serving" | "expired">("all");
  const [fTutor, setFTutor] = useState("");
  const [fPlanner, setFPlanner] = useState("");
  const [fOrg, setFOrg] = useState("all");

  // 排序
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  function toggleSort(field: string) {
    if (sortField !== field) {
      setSortField(field);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortField(null);
      setSortDir(null);
    }
  }

  useEffect(() => {
    let list = db.students();
    // 兼容旧数据：补充缺失的 orgName
    let mutated = false;
    list = list.map((s) => {
      if (!s.orgName) {
        mutated = true;
        return { ...s, orgName: "机构用户平台" };
      }
      return s;
    });
    if (mutated) db.setStudents(list);
    setStudents(list);
  }, []);

  const filtered = useMemo(() => {
    let list = students.filter((s) => {
      if (fName.trim() && !s.name.includes(fName.trim())) return false;
      if (fGender !== "all" && s.gender !== fGender) return false;
      if (fSchool.trim() && !s.school.includes(fSchool.trim())) return false;
      if (fGrade !== "all" && s.grade !== fGrade) return false;
      if (fStudentNo.trim() && !s.studentNo.includes(fStudentNo.trim())) return false;
      if (fStatus !== "all" && s.status !== fStatus) return false;
      if (fTutor.trim() && !s.tutorName.includes(fTutor.trim())) return false;
      if (fPlanner.trim() && !s.plannerName.includes(fPlanner.trim())) return false;
      if (fOrg !== "all" && s.orgName !== fOrg) return false;
      return true;
    });

    if (sortField && sortDir) {
      const dir = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        const av = (a as any)[sortField];
        const bv = (b as any)[sortField];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv), "zh") * dir;
      });
    }

    return list;
  }, [students, fName, fGender, fSchool, fGrade, fStudentNo, fStatus, fTutor, fPlanner, fOrg, sortField, sortDir]);

  const { paged, Pagination } = usePagination(filtered, 10);

  const resetFilters = () => {
    setFName(""); setFGender("all"); setFSchool(""); setFGrade("all");
    setFStudentNo(""); setFStatus("all"); setFTutor(""); setFPlanner(""); setFOrg("all");
    setSortField(null); setSortDir(null);
  };

  // 统计
  const stats = useMemo(() => {
    const total = filtered.length;
    const pending = filtered.filter((s) => s.status === "pending").length;
    const serving = filtered.filter((s) => s.status === "serving").length;
    const expired = filtered.filter((s) => s.status === "expired").length;
    return { total, pending, serving, expired };
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="学员列表"
        subtitle="机构学员档案管理，支持筛选、排序与批量查看。"
        actions={
          <Button size="sm" variant="outline" disabled={role !== "org_admin" && role !== "super_admin"} onClick={() => { toast.success("已导出 students.xlsx (mock)"); }}>
            <Download className="h-4 w-4 mr-1" /> 导出
          </Button>
        }
      />

      <DevNote prd="学员管理" title="学员列表">
        <div>· 当前列表条数：{filtered.length} / 总计 {students.length}</div>
      </DevNote>

      {/* 统计卡片 */}
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">学员总数</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">待服务</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">{stats.pending}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">服务中</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.serving}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">已过期</div>
          <div className="mt-1 text-2xl font-semibold text-gray-500">{stats.expired}</div>
        </Card>
      </div>

      {/* 筛选区 */}
      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Search className="h-4 w-4 text-muted-foreground" />
          筛选和搜索
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">姓名</Label>
            <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="请输入学员姓名" className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">性别</Label>
            <Select value={fGender} onValueChange={(v) => setFGender(v as any)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部性别</SelectItem>
                <SelectItem value="男">男</SelectItem>
                <SelectItem value="女">女</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">学校</Label>
            <Input value={fSchool} onChange={(e) => setFSchool(e.target.value)} placeholder="请输入学员学校" className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">年级</Label>
            <Select value={fGrade} onValueChange={setFGrade}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部年级</SelectItem>
                {GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">编号</Label>
            <Input value={fStudentNo} onChange={(e) => setFStudentNo(e.target.value)} placeholder="请输入学员编号" className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">权益状态</Label>
            <Select value={fStatus} onValueChange={(v) => setFStatus(v as any)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待服务</SelectItem>
                <SelectItem value="serving">服务中</SelectItem>
                <SelectItem value="expired">已过期</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">所属学管师</Label>
            <Input value={fTutor} onChange={(e) => setFTutor(e.target.value)} placeholder="请输入学管师名称" className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">所属规划师</Label>
            <Input value={fPlanner} onChange={(e) => setFPlanner(e.target.value)} placeholder="请输入规划师名称" className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">所属机构</Label>
            <Select value={fOrg} onValueChange={setFOrg}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部机构</SelectItem>
                <SelectItem value="机构用户平台">机构用户平台</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" onClick={() => { /* 查询已自动响应 */ }}>
            <Search className="h-3.5 w-3.5 mr-1" /> 查询
          </Button>
          <Button size="sm" variant="ghost" onClick={resetFilters}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> 重置
          </Button>
        </div>
      </Card>

      {/* 表格 */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-2 text-sm font-medium">
          <Search className="h-4 w-4 text-muted-foreground" />
          学员列表
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>学员信息</TableHead>
              <TableHead>学员编号</TableHead>
              <TableHead>出生日期</TableHead>
              <TableHead>学校</TableHead>
              <TableHead>年级</TableHead>
              <TableHead>所属规划师</TableHead>
              <TableHead>权益状态</TableHead>
              <TableHead>所属学管师</TableHead>
              <TableHead onClick={() => toggleSort("remainingDays")} className="cursor-pointer select-none">
                <div className="flex items-center gap-1">
                  剩余权益时长
                  {sortField === "remainingDays" && sortDir === "asc" && <ArrowUp className="h-3 w-3" />}
                  {sortField === "remainingDays" && sortDir === "desc" && <ArrowDown className="h-3 w-3" />}
                  {sortField !== "remainingDays" && <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
                </div>
              </TableHead>
              <TableHead onClick={() => toggleSort("createdAt")} className="cursor-pointer select-none">
                <div className="flex items-center gap-1">
                  创建时间
                  {sortField === "createdAt" && sortDir === "asc" && <ArrowUp className="h-3 w-3" />}
                  {sortField === "createdAt" && sortDir === "desc" && <ArrowDown className="h-3 w-3" />}
                  {sortField !== "createdAt" && <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />}
                </div>
              </TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.gender} · {s.studentNo}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{s.studentNo}</TableCell>
                <TableCell className="text-sm">{s.birthDate}</TableCell>
                <TableCell className="text-sm">{s.school}</TableCell>
                <TableCell className="text-sm">{s.grade}</TableCell>
                <TableCell className="text-sm">{s.plannerName}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell className="text-sm">{s.tutorName}</TableCell>
                <TableCell className="text-sm">{s.remainingDays != null ? `${s.remainingDays}天` : "--"}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{s.createdAt}</TableCell>
                <TableCell className="text-right">
                  <Link to="/student/$id" params={{ id: s.id }}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-3.5 w-3.5 mr-1" /> 查看
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-12">暂无数据</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination />
      </div>

    </div>
  );
}
