import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import { useLocation, Link } from "wouter";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [search] = useLocation();
  const { toast } = useToast();
  
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast({ variant: "destructive", title: "خطأ", description: "كلمات المرور غير متطابقة" });
    }
    if (!token) {
      return toast({ variant: "destructive", title: "خطأ", description: "رمز التحقق غير صالح" });
    }

    setLoading(true);
    try {
      await apiRequest(api.auth.resetPassword.method, api.auth.resetPassword.path, { token, password });
      setSuccess(true);
      toast({ title: "تم بنجاح", description: "تم تغيير كلمة المرور بنجاح" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6" dir="rtl">
        <Card className="w-full max-w-md p-8 text-center shadow-2xl border-border/50 rounded-2xl bg-card">
          <div className="bg-emerald-100 p-4 rounded-full inline-block mb-6">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">تم التغيير بنجاح</h2>
          <p className="text-muted-foreground mb-8">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</p>
          <Link href="/login">
            <Button className="w-full h-12 rounded-xl text-lg font-semibold">توجه للدخول</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6" dir="rtl">
      <Card className="w-full max-w-md p-8 shadow-2xl border-border/50 rounded-2xl bg-card text-right">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">إعادة تعيين كلمة المرور</h2>
          <p className="text-muted-foreground text-sm">أدخل كلمة المرور الجديدة الخاصة بك.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 px-4 pr-10 rounded-xl text-right"
                required
              />
              <Lock className="absolute right-3 top-3.5 h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 px-4 pr-10 rounded-xl text-right"
                required
              />
              <Lock className="absolute right-3 top-3.5 h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-lg font-semibold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "تغيير كلمة المرور"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
