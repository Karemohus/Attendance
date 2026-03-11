import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "@/hooks/use-employees";
import { useLocations } from "@/hooks/use-locations";
import { useDepartments } from "@/hooks/use-departments";
import { useShifts } from "@/hooks/use-shifts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, UserPlus, Shield, MapPin, Edit2, Trash2, Clock, Key, Search, QrCode, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function AdminEmployees() {
  const { data: employees, isLoading } = useEmployees();
  const { data: locations } = useLocations();
  const { data: departments } = useDepartments();
  const { data: shifts } = useShifts();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [qrEmployee, setQrEmployee] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterLoc, setFilterLoc] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    email: "",
    password: "",
    role: "employee",
    departmentId: "none",
    locationId: "none",
    shiftId: "none",
    createLocation: false,
    newLocationName: "",
    newLocationLat: "",
    newLocationLng: "",
    newLocationRadius: "100",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        employeeId: formData.employeeId,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        departmentId: formData.departmentId === "none" ? null : Number(formData.departmentId),
        locationId: formData.locationId === "none" ? null : Number(formData.locationId),
        shiftId: formData.shiftId === "none" ? null : Number(formData.shiftId),
        ...(formData.createLocation ? {
          newLocation: {
            name: formData.newLocationName,
            latitude: Number(formData.newLocationLat),
            longitude: Number(formData.newLocationLng),
            radius: Number(formData.newLocationRadius),
            departmentId: formData.departmentId === "none" ? null : Number(formData.departmentId),
          }
        } : {})
      };

      if (isEdit && selectedId) {
        await updateEmployee.mutateAsync({ id: selectedId, data: payload });
        queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
        toast({ title: "Employee updated successfully" });
      } else {
        await createEmployee.mutateAsync(payload);
        queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
        toast({ title: "Employee created successfully" });
      }
      setIsOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      name: "",
      email: "",
      password: "",
      role: "employee",
      departmentId: "none",
      locationId: "none",
      shiftId: "none",
      createLocation: false,
      newLocationName: "",
      newLocationLat: "",
      newLocationLng: "",
      newLocationRadius: "100",
    });
    setIsEdit(false);
    setSelectedId(null);
  };

  const handleEdit = (emp: any) => {
    setSelectedId(emp.id);
    setFormData({
      employeeId: emp.employeeId,
      name: emp.name,
      email: emp.email || "",
      password: "",
      role: emp.role,
      departmentId: emp.departmentId?.toString() || "none",
      locationId: emp.locationId?.toString() || "none",
      shiftId: emp.shiftId?.toString() || "none",
      createLocation: false,
      newLocationName: "",
      newLocationLat: "",
      newLocationLng: "",
      newLocationRadius: "100",
    });
    setIsEdit(true);
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteEmployee.mutateAsync(id);
      toast({ title: "Employee deleted" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const filteredEmployees = employees?.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || 
                         emp.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === "all" || emp.departmentId?.toString() === filterDept;
    const matchesLoc = filterLoc === "all" || emp.locationId?.toString() === filterLoc;
    return matchesSearch && matchesDept && matchesLoc;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const availableLocations = locations?.filter(loc => 
    formData.departmentId === "none" || loc.departmentId.toString() === formData.departmentId
  );

  const availableShifts = shifts?.filter(shift => 
    formData.departmentId === "none" || shift.departmentId.toString() === formData.departmentId
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground mt-1">Manage staff access, departments, and location assignments.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(v) => { if (!v) resetForm(); setIsOpen(v); }}>
          <DialogTrigger asChild>
            <Button className="hover-elevate active-elevate-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">{isEdit ? "Edit Employee" : "Register New Employee"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input id="employeeId" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} placeholder="EMP001" required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" required className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" required={!isEdit} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" className="rounded-xl" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={formData.departmentId} onValueChange={(v) => setFormData({ ...formData, departmentId: v, locationId: "none", shiftId: "none" })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments?.map((dept) => <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Select value={formData.locationId} onValueChange={(v) => setFormData({ ...formData, locationId: v })} disabled={formData.createLocation || formData.departmentId === "none"}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableLocations?.map((loc) => <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Shift Selection */}
              <div className="space-y-2">
                <Label htmlFor="shift" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Shift (الشيفت)
                </Label>
                <Select value={formData.shiftId} onValueChange={(v) => setFormData({ ...formData, shiftId: v })} disabled={formData.departmentId === "none"}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select shift" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (بدون شيفت)</SelectItem>
                    {availableShifts?.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{shift.name}</span>
                          <span className="text-xs text-muted-foreground">({shift.startTime} - {shift.endTime})</span>
                          {(shift as any).isFlexible && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">مرن</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.departmentId === "none" && (
                  <p className="text-xs text-muted-foreground">اختر القسم أولاً لعرض الشيفتات المتاحة</p>
                )}
              </div>

              {!isEdit && (
                <div className="p-4 bg-muted/30 rounded-xl space-y-3 border border-border/50">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="createLocation" checked={formData.createLocation} onCheckedChange={(c) => setFormData({ ...formData, createLocation: !!c })} />
                    <Label htmlFor="createLocation" className="text-sm font-medium">Create custom location</Label>
                  </div>
                  {formData.createLocation && (
                    <div className="space-y-3 pt-2">
                      <Input placeholder="Name" value={formData.newLocationName} onChange={(e) => setFormData({...formData, newLocationName: e.target.value})} className="rounded-xl" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Lat" value={formData.newLocationLat} onChange={(e) => setFormData({...formData, newLocationLat: e.target.value})} className="rounded-xl" />
                        <Input placeholder="Lng" value={formData.newLocationLng} onChange={(e) => setFormData({...formData, newLocationLng: e.target.value})} className="rounded-xl" />
                      </div>
                      <Input placeholder="Radius (m)" value={formData.newLocationRadius} onChange={(e) => setFormData({...formData, newLocationRadius: e.target.value})} className="rounded-xl" />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={createEmployee.isPending || updateEmployee.isPending}>
                {isEdit ? "Update Employee" : "Complete Registration"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 mb-6 rounded-2xl border-border/50 bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search Name / ID..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9 rounded-xl" />
          </div>
          <Select value={filterDept} onValueChange={(v) => { setFilterDept(v); setFilterLoc("all"); setCurrentPage(1); }}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterLoc} onValueChange={(v) => { setFilterLoc(v); setCurrentPage(1); }}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="All Locations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations?.filter(l => filterDept === "all" || l.departmentId?.toString() === filterDept).map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : paginatedEmployees.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No employees found</TableCell></TableRow>
            ) : (
              paginatedEmployees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{emp.name.charAt(0)}</div>
                      {emp.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{emp.employeeId}</TableCell>
                  <TableCell className="capitalize">{emp.role}</TableCell>
                  <TableCell>{emp.department?.name || "-"}</TableCell>
                  <TableCell>
                    {(emp as any).shift ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <span className="text-sm">{(emp as any).shift.name}</span>
                        {(emp as any).shift.isFlexible && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">مرن</span>
                        )}
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{emp.location?.name || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setQrEmployee(emp)} className="rounded-xl" title="QR Code"><QrCode className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)} className="rounded-xl"><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="rounded-xl text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
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
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)} of {filteredEmployees.length} employees
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
                Page {currentPage} of {totalPages}
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

      {/* QR Code Modal */}
      <Dialog open={!!qrEmployee} onOpenChange={() => setQrEmployee(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code</DialogTitle>
          </DialogHeader>
          {qrEmployee && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-4 bg-white rounded-2xl shadow-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrEmployee.employeeId)}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{qrEmployee.name}</p>
                <p className="text-muted-foreground">ID: {qrEmployee.employeeId}</p>
                <p className="text-sm text-muted-foreground">{qrEmployee.department?.name}</p>
              </div>
              <Button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrEmployee.employeeId)}`;
                  link.download = `QR_${qrEmployee.employeeId}.png`;
                  link.click();
                }}
                className="w-full rounded-xl"
              >
                تحميل QR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
