import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, FileDown, Calendar, Users, Clock, AlertTriangle, TrendingUp, UserX, Timer } from "lucide-react";
import { api } from "@shared/routes";

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export default function SupervisorReports() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const queryParams = new URLSearchParams({ year: String(year), month: String(month) });

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: [api.reports.monthly.path, year, month, "supervisor"],
    queryFn: async () => {
      const res = await fetch(`${api.reports.monthly.path}?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل جلب التقرير");
      return res.json();
    },
  });

  const years = useMemo(() => {
    const arr = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) arr.push(y);
    return arr;
  }, []);

  const exportCSV = () => {
    if (!report?.data?.length) return;
    const headers = ["معرف الموظف","اسم الموظف","أيام العمل","الحضور","الغياب","التأخير","خروج مبكر","Overtime","ساعات العمل","المطلوب","متوسط يومي"];
    const rows = report.data.map((r: any) => [
      r.employeeId, r.employeeName, r.totalWorkDays, r.presentDays, r.absentDays,
      r.lateDays, r.earlyOutDays, r.overtimeDays, r.totalWorkedHours, r.totalRequiredHours, r.averageDailyHours
    ]);
    const bom = '\uFEFF';
    const csv = bom + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير-${MONTHS_AR[month-1]}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = report?.summary;

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">التقارير الشهرية</h1>
            <p className="text-muted-foreground mt-1">تقارير حضور موظفين قسمك</p>
          </div>
          <Button onClick={exportCSV} disabled={!report?.data?.length} variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            تصدير CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">السنة</label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">الشهر</label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_AR.map((name, i) => <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => refetch()} variant="default" className="gap-2">
              <Calendar className="h-4 w-4" /> عرض التقرير
            </Button>
          </div>
        </Card>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="p-4 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 mb-2"><Users className="h-5 w-5 text-blue-500" /></div>
              <p className="text-2xl font-bold">{summary.totalEmployees}</p>
              <p className="text-xs text-muted-foreground">إجمالي الموظفين</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 mb-2"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
              <p className="text-2xl font-bold">{summary.averageAttendanceRate}%</p>
              <p className="text-xs text-muted-foreground">نسبة الحضور</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 mb-2"><UserX className="h-5 w-5 text-red-500" /></div>
              <p className="text-2xl font-bold">{summary.totalAbsentDays}</p>
              <p className="text-xs text-muted-foreground">إجمالي الغياب</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10 mb-2"><AlertTriangle className="h-5 w-5 text-orange-500" /></div>
              <p className="text-2xl font-bold">{summary.totalLateDays}</p>
              <p className="text-xs text-muted-foreground">إجمالي التأخير</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 mb-2"><Timer className="h-5 w-5 text-purple-500" /></div>
              <p className="text-2xl font-bold">{summary.totalOvertimeDays}</p>
              <p className="text-xs text-muted-foreground">إجمالي Overtime</p>
            </Card>
          </div>
        )}

        {/* Table */}
        {report?.data && report.data.length > 0 && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right font-bold">الموظف</TableHead>
                    <TableHead className="text-right font-bold">المعرف</TableHead>
                    <TableHead className="text-center font-bold">أيام العمل</TableHead>
                    <TableHead className="text-center font-bold">الحضور</TableHead>
                    <TableHead className="text-center font-bold">الغياب</TableHead>
                    <TableHead className="text-center font-bold">التأخير</TableHead>
                    <TableHead className="text-center font-bold">خروج مبكر</TableHead>
                    <TableHead className="text-center font-bold">Overtime</TableHead>
                    <TableHead className="text-center font-bold">ساعات العمل</TableHead>
                    <TableHead className="text-center font-bold">نسبة الحضور</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.data.map((row: any) => {
                    const rate = row.totalWorkDays > 0 ? Math.round((row.presentDays / row.totalWorkDays) * 100) : 0;
                    const rateColor = rate >= 90 ? "text-emerald-600 bg-emerald-50" : rate >= 75 ? "text-orange-600 bg-orange-50" : "text-red-600 bg-red-50";
                    return (
                      <TableRow key={row.userId}>
                        <TableCell className="font-medium">{row.employeeName}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{row.employeeId}</TableCell>
                        <TableCell className="text-center">{row.totalWorkDays}</TableCell>
                        <TableCell className="text-center font-semibold text-emerald-600">{row.presentDays}</TableCell>
                        <TableCell className="text-center">{row.absentDays > 0 ? <span className="font-semibold text-red-600">{row.absentDays}</span> : <span className="text-muted-foreground">0</span>}</TableCell>
                        <TableCell className="text-center">{row.lateDays > 0 ? <span className="font-semibold text-orange-600">{row.lateDays}</span> : <span className="text-muted-foreground">0</span>}</TableCell>
                        <TableCell className="text-center">{row.earlyOutDays > 0 ? <span className="text-orange-500">{row.earlyOutDays}</span> : <span className="text-muted-foreground">0</span>}</TableCell>
                        <TableCell className="text-center">{row.overtimeDays > 0 ? <span className="text-purple-600">{row.overtimeDays}</span> : <span className="text-muted-foreground">0</span>}</TableCell>
                        <TableCell className="text-center font-mono">{row.totalWorkedHours}h</TableCell>
                        <TableCell className="text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${rateColor}`}>{rate}%</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {report?.data && report.data.length === 0 && (
          <Card className="p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">لا توجد بيانات</h3>
            <p className="text-muted-foreground mt-1">لا توجد سجلات حضور لهذا الشهر</p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
