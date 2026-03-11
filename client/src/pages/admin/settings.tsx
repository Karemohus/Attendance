import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Loader2, Save, Upload } from "lucide-react";
import { z } from "zod";
import { useState } from "react";

const settingsSchema = z.object({
  appName: z.string().min(1, "اسم التطبيق مطلوب"),
  logoUrl: z.string().optional(),
  resendApiKey: z.string().optional(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function AdminSettings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.settings.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (data: SettingsForm) => {
      const res = await apiRequest(api.settings.update.method, api.settings.update.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path] });
      toast({ title: "تم التحديث", description: "تم حفظ الإعدادات بنجاح" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    },
  });

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: settings || { appName: "نظام الحضور", logoUrl: "" },
  });

  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("logoUrl", reader.result as string);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل رفع اللوجو" });
      setUploading(false);
    }
  };

  const onSubmit = (data: SettingsForm) => {
    const payload: Partial<SettingsForm> = {};
    if (data.appName !== settings?.appName) payload.appName = data.appName;
    if (data.logoUrl !== settings?.logoUrl) payload.logoUrl = data.logoUrl || null;
    if (data.resendApiKey && data.resendApiKey !== "re_********") payload.resendApiKey = data.resendApiKey;

    if (Object.keys(payload).length === 0) {
      toast({ title: "لا توجد تغييرات", description: "لم يتم تعديل أي حقول" });
      return;
    }
    updateSettings.mutate(payload as SettingsForm);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">إعدادات النظام</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>الإعدادات العامة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2 text-right">
                <Label htmlFor="appName">اسم التطبيق</Label>
                <Input id="appName" {...form.register("appName")} className="text-right" />
                {form.formState.errors.appName && (
                  <p className="text-sm text-destructive">{form.formState.errors.appName.message}</p>
                )}
              </div>

              <div className="space-y-2 text-right">
                <Label htmlFor="resendApiKey">Resend API Key (لإرسال الإيميلات)</Label>
                <Input id="resendApiKey" type="password" {...form.register("resendApiKey")} className="text-right font-mono" placeholder="re_..." />
              </div>

              <div className="space-y-4 text-right">
                <Label>لوجو التطبيق</Label>
                <div className="flex flex-row-reverse items-center gap-6">
                  <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
                    {form.watch("logoUrl") ? (
                      <img src={form.watch("logoUrl")} alt="Logo Preview" className="h-full w-full object-contain" />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex gap-2">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload}
                        className="max-w-xs"
                        disabled={uploading}
                      />
                      {form.watch("logoUrl") && (
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => form.setValue("logoUrl", "")}
                        >
                          حذف اللوجو
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      يفضل رفع صورة مربعة. الحد الأقصى 2 ميجابايت.
                    </p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="ml-2 h-4 w-4" />
                )}
                حفظ الإعدادات
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
