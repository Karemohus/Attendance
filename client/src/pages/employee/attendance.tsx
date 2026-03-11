import { useState, useEffect, useMemo } from "react";
  import { EmployeeLayout } from "@/components/layout/employee-layout";
  import { useAttendanceLogs } from "@/hooks/use-attendance";
  import { useAuth } from "@/hooks/use-auth";
  import { useShifts } from "@/hooks/use-shifts";
  import { format } from "date-fns";
  import { ar } from "date-fns/locale";
  import { 
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
  import { Card } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Button } from "@/components/ui/button";
  import { ChevronLeft, ChevronRight } from "lucide-react";

  export default function EmployeeAttendance() {
    const { user } = useAuth();
    const { data: logs, isLoading } = useAttendanceLogs();
    const { data: shifts } = useShifts();
    const [lang, setLang] = useState<"ar" | "en">((localStorage.getItem("lang") as "ar" | "en") || "ar");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;
    
    // Get user's shift from department
    const userShift = useMemo(() => {
      if (!user?.departmentId || !shifts) return null;
      return shifts.find(s => s.departmentId === user.departmentId);
    }, [user, shifts]);
    
    const [startDate, setStartDate] = useState(() => {
      const d = new Date();
      d.setDate(1); // First day of current month
      return d.toISOString().split('T')[0];
    });
    
    const [endDate, setEndDate] = useState(() => {
      return new Date().toISOString().split('T')[0];
    });

    useEffect(() => {
      const handleStorage = () => setLang((localStorage.getItem("lang") as "ar" | "en") || "ar");
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    }, []);

    const t = {
      title: { ar: "سجل الحضور والانصراف", en: "Attendance History" },
      from: { ar: "من تاريخ", en: "From Date" },
      to: { ar: "إلى تاريخ", en: "To Date" },
      date: { ar: "التاريخ", en: "Date" },
      day: { ar: "اليوم", en: "Day" },
      checkIn: { ar: "وقت الحضور", en: "Check In" },
      checkOut: { ar: "وقت الانصراف", en: "Check Out" },
      status: { ar: "الحالة", en: "Status" },
      present: { ar: "حضور", en: "Present" },
      absent: { ar: "غياب", en: "Absent" },
      weekend: { ar: "إجازة", en: "Off Day" },
      overtime: { ar: "إضافي", en: "Overtime" },
      loading: { ar: "جاري تحميل البيانات...", en: "Loading data..." },
      noData: { ar: "لا توجد سجلات في هذه الفترة", en: "No records found" }
    };

    // Group logs by date
    const logsByDate = logs?.reduce((acc: any, log) => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { checkIn: null, checkOut: null };
      }
      if (log.type === 'check-in') {
        acc[date].checkIn = log;
      } else if (log.type === 'check-out') {
        acc[date].checkOut = log;
      }
      return acc;
    }, {});

    // Generate date range
    const dateRange = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      dateRange.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    const tableData = dateRange.map(dateStr => {
      const d = new Date(dateStr);
      const dayNameEn = format(d, 'EEEE').toLowerCase();
      
      let isWorkDay = true;
      if (userShift?.workDays) {
        try {
          const workDays = typeof userShift.workDays === 'string' ? JSON.parse(userShift.workDays) : userShift.workDays;
          isWorkDay = workDays.includes(dayNameEn);
        } catch (e) {}
      }

      const dayData = logsByDate?.[dateStr];
      
      let status = 'absent';
      if (!isWorkDay) status = 'weekend'; 
      if (dayData?.checkIn) status = dayData.checkIn.status === 'overtime' ? 'overtime' : 'present';
      
      return {
        date: dateStr,
        dayName: format(d, 'EEEE', { locale: lang === "ar" ? ar : undefined }),
        checkIn: dayData?.checkIn?.timestamp ? format(new Date(dayData.checkIn.timestamp), 'hh:mm a') : '-',
        checkOut: dayData?.checkOut?.timestamp ? format(new Date(dayData.checkOut.timestamp), 'hh:mm a') : '-',
        status
      };
    }).reverse();

    // Pagination
    const totalPages = Math.ceil(tableData.length / ITEMS_PER_PAGE);
    const paginatedData = tableData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Reset page when date changes
    useEffect(() => {
      setCurrentPage(1);
    }, [startDate, endDate]);

    const getStatusBadge = (status: string) => {
      switch(status) {
        case 'present': return <Badge className="bg-green-500 hover:bg-green-600">{t.present[lang]}</Badge>;
        case 'overtime': return <Badge className="bg-purple-500 hover:bg-purple-600">{t.overtime[lang]}</Badge>;
        case 'absent': return <Badge variant="destructive">{t.absent[lang]}</Badge>;
        case 'weekend': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{t.weekend[lang]}</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
      }
    };

    return (
      <EmployeeLayout>
        <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
          <h1 className="text-3xl font-bold">{t.title[lang]}</h1>
          
          <Card className="p-4 flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>{t.from[lang]}</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.to[lang]}</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={lang === "ar" ? "text-right" : "text-left"}>{t.date[lang]}</TableHead>
                    <TableHead className={lang === "ar" ? "text-right" : "text-left"}>{t.day[lang]}</TableHead>
                    <TableHead className={lang === "ar" ? "text-right" : "text-left"}>{t.checkIn[lang]}</TableHead>
                    <TableHead className={lang === "ar" ? "text-right" : "text-left"}>{t.checkOut[lang]}</TableHead>
                    <TableHead className={lang === "ar" ? "text-right" : "text-left"}>{t.status[lang]}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t.loading[lang]}
                      </TableCell>
                    </TableRow>
                  ) : paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t.noData[lang]}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((row, i) => (
                      <TableRow key={i} className={row.status === 'weekend' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                        <TableCell className="font-medium">{format(new Date(row.date), 'yyyy/MM/dd')}</TableCell>
                        <TableCell>{row.dayName}</TableCell>
                        <TableCell dir="ltr" className={lang === "ar" ? "text-right" : "text-left"}>{row.checkIn}</TableCell>
                        <TableCell dir="ltr" className={lang === "ar" ? "text-right" : "text-left"}>{row.checkOut}</TableCell>
                        <TableCell>{getStatusBadge(row.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  {lang === "ar" ? `عرض ${((currentPage - 1) * ITEMS_PER_PAGE) + 1} إلى ${Math.min(currentPage * ITEMS_PER_PAGE, tableData.length)} من ${tableData.length}` : `Showing ${((currentPage - 1) * ITEMS_PER_PAGE) + 1} to ${Math.min(currentPage * ITEMS_PER_PAGE, tableData.length)} of ${tableData.length}`}
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </EmployeeLayout>
    );
  }
  