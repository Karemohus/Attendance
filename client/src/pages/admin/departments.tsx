import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from "@/hooks/use-departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
import { Plus, Trash2, Edit2, Building2, QrCode, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDepartments() {
  const { data: departments, isLoading } = useDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [selId, setSelId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", region: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (edit && selId) {
        await updateDept.mutateAsync({ id: selId, data: form });
        toast({ title: "Department updated" });
      } else {
        await createDept.mutateAsync(form);
        toast({ title: "Department created" });
      }
      setOpen(false);
      reset();
    } catch (error: any) { 
      toast({ variant: "destructive", title: "Error", description: error.message }); 
    }
  };

  const reset = () => { 
    setForm({ name: "", region: "" }); 
    setEdit(false); 
    setSelId(null); 
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Departments</h2>
            <p className="text-muted-foreground mt-1">Manage organizational departments and regions.</p>
          </div>
          <Button onClick={() => { reset(); setOpen(true); }} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Department
          </Button>
        </div>

        <Card className="rounded-2xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Department Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Kiosk Link</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : departments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No departments found</TableCell>
                </TableRow>
              ) : (
                departments?.map(dept => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {dept.name}
                    </TableCell>
                    <TableCell>{dept.region}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">/kiosk/{dept.id}</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-lg"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/kiosk/${dept.id}`);
                            toast({ title: "تم نسخ الرابط" });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-lg"
                          onClick={() => window.open(`/kiosk/${dept.id}`, '_blank')}
                        >
                          <QrCode className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { 
                        setSelId(dept.id); 
                        setForm({ name: dept.name, region: dept.region }); 
                        setEdit(true); 
                        setOpen(true); 
                      }} className="rounded-xl">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        if (confirm("Are you sure? This will delete all locations and shifts linked to this department.")) {
                          deleteDept.mutate(dept.id);
                        }
                      }} className="text-destructive rounded-xl">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>{edit ? "Edit Department" : "Add Department"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="rounded-xl" placeholder="e.g. Engineering" />
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Input value={form.region} onChange={e => setForm({...form, region: e.target.value})} required className="rounded-xl" placeholder="e.g. North America" />
            </div>
            <Button type="submit" className="w-full rounded-xl">Save Department</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}