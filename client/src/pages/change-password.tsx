import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, ShieldCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { useLocation } from "wouter";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ variant: "destructive", title: "خطأ", description: "كلمة المرور لازم تكون 6 حروف على الأقل" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "خطأ", description: "كلمة المرور غير متطابقة" });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", api.auth.changePassword.path, { password });
      // تحديث بيانات المستخدم
      await queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      toast({ title: "تم بنجاح", description: "تم تغيير كلمة المرور" });
      
      // توجيه حسب الدور
      if (user?.role === "admin") setLocation("/admin");
      else if (user?.role === "supervisor") setLocation("/supervisor");
      else setLocation("/employee");
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل تغيير كلمة المرور" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir="rtl">
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 mb-4">
            <ShieldCheck className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold">تغيير كلمة المرور</h1>
          <p className="text-muted-foreground mt-2">
            لأمان حسابك، يجب تغيير كلمة المرور الافتراضية قبل المتابعة
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 حروف على الأقل"
                className="pr-10"
                required
                minLength={6}
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد كتابة كلمة المرور"
                className="pr-10"
                required
                minLength={6}
                dir="ltr"
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold" disabled={isSubmitting}>
            {isSubmitting ? "جاري التحديث..." : "تغيير كلمة المرور والمتابعة"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
