import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useAuth } from "@/hooks/use-auth";
import { useEmployees, useCreateEmployee, useUpdateEmployee } from "@/hooks/use-employees";
import { useLocations, useCreateLocation } from "@/hooks/use-locations";
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift } from "@/hooks/use-shifts";
import { useAttendanceLogs } from "@/hooks/use-attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, UserPlus, Edit2, Trash2, Camera, Users, UserCheck, Clock, UserX, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay } from "date-fns";
import { motion } from "framer-motion";

const ITEMS_PER_PAGE = 50;

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const { data: employees, isLoading: empLoading } = useEmployees();
  const { data: locations } = useLocations();
  const { data: shifts, isLoading: shiftLoading } = useShifts();
  const { data: logs, isLoading: logsLoading } = useAttendanceLogs();
  
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const createLoc = useCreateLocation();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  
  const { toast } = useToast();

  const [empOpen, setEmpOpen] = useState(false);
  const [isEditEmp, setIsEditEmp] = useState(false);
  const [selEmpId, setSelEmpId] = useState<number | null>(null);
  const [empForm, setEmpForm] = useState({ employeeId: "", name: "", password: "", role: "employee" });

  const [locOpen, setLocOpen] = useState(false);
  const [locForm, setLocForm] = useState({ name: "", latitude: "", longitude: "", radius: "100" });

  const [shiftOpen, setShiftOpen] = useState(false);
  const [isEditShift, setIsEditShift] = useState(false);
  const [selShiftId, setSelShiftId] = useState<number | null>(null);
  const [shiftForm, setShiftForm] = useState({ name: "", startTime: "09:00", endTime: "17:00", graceMinutesIn: "0", graceMinutesOut: "0" });

  // Pagination states
  const [empPage, setEmpPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);

  // Filter logic: Only same department (not location)
  const myEmployees = employees?.filter(e => e.departmentId === user?.departmentId && e.role === 'employee') || [];
  const myLogs = logs?.filter(l => l.user.departmentId === user?.departmentId) || [];
  const myShifts = shifts?.filter(s => s.departmentId === user?.departmentId) || [];
  const myLocations = locations?.filter(l => l.departmentId === user?.departmentId) || [];

  // Dashboard Stats
  const today = new Date();
  const stats = useMemo(() => {
    const todayLogs = myLogs.filter(log => isSameDay(new Date(log.timestamp), today));
    
    const totalEmployees = myEmployees.length;
    const presentToday = new Set(todayLogs.filter(l => l.type === 'check-in').map(l => l.userId)).size;
    const overtimeToday = todayLogs.filter(l => l.status === 'overtime').length;
    
    const employeeIds = myEmployees.map(e => e.id);
    const presentIds = new Set(todayLogs.map(l => l.userId));
    const absentToday = employeeIds.filter(id => !presentIds.has(id)).length;

    return [
      { title: "إجمالي الموظفين", value: totalEmployees, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
      { title: "الحضور اليوم", value: presentToday, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
      { title: "Overtime اليوم", value: overtimeToday, icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
      { title: "الغياب اليوم", value: absentToday, icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
    ];
  }, [myEmployees, myLogs, today]);

  // Pagination
  const empTotalPages = Math.ceil(myEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = myEmployees.slice((empPage - 1) * ITEMS_PER_PAGE, empPage * ITEMS_PER_PAGE);
  
  const logsTotalPages = Math.ceil(myLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = myLogs.slice((logsPage - 1) * ITEMS_PER_PAGE, logsPage * ITEMS_PER_PAGE);

  // Recent logs for dashboard
  const recentLogs = myLogs.slice(0, 8);

  const handleEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...empForm,
        locationId: user?.locationId,
        departmentId: user?.departmentId,
      };
      if (isEditEmp && selEmpId) {
        await updateEmployee.mutateAsync({ id: selEmpId, data: payload });
        toast({ title: "تم تحديث الموظف" });
      } else {
        await createEmployee.mutateAsync(payload);
        toast({ title: "تم إضافة الموظف" });
      }
      setEmpOpen(false);
      resetEmp();
    } catch (err: any) { toast({ variant: "destructive", title: "خطأ", description: err.message }); }
  };

  const handleLocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLoc.mutateAsync({ 
        ...locForm, 
        latitude: Number(locForm.latitude), 
        longitude: Number(locForm.longitude), 
        radius: Number(locForm.radius), 
        departmentId: user?.departmentId as any 
      });
      toast({ title: "تم إنشاء الموقع" });
      setLocOpen(false);
      setLocForm({ name: "", latitude: "", longitude: "", radius: "100" });
    } catch (err: any) { toast({ variant: "destructive", title: "خطأ", description: err.message }); }
  };

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        name: shiftForm.name,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        departmentId: user?.departmentId!, 
        graceMinutesIn: Number(shiftForm.graceMinutesIn), 
        graceMinutesOut: Number(shiftForm.graceMinutesOut),
        workDays: JSON.stringify(["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"]),
        requiredHours: 8
      };
      if (isEditShift && selShiftId) {
        await updateShift.mutateAsync({ id: selShiftId, data: payload });
        toast({ title: "تم تحديث الشيفت" });
      } else {
        await createShift.mutateAsync(payload as any);
        toast({ title: "تم إنشاء الشيفت" });
      }
      setShiftOpen(false);
      resetShift();
    } catch (err: any) { toast({ variant: "destructive", title: "خطأ", description: err.message }); }
  };

  const resetEmp = () => { setEmpForm({ employeeId: "", name: "", password: "", role: "employee" }); setIsEditEmp(false); setSelEmpId(null); };
  const resetShift = () => { setShiftForm({ name: "", startTime: "09:00", endTime: "17:00", graceMinutesIn: "0", graceMinutesOut: "0" }); setIsEditShift(false); setSelShiftId(null); };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="rounded-xl">
            <TabsTrigger value="dashboard" className="rounded-lg">لوحة التحكم</TabsTrigger>
            <TabsTrigger value="employees" className="rounded-lg">الموظفين</TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-lg">سجل الحضور</TabsTrigger>
            <TabsTrigger value="shifts" className="rounded-lg">الشيفتات</TabsTrigger>
            <TabsTrigger value="locations" className="rounded-lg">المواقع</TabsTrigger>
          </TabsList>
          
          {/* Reports Link */}
          <div className="flex justify-end -mt-4">
            <a href="/supervisor/reports" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
              <Clock className="h-4 w-4" />
              التقارير الشهرية
            </a>
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="space-y-8">
              {/* Stats Cards */}
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

              {/* Recent Activity */}
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
            </div>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { resetEmp(); setEmpOpen(true); }} className="rounded-xl">
                <UserPlus className="mr-2 h-4 w-4" /> إضافة موظف
              </Button>
            </div>
            <Card className="rounded-2xl overflow-hidden border-border/50">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الرقم الوظيفي</TableHead>
                    <TableHead>الموقع</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا يوجد موظفين</TableCell></TableRow>
                  ) : (
                    paginatedEmployees.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-muted-foreground font-mono">{emp.employeeId}</TableCell>
                        <TableCell>{emp.location?.name || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { 
                            setSelEmpId(emp.id); 
                            setEmpForm({ employeeId: emp.employeeId, name: emp.name, password: emp.password, role: emp.role });
                            setIsEditEmp(true);
                            setEmpOpen(true);
                          }} className="rounded-xl"><Edit2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {empTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    عرض {((empPage - 1) * ITEMS_PER_PAGE) + 1} إلى {Math.min(empPage * ITEMS_PER_PAGE, myEmployees.length)} من {myEmployees.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEmpPage(p => Math.max(1, p - 1))} disabled={empPage === 1} className="rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm font-medium px-2">{empPage} / {empTotalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setEmpPage(p => Math.min(empTotalPages, p + 1))} disabled={empPage === empTotalPages} className="rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card className="rounded-2xl overflow-hidden border-border/50">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>التاريخ والوقت</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الصورة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد سجلات</TableCell></TableRow>
                  ) : (
                    paginatedLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.user.name}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            log.type === 'check-in' 
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' 
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                          }`}>
                            {log.type === 'check-in' ? 'دخول' : 'خروج'}
                          </span>
                        </TableCell>
                        <TableCell>{format(new Date(log.timestamp), 'yyyy/MM/dd hh:mm a')}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.status === 'overtime' ? 'bg-purple-100 text-purple-700' : 
                            log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 
                            log.status === 'early' ? 'bg-orange-100 text-orange-700' :
                            log.status === 'incomplete' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.status === 'overtime' ? 'وقت إضافي' : 
                             log.status === 'success' ? 'ناجح' : 
                             log.status === 'early' ? 'خروج مبكر' :
                             log.status === 'incomplete' ? 'ناقص' : log.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.selfieUrl ? <img src={log.selfieUrl} className="h-10 w-10 rounded-lg object-cover" /> : <Camera className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {logsTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    عرض {((logsPage - 1) * ITEMS_PER_PAGE) + 1} إلى {Math.min(logsPage * ITEMS_PER_PAGE, myLogs.length)} من {myLogs.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setLogsPage(p => Math.max(1, p - 1))} disabled={logsPage === 1} className="rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm font-medium px-2">{logsPage} / {logsTotalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))} disabled={logsPage === logsTotalPages} className="rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Shifts Tab */}
          <TabsContent value="shifts">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { resetShift(); setShiftOpen(true); }} className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" /> إضافة شيفت
              </Button>
            </div>
            <Card className="rounded-2xl overflow-hidden border-border/50">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>التوقيت</TableHead>
                    <TableHead>فترة السماح</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myShifts.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا يوجد شيفتات</TableCell></TableRow>
                  ) : (
                    myShifts.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.startTime} - {s.endTime}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">دخول: {s.graceMinutesIn}د | خروج: {s.graceMinutesOut}د</TableCell>
                        <TableCell className="text-right flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSelShiftId(s.id);
                            setShiftForm({ name: s.name, startTime: s.startTime, endTime: s.endTime, graceMinutesIn: s.graceMinutesIn.toString(), graceMinutesOut: s.graceMinutesOut.toString() });
                            setIsEditShift(true);
                            setShiftOpen(true);
                          }} className="rounded-xl"><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteShift.mutate(s.id)} className="text-destructive rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add Location Form */}
              <Card className="p-6 rounded-2xl border-border/50">
                <h3 className="text-lg font-bold mb-4">إضافة موقع جديد</h3>
                <form onSubmit={handleLocSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>اسم الموقع</Label>
                    <Input value={locForm.name} onChange={e => setLocForm({...locForm, name: e.target.value})} required className="rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>خط العرض (Lat)</Label>
                      <Input type="number" step="any" value={locForm.latitude} onChange={e => setLocForm({...locForm, latitude: e.target.value})} required className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>خط الطول (Lng)</Label>
                      <Input type="number" step="any" value={locForm.longitude} onChange={e => setLocForm({...locForm, longitude: e.target.value})} required className="rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>نطاق الموقع (متر)</Label>
                    <Input type="number" value={locForm.radius} onChange={e => setLocForm({...locForm, radius: e.target.value})} required className="rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full rounded-xl">إنشاء الموقع</Button>
                </form>
              </Card>

              {/* Existing Locations */}
              <Card className="p-6 rounded-2xl border-border/50">
                <h3 className="text-lg font-bold mb-4">المواقع الحالية</h3>
                <div className="space-y-3">
                  {myLocations.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">لا يوجد مواقع</p>
                  ) : (
                    myLocations.map(loc => (
                      <div key={loc.id} className="p-4 rounded-xl bg-muted/50 border border-border/30">
                        <p className="font-semibold">{loc.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)} • {loc.radius}م
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Employee Dialog */}
        <Dialog open={empOpen} onOpenChange={setEmpOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>{isEditEmp ? "تعديل الموظف" : "إضافة موظف"}</DialogTitle></DialogHeader>
            <form onSubmit={handleEmpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>الرقم الوظيفي</Label>
                <Input value={empForm.employeeId} onChange={e => setEmpForm({...empForm, employeeId: e.target.value})} required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input type="password" value={empForm.password} onChange={e => setEmpForm({...empForm, password: e.target.value})} required={!isEditEmp} className="rounded-xl" />
              </div>
              <Button type="submit" className="w-full rounded-xl">حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Shift Dialog */}
        <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>{isEditShift ? "تعديل الشيفت" : "إضافة شيفت"}</DialogTitle></DialogHeader>
            <form onSubmit={handleShiftSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>اسم الشيفت</Label>
                <Input value={shiftForm.name} onChange={e => setShiftForm({...shiftForm, name: e.target.value})} required className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>وقت البدء</Label>
                  <Input type="time" value={shiftForm.startTime} onChange={e => setShiftForm({...shiftForm, startTime: e.target.value})} required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>وقت الانتهاء</Label>
                  <Input type="time" value={shiftForm.endTime} onChange={e => setShiftForm({...shiftForm, endTime: e.target.value})} required className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>سماحية الدخول (دقائق)</Label>
                  <Input type="number" value={shiftForm.graceMinutesIn} onChange={e => setShiftForm({...shiftForm, graceMinutesIn: e.target.value})} required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>سماحية الخروج (دقائق)</Label>
                  <Input type="number" value={shiftForm.graceMinutesOut} onChange={e => setShiftForm({...shiftForm, graceMinutesOut: e.target.value})} required className="rounded-xl" />
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl">حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
