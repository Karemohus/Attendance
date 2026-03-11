import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from "@/hooks/use-locations";
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift } from "@/hooks/use-shifts";
import { useDepartments } from "@/hooks/use-departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Trash2, Edit2, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

const DAYS = [
  { id: "saturday", label: "السبت" },
  { id: "sunday", label: "الأحد" },
  { id: "monday", label: "الإثنين" },
  { id: "tuesday", label: "الثلاثاء" },
  { id: "wednesday", label: "الأربعاء" },
  { id: "thursday", label: "الخميس" },
  { id: "friday", label: "الجمعة" },
];

export default function AdminLocations() {
  const { data: locations, isLoading: locLoading } = useLocations();
  const { data: shifts, isLoading: shiftLoading } = useShifts();
  const { data: departments } = useDepartments();
  
  const createLoc = useCreateLocation();
  const updateLoc = useUpdateLocation();
  const deleteLoc = useDeleteLocation();
  
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  
  const { toast } = useToast();
  
  // Location Form
  const [locOpen, setLocOpen] = useState(false);
  const [locEdit, setLocEdit] = useState(false);
  const [selLocId, setSelLocId] = useState<number | null>(null);
  const [locForm, setLocForm] = useState({ name: "", latitude: "", longitude: "", radius: "100", departmentId: "" });

  // Shift Form
  const [shiftOpen, setShiftOpen] = useState(false);
  const [shiftEdit, setShiftEdit] = useState(false);
  const [selShiftId, setSelShiftId] = useState<number | null>(null);
  const [shiftForm, setShiftForm] = useState({ 
    name: "", 
    startTime: "09:00", 
    endTime: "17:00", 
    departmentId: "",
    requiredHours: "8",
    graceMinutesIn: "0",
    graceMinutesOut: "0",
    workDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    allowOvertime: false,
    maxOvertimeEnd: "21:00",
    isFlexible: false,
    flexibleDayStart: "06:00",
    flexibleDayEnd: "01:00"
  });

  // Pagination
  const [locCurrentPage, setLocCurrentPage] = useState(1);
  const [shiftCurrentPage, setShiftCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const handleLocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!locForm.departmentId) {
        toast({ variant: "destructive", title: "Error", description: "Please select a department" });
        return;
      }
      const payload = {
        name: locForm.name,
        latitude: Number(locForm.latitude),
        longitude: Number(locForm.longitude),
        radius: Number(locForm.radius),
        departmentId: Number(locForm.departmentId),
      };
      if (locEdit && selLocId) {
        await updateLoc.mutateAsync({ id: selLocId, data: payload });
        toast({ title: "Location updated" });
      } else {
        await createLoc.mutateAsync(payload);
        toast({ title: "Location created" });
      }
      setLocOpen(false);
      resetLoc();
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); }
  };

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!shiftForm.departmentId) {
        toast({ variant: "destructive", title: "Error", description: "Please select a department" });
        return;
      }
      
      // تأكد من صيغة الوقت HH:mm
      const formatTime = (time: string) => {
        if (!time) return "09:00";
        // لو الوقت فيه AM/PM، حوله
        if (time.includes('AM') || time.includes('PM')) {
          const [timePart, modifier] = time.split(' ');
          let [hours, minutes] = timePart.split(':');
          if (hours === '12') hours = '00';
          if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
          return `${hours.padStart(2, '0')}:${minutes}`;
        }
        return time;
      };
      
      const payload = { 
        name: shiftForm.name,
        startTime: formatTime(shiftForm.startTime),
        endTime: formatTime(shiftForm.endTime),
        departmentId: Number(shiftForm.departmentId),
        graceMinutesIn: Number(shiftForm.graceMinutesIn),
        graceMinutesOut: Number(shiftForm.graceMinutesOut),
        requiredHours: Number(shiftForm.requiredHours),
        workDays: JSON.stringify(shiftForm.workDays),
        allowOvertime: shiftForm.allowOvertime,
        maxOvertimeEnd: shiftForm.allowOvertime ? formatTime(shiftForm.maxOvertimeEnd) : null,
        isFlexible: shiftForm.isFlexible,
        flexibleDayStart: shiftForm.isFlexible ? formatTime(shiftForm.flexibleDayStart) : null,
        flexibleDayEnd: shiftForm.isFlexible ? formatTime(shiftForm.flexibleDayEnd) : null
      };
      
      if (shiftEdit && selShiftId) {
        await updateShift.mutateAsync({ id: selShiftId, data: payload });
        toast({ title: "Shift updated" });
      } else {
        await createShift.mutateAsync(payload);
        toast({ title: "Shift created" });
      }
      setShiftOpen(false);
      resetShift();
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); }
  };

  const resetLoc = () => { setLocForm({ name: "", latitude: "", longitude: "", radius: "100", departmentId: "" }); setLocEdit(false); setSelLocId(null); };
  const resetShift = () => { setShiftForm({ name: "", startTime: "09:00", endTime: "17:00", departmentId: "", graceMinutesIn: "0", graceMinutesOut: "0", requiredHours: "8", workDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], allowOvertime: false, maxOvertimeEnd: "21:00" }); setShiftEdit(false); setSelShiftId(null); };

  // Pagination calculations
  const locList = locations || [];
  const shiftList = shifts || [];
  const locTotalPages = Math.ceil(locList.length / ITEMS_PER_PAGE);
  const shiftTotalPages = Math.ceil(shiftList.length / ITEMS_PER_PAGE);
  const paginatedLocations = locList.slice((locCurrentPage - 1) * ITEMS_PER_PAGE, locCurrentPage * ITEMS_PER_PAGE);
  const paginatedShifts = shiftList.slice((shiftCurrentPage - 1) * ITEMS_PER_PAGE, shiftCurrentPage * ITEMS_PER_PAGE);

  const toggleWorkDay = (day: string) => {
    setShiftForm(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day) 
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day]
    }));
  };

  return (
    <AdminLayout>
      <Tabs defaultValue="locations" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Locations & Shifts</h2>
            <p className="text-muted-foreground mt-1">Manage physical boundaries and work schedules.</p>
          </div>
          <TabsList className="rounded-xl">
            <TabsTrigger value="locations" className="rounded-lg">Locations</TabsTrigger>
            <TabsTrigger value="shifts" className="rounded-lg">Shifts</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="locations">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { resetLoc(); setLocOpen(true); }} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add Location</Button>
          </div>
          <Card className="rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Radius</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : paginatedLocations.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No locations found</TableCell></TableRow>
                ) : (
                  paginatedLocations.map(loc => (
                    <TableRow key={loc.id}>
                      <TableCell className="font-medium">{loc.name}</TableCell>
                      <TableCell>{loc.department?.name || "-"}</TableCell>
                      <TableCell className="text-sm font-mono">{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</TableCell>
                      <TableCell>{loc.radius}m</TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setSelLocId(loc.id); setLocForm({ name: loc.name, latitude: loc.latitude.toString(), longitude: loc.longitude.toString(), radius: loc.radius.toString(), departmentId: loc.departmentId.toString() }); setLocEdit(true); setLocOpen(true); }} className="rounded-xl"><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteLoc.mutate(loc.id)} className="text-destructive rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {locTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Showing {((locCurrentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(locCurrentPage * ITEMS_PER_PAGE, locList.length)} of {locList.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLocCurrentPage(p => Math.max(1, p - 1))} disabled={locCurrentPage === 1} className="rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm font-medium px-2">Page {locCurrentPage} of {locTotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setLocCurrentPage(p => Math.min(locTotalPages, p + 1))} disabled={locCurrentPage === locTotalPages} className="rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="shifts">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { resetShift(); setShiftOpen(true); }} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add Shift</Button>
          </div>
          <Card className="rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Shift Name</TableHead>
                  <TableHead>Timing</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Grace</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : paginatedShifts.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No shifts found</TableCell></TableRow>
                ) : (
                  paginatedShifts.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><span className="flex items-center gap-1 text-sm"><Clock className="h-3 w-3" /> {s.startTime} - {s.endTime}</span></TableCell>
                      <TableCell>{s.department?.name || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">In: {s.graceMinutesIn}m | Out: {s.graceMinutesOut}m</TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { 
                          setSelShiftId(s.id); 
                          setShiftForm({ 
                            name: s.name, 
                            startTime: s.startTime, 
                            endTime: s.endTime, 
                            departmentId: s.departmentId.toString(),
                            graceMinutesIn: s.graceMinutesIn.toString(),
                            graceMinutesOut: s.graceMinutesOut.toString(),
                            requiredHours: (s as any).requiredHours?.toString() || "8",
                            workDays: JSON.parse(s.workDays),
                            allowOvertime: (s as any).allowOvertime || false,
                            maxOvertimeEnd: (s as any).maxOvertimeEnd || "21:00",
                            isFlexible: (s as any).isFlexible || false,
                            flexibleDayStart: (s as any).flexibleDayStart || "06:00",
                            flexibleDayEnd: (s as any).flexibleDayEnd || "01:00"
                          }); 
                          setShiftEdit(true); 
                          setShiftOpen(true); 
                        }} className="rounded-xl"><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteShift.mutate(s.id)} className="text-destructive rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {shiftTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Showing {((shiftCurrentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(shiftCurrentPage * ITEMS_PER_PAGE, shiftList.length)} of {shiftList.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShiftCurrentPage(p => Math.max(1, p - 1))} disabled={shiftCurrentPage === 1} className="rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm font-medium px-2">Page {shiftCurrentPage} of {shiftTotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setShiftCurrentPage(p => Math.min(shiftTotalPages, p + 1))} disabled={shiftCurrentPage === shiftTotalPages} className="rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Location Dialog */}
      <Dialog open={locOpen} onOpenChange={setLocOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>{locEdit ? "Edit Location" : "Add Location"}</DialogTitle></DialogHeader>
          <form onSubmit={handleLocSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={locForm.name} onChange={e => setLocForm({...locForm, name: e.target.value})} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={locForm.departmentId} onValueChange={v => setLocForm({...locForm, departmentId: v})}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>
                  {departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Lat</Label><Input type="number" step="any" value={locForm.latitude} onChange={e => setLocForm({...locForm, latitude: e.target.value})} required className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Lng</Label><Input type="number" step="any" value={locForm.longitude} onChange={e => setLocForm({...locForm, longitude: e.target.value})} required className="rounded-xl" /></div>
            </div>
            <div className="space-y-2"><Label>Radius (m)</Label><Input type="number" value={locForm.radius} onChange={e => setLocForm({...locForm, radius: e.target.value})} required className="rounded-xl" /></div>
            <Button type="submit" className="w-full rounded-xl">Save Location</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shift Dialog */}
      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{shiftEdit ? "Edit Shift" : "Add Shift"}</DialogTitle></DialogHeader>
          <form onSubmit={handleShiftSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Shift Name</Label>
              <Input value={shiftForm.name} onChange={e => setShiftForm({...shiftForm, name: e.target.value})} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={shiftForm.departmentId} onValueChange={v => setShiftForm({...shiftForm, departmentId: v})}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>
                  {departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Time</Label><Input type="time" value={shiftForm.startTime} onChange={e => setShiftForm({...shiftForm, startTime: e.target.value})} required className="rounded-xl" /></div>
              <div className="space-y-2"><Label>End Time</Label><Input type="time" value={shiftForm.endTime} onChange={e => setShiftForm({...shiftForm, endTime: e.target.value})} required className="rounded-xl" /></div>
            </div>
            <div className="space-y-2">
                <Label>Required Hours</Label>
                <Input type="number" value={shiftForm.requiredHours} onChange={e => setShiftForm({...shiftForm, requiredHours: e.target.value})} required className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Grace In (min)</Label><Input type="number" value={shiftForm.graceMinutesIn} onChange={e => setShiftForm({...shiftForm, graceMinutesIn: e.target.value})} required className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Grace Out (min)</Label><Input type="number" value={shiftForm.graceMinutesOut} onChange={e => setShiftForm({...shiftForm, graceMinutesOut: e.target.value})} required className="rounded-xl" /></div>
            </div>
            <div className="space-y-2">
              <Label>Work Days</Label>
              <div className="grid grid-cols-4 gap-2">
                {DAYS.map(day => (
                  <div key={day.id} className="flex items-center space-x-2 bg-muted/30 p-2 rounded-lg">
                    <Checkbox id={day.id} checked={shiftForm.workDays.includes(day.id)} onCheckedChange={() => toggleWorkDay(day.id)} />
                    <Label htmlFor={day.id} className="text-xs">{day.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Overtime Settings */}
            <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">السماح بـ Overtime</Label>
                  <p className="text-xs text-muted-foreground">السماح للموظف بالخروج بعد وقت نهاية الشيفت</p>
                </div>
                <Switch checked={shiftForm.allowOvertime} onCheckedChange={(v) => setShiftForm({...shiftForm, allowOvertime: v})} />
              </div>
              {shiftForm.allowOvertime && (
                <div className="space-y-2">
                  <Label className="text-sm">أقصى وقت للخروج (Overtime)</Label>
                  <Input type="time" value={shiftForm.maxOvertimeEnd} onChange={e => setShiftForm({...shiftForm, maxOvertimeEnd: e.target.value})} className="rounded-xl" />
                </div>
              )}
            </div>

            {/* Flexible Shift Settings */}
            <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">شيفت مرن 🕐</Label>
                  <p className="text-xs text-muted-foreground">الموظف يدخل ويخرج أي وقت خلال اليوم (المهم يكمّل الساعات)</p>
                </div>
                <Switch checked={shiftForm.isFlexible} onCheckedChange={(v) => setShiftForm({...shiftForm, isFlexible: v})} />
              </div>
              {shiftForm.isFlexible && (
                <div className="space-y-3 mt-3">
                  <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                    ✨ الموظف يقدر يدخل ويخرج في أي وقت ضمن الفترة المحددة. النظام يحسب الساعات تلقائياً.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">بداية اليوم</Label>
                      <Input type="time" value={shiftForm.flexibleDayStart} onChange={e => setShiftForm({...shiftForm, flexibleDayStart: e.target.value})} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">إغلاق الشيفت</Label>
                      <Input type="time" value={shiftForm.flexibleDayEnd} onChange={e => setShiftForm({...shiftForm, flexibleDayEnd: e.target.value})} className="rounded-xl" />
                      <p className="text-xs text-muted-foreground">مثال: 01:00 = 1 صباحاً اليوم التالي</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <Button type="submit" className="w-full rounded-xl">Save Shift</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
