import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest(api.auth.forgotPassword.method, api.auth.forgotPassword.path, { email });
      toast({ title: "تم الإرسال", description: "إذا كان البريد مسجلاً، فسيصلك رابط إعادة التعيين." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6" dir="rtl">
      <Card className="w-full max-w-md p-8 shadow-2xl border-border/50 rounded-2xl bg-card text-right">
        <Link href="/login">
          <a className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            العودة للدخول
          </a>
        </Link>
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">استعادة كلمة المرور</h2>
          <p className="text-muted-foreground text-sm">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="h-12 px-4 pr-10 rounded-xl text-right"
                required
              />
              <Mail className="absolute right-3 top-3.5 h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-lg font-semibold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "إرسال رابط الاستعادة"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
