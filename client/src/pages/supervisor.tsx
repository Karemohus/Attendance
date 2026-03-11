import { useState } from "react";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Building2, Mail, BadgeCheck, Users, Search, Loader2 } from "lucide-react";
import { insertEmployeeSchema } from "@shared/schema";

import { useEmployees, useCreateEmployee } from "@/hooks/use-employees";
import { useAttendance } from "@/hooks/use-attendance";

import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Re-using the schema directly for the form
const formSchema = insertEmployeeSchema;
type FormValues = z.infer<typeof formSchema>;

export default function SupervisorDashboard() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Data Hooks
  const { data: employees, isLoading: loadingEmployees } = useEmployees();
  const { data: attendance, isLoading: loadingAttendance } = useAttendance();
  const createEmployee = useCreateEmployee();

  // Form Setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      department: "",
      role: "employee",
    },
  });

  const onSubmit = (values: FormValues) => {
    createEmployee.mutate(values, {
      onSuccess: () => {
        setIsAddOpen(false);
        form.reset();
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "present":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200";
      case "absent":
        return "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200";
      case "late":
        return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-10">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Supervisor Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage your department employees and monitor attendance.</p>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="font-medium shadow-sm hover:shadow">
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Add New Employee</DialogTitle>
                <DialogDescription>
                  Enter the details of the new employee to add them to your department.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="jane.doe@company.com" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Engineering, Sales" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Senior Engineer" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createEmployee.isPending}>
                      {createEmployee.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Employee"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dashboard Content */}
        <Tabs defaultValue="employees" className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 p-1 bg-slate-100 rounded-xl">
            <TabsTrigger value="employees" className="rounded-lg text-sm font-medium">
              <Users className="w-4 h-4 mr-2" /> Employees
            </TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-lg text-sm font-medium">
              <BadgeCheck className="w-4 h-4 mr-2" /> Attendance
            </TabsTrigger>
          </TabsList>

          {/* Employees Tab */}
          <TabsContent value="employees" className="mt-6 focus-visible:outline-none">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-800">Department Roster</h2>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    type="search" 
                    placeholder="Search employees..." 
                    className="h-9 pl-9 w-[200px] sm:w-[250px] bg-white text-sm"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="font-medium text-slate-500">Employee Name</TableHead>
                      <TableHead className="font-medium text-slate-500">Contact</TableHead>
                      <TableHead className="font-medium text-slate-500">Department</TableHead>
                      <TableHead className="font-medium text-slate-500">Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingEmployees ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                          Loading employees...
                        </TableCell>
                      </TableRow>
                    ) : !employees || employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                          No employees found. Add your first employee to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((employee) => (
                        <TableRow key={employee.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="font-medium text-slate-900">
                            {employee.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-slate-600 text-sm">
                              <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                              {employee.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-slate-600 text-sm">
                              <Building2 className="w-3.5 h-3.5 mr-2 text-slate-400" />
                              {employee.department}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">
                              {employee.role}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="mt-6 focus-visible:outline-none">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-semibold text-slate-800">Recent Attendance Logs</h2>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="font-medium text-slate-500">Date</TableHead>
                      <TableHead className="font-medium text-slate-500">Employee</TableHead>
                      <TableHead className="font-medium text-slate-500">Department</TableHead>
                      <TableHead className="font-medium text-slate-500 text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingAttendance ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                          Loading attendance records...
                        </TableCell>
                      </TableRow>
                    ) : !attendance || attendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                          No attendance records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendance.map((record) => (
                        <TableRow key={record.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="text-slate-600 font-medium">
                            {format(new Date(record.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-900">
                              {record.employee.name}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {record.employee.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-slate-600">
                              {record.employee.department}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={`${getStatusColor(record.status)} border px-2.5 py-0.5 font-semibold`}>
                              {record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
}
