import { useState, useMemo, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useAttendanceLogs } from "@/hooks/use-attendance";
import { useEmployees } from "@/hooks/use-employees";
import { useDepartments } from "@/hooks/use-departments";
import { useShifts } from "@/hooks/use-shifts";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Download, Search, X, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, AlertTriangle, Timer } from "lucide-react";
import * as XLSX from "xlsx";
import { format, startOfDay, endOfDay, eachDayOfInterval, isBefore, isSameDay } from "date-fns";

const ITEMS_PER_PAGE = 50;

type DailyRecord = {
  odId: string;
  odemployee: any;
  date: Date;
  checkInTime: string | null;
  checkOutTime: string | null;
  workedHours: number | null;
  workedMinutes: number | null;
  requiredHours: number;
  shift: any | null;
  status: 'complete' | 'overtime' | 'early' | 'incomplete' | 'absent';
  checkInStatus: string | null;
  checkOutStatus: string | null;
};

export default function AdminAttendance() {
  const { data: logs, isLoading } = useAttendanceLogs();
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: shifts } = useShifts();
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource('/api/attendance/stream');
    eventSource.onmessage = (event) => {
      if (event.data === 'update') {
        queryClient.invalidateQueries({ queryKey: [api.attendance.list.path] });
      }
    };
    return () => eventSource.close();
  }, [queryClient]);

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // حساب الأيام المستهدفة
  const targetDates = useMemo(() => {
    if (!startDate && !endDate) {
      return [startOfDay(new Date())];
    }
    const start = startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date());
    const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());
    
    if (isBefore(end, start)) return [start];
    
    const today = endOfDay(new Date());
    const actualEnd = isBefore(today, end) ? today : end;
    
    try {
      return eachDayOfInterval({ start, end: actualEnd });
    } catch (e) {
      return [startOfDay(new Date())];
    }
  }, [startDate, endDate]);

  // بناء السجلات اليومية - سطر واحد لكل موظف/يوم
  const dailyRecords = useMemo(() => {
    const records: DailyRecord[] = [];
    if (!employees || !logs) return records;

    for (const emp of employees) {
      // لو الموظف مالوش قسم، تخطاه
      if (!emp.departmentId) continue;

      // جلب الشيفت (الأولوية للشيفت المحدد، ثم شيفت القسم)
      let empShift = null;
      if ((emp as any).shiftId) {
        empShift = shifts?.find(s => s.id === (emp as any).shiftId);
      }
      if (!empShift) {
        empShift = shifts?.find(s => s.departmentId === emp.departmentId);
      }

      const requiredHours = empShift?.requiredHours || 8;

      for (const targetDate of targetDates) {
        // جلب سجلات اليوم لهذا الموظف
        const dayLogs = logs.filter(l => 
          l.userId === emp.id && 
          isSameDay(new Date(l.timestamp), targetDate)
        );

        const checkInLog = dayLogs.find(l => l.type === 'check-in');
        const checkOutLog = dayLogs.find(l => l.type === 'check-out');

        let workedHours: number | null = null;
        let workedMinutes: number | null = null;
        let status: DailyRecord['status'] = 'absent';

        if (checkInLog && checkOutLog) {
          // حساب ساعات العمل
          const checkInTime = new Date(checkInLog.timestamp);
          const checkOutTime = new Date(checkOutLog.timestamp);
          const diffMs = checkOutTime.getTime() - checkInTime.getTime();
          const totalMinutes = Math.floor(diffMs / (1000 * 60));
          workedHours = Math.floor(totalMinutes / 60);
          workedMinutes = totalMinutes % 60;

          // تحديد الحالة
          if (checkOutLog.status === 'early' || totalMinutes < requiredHours * 60 - 15) {
            status = 'early';
          } else if (checkOutLog.status === 'overtime' || totalMinutes > requiredHours * 60 + 15) {
            status = 'overtime';
          } else {
            status = 'complete';
          }
        } else if (checkInLog || checkOutLog) {
          status = 'incomplete';
        } else {
          status = 'absent';
        }

        records.push({
          odId: `${emp.id}-${targetDate.toISOString()}`,
          odemployee: emp,
          date: targetDate,
          checkInTime: checkInLog ? format(new Date(checkInLog.timestamp), 'hh:mm a') : null,
          checkOutTime: checkOutLog ? format(new Date(checkOutLog.timestamp), 'hh:mm a') : null,
          workedHours,
          workedMinutes,
          requiredHours,
          shift: empShift,
          status,
          checkInStatus: checkInLog?.status || null,
          checkOutStatus: checkOutLog?.status || null,
        });
      }
    }

    // ترتيب حسب التاريخ (الأحدث أولاً) ثم الاسم
    return records.sort((a, b) => {
      const dateCompare = b.date.getTime() - a.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.odemployee.name.localeCompare(b.odemployee.name);
    });
  }, [employees, logs, shifts, targetDates]);

  // الفلترة
  const filteredRecords = useMemo(() => {
    return dailyRecords.filter(record => {
      const matchesSearch = record.odemployee.name.toLowerCase().includes(search.toLowerCase()) || 
                           record.odemployee.employeeId.toLowerCase().includes(search.toLowerCase());
      const matchesDepartment = departmentId === "all" || record.odemployee.departmentId?.toString() === departmentId;
      
      let matchesStatus = true;
      if (statusFilter !== "all") {
        matchesStatus = record.status === statusFilter;
      }
      
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [dailyRecords, search, departmentId, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, departmentId, statusFilter, startDate, endDate]);

  // تصدير Excel
  const handleExport = () => {
    if (!filteredRecords || filteredRecords.length === 0) return;

    const exportData = filteredRecords.map(record => ({
      'رقم الموظف': record.odemployee.employeeId,
      'الاسم': record.odemployee.name,
      'القسم': record.odemployee.department?.name || '-',
      'الشيفت': record.shift?.name || '-',
      'التاريخ': format(record.date, 'yyyy-MM-dd'),
      'الدخول': record.checkInTime || '-',
      'الخروج': record.checkOutTime || '-',
      'ساعات العمل': record.workedHours !== null ? `${record.workedHours}س ${record.workedMinutes}د` : '-',
      'المطلوب': `${record.requiredHours}س`,
      'الحالة': getStatusLabel(record.status),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل الحضور");
    XLSX.writeFile(wb, `Attendance_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const clearFilters = () => {
    setSearch("");
    setDepartmentId("all");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'complete': return 'مكتمل';
      case 'overtime': return 'وقت إضافي';
      case 'early': return 'خروج مبكر';
      case 'incomplete': return 'ناقص';
      case 'absent': return 'غياب';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'overtime': return <Timer className="h-4 w-4 text-purple-600" />;
      case 'early': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'incomplete': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'overtime': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
      case 'early': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400';
      case 'incomplete': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
      case 'absent': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatWorkedTime = (hours: number | null, minutes: number | null, required: number) => {
    if (hours === null || minutes === null) return '-';
    
    const totalWorked = hours * 60 + minutes;
    const requiredMinutes = required * 60;
    const diff = totalWorked - requiredMinutes;
    
    let diffText = '';
    if (diff > 0) {
      diffText = `+${Math.floor(diff / 60)}س ${diff % 60}د`;
    } else if (diff < 0) {
      const absDiff = Math.abs(diff);
      diffText = `-${Math.floor(absDiff / 60)}س ${absDiff % 60}د`;
    }

    return (
      <div className="flex flex-col">
        <span className="font-medium">{hours}س {minutes}د</span>
        {diffText && (
          <span className={`text-xs ${diff > 0 ? 'text-purple-600' : 'text-orange-600'}`}>
            ({diffText})
          </span>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">سجل الحضور</h2>
          <p className="text-muted-foreground mt-1">متابعة حضور وانصراف الموظفين</p>
        </div>
        
        <Button 
          onClick={handleExport}
          disabled={!filteredRecords || filteredRecords.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 rounded-xl"
        >
          <Download className="mr-2 h-4 w-4" />
          تصدير Excel
        </Button>
      </div>

      {/* الفلاتر */}
      <Card className="p-4 mb-6 rounded-2xl border-border/50 bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="بحث بالاسم أو الرقم..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 rounded-xl"
            />
          </div>
          
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="القسم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأقسام</SelectItem>
              {departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="complete">✅ مكتمل</SelectItem>
              <SelectItem value="overtime">⏰ وقت إضافي</SelectItem>
              <SelectItem value="early">🔶 خروج مبكر</SelectItem>
              <SelectItem value="incomplete">⚠️ ناقص</SelectItem>
              <SelectItem value="absent">❌ غياب</SelectItem>
            </SelectContent>
          </Select>
          
          <Input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            className="rounded-xl" 
            placeholder="من تاريخ"
          />
          <Input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            className="rounded-xl"
            placeholder="إلى تاريخ" 
          />
          
          <Button variant="outline" onClick={clearFilters} className="rounded-xl">
            <X className="h-4 w-4 mr-2" /> مسح
          </Button>
        </div>
      </Card>

      {/* الجدول */}
      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>الموظف</TableHead>
              <TableHead>الشيفت</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الدخول</TableHead>
              <TableHead>الخروج</TableHead>
              <TableHead>ساعات العمل</TableHead>
              <TableHead>المطلوب</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">جاري التحميل...</TableCell>
              </TableRow>
            ) : paginatedRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد سجلات</TableCell>
              </TableRow>
            ) : (
              paginatedRecords.map((record) => (
                <TableRow key={record.odId} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {record.odemployee.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span>{record.odemployee.name}</span>
                        <span className="text-xs text-muted-foreground">{record.odemployee.employeeId}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.shift ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <span className="text-sm">{record.shift.name}</span>
                        {record.shift.isFlexible && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">مرن</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{format(record.date, 'yyyy/MM/dd')}</span>
                  </TableCell>
                  <TableCell>
                    {record.checkInTime ? (
                      <span className="text-emerald-600 font-mono text-sm">{record.checkInTime}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {record.checkOutTime ? (
                      <span className="text-orange-600 font-mono text-sm">{record.checkOutTime}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatWorkedTime(record.workedHours, record.workedMinutes, record.requiredHours)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{record.requiredHours}س</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(record.status)}`}>
                      {getStatusIcon(record.status)}
                      {getStatusLabel(record.status)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              عرض {((currentPage - 1) * ITEMS_PER_PAGE) + 1} إلى {Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)} من {filteredRecords.length}
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2">
                صفحة {currentPage} من {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}
