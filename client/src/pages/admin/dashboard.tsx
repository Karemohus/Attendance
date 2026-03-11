import { AdminLayout } from "@/components/layout/admin-layout";
import { useEmployees } from "@/hooks/use-employees";
import { useAttendanceLogs } from "@/hooks/use-attendance";
import { Card } from "@/components/ui/card";
import { Users, UserCheck, Clock, UserX } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { isSameDay } from "date-fns";

export default function AdminDashboard() {
  const { data: employees } = useEmployees();
  const { data: logs } = useAttendanceLogs();

  const today = new Date();
  
  const stats = useMemo(() => {
    const todayLogs = logs?.filter(log => isSameDay(new Date(log.timestamp), today)) || [];
    
    // عدد الموظفين
    const totalEmployees = employees?.filter(e => e.role === 'employee').length || 0;
    
    // الحضور اليوم (موظفين سجلوا دخول)
    const presentToday = new Set(todayLogs.filter(l => l.type === 'check-in').map(l => l.userId)).size;
    
    // Overtime اليوم
    const overtimeToday = todayLogs.filter(l => l.status === 'overtime').length;
    
    // الغياب اليوم (موظفين ما سجلوش)
    const employeeIds = employees?.filter(e => e.role === 'employee').map(e => e.id) || [];
    const presentIds = new Set(todayLogs.map(l => l.userId));
    const absentToday = employeeIds.filter(id => !presentIds.has(id)).length;

    return [
      { 
        title: "إجمالي الموظفين", 
        titleEn: "Total Employees",
        value: totalEmployees, 
        icon: Users, 
        color: "text-blue-500", 
        bg: "bg-blue-500/10" 
      },
      { 
        title: "الحضور اليوم", 
        titleEn: "Present Today",
        value: presentToday, 
        icon: UserCheck, 
        color: "text-emerald-500", 
        bg: "bg-emerald-500/10" 
      },
      { 
        title: "Overtime اليوم", 
        titleEn: "Overtime Today",
        value: overtimeToday, 
        icon: Clock, 
        color: "text-purple-500", 
        bg: "bg-purple-500/10" 
      },
      { 
        title: "الغياب اليوم", 
        titleEn: "Absent Today",
        value: absentToday, 
        icon: UserX, 
        color: "text-red-500", 
        bg: "bg-red-500/10" 
      },
    ];
  }, [employees, logs, today]);

  // آخر الحركات
  const recentLogs = logs?.slice(0, 8) || [];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Card className="p-6 border-border/50 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <h3 className="text-3xl font-bold font-display mt-1">{stat.value}</h3>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
            <h3 className="text-lg font-bold mb-4">آخر الحركات</h3>
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      log.status === 'overtime' ? 'bg-purple-500' : 
                      log.status === 'success' ? 'bg-emerald-500' : 'bg-destructive'
                    }`} />
                    <div>
                      <p className="text-sm font-semibold">{log.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.type === 'check-in' ? 'دخول' : 'خروج'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">
                      {new Date(log.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className={`text-xs font-medium ${
                      log.status === 'overtime' ? 'text-purple-500' : 
                      log.status === 'success' ? 'text-emerald-500' : 
                      log.status === 'early' ? 'text-orange-500' :
                      log.status === 'incomplete' ? 'text-yellow-500' : 'text-destructive'
                    }`}>
                      {log.status === 'overtime' ? 'وقت إضافي' : 
                       log.status === 'success' ? 'ناجح' : 
                       log.status === 'early' ? 'خروج مبكر' :
                       log.status === 'incomplete' ? 'ناقص' : log.status}
                    </p>
                  </div>
                </div>
              ))}
              {recentLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  لا توجد حركات حتى الآن
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-border/50 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
            <h3 className="text-lg font-bold mb-2">حالة النظام</h3>
            <p className="text-sm text-muted-foreground mb-6">نظرة عامة على حالة نظام الحضور</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">اتصال قاعدة البيانات</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold">متصل</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">خدمات الموقع</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold">نشط</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">التصدير</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold">جاهز</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
