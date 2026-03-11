import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { MapPin, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export default function Login() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const { login, isLoggingIn } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useQuery({ queryKey: [api.settings.get.path], refetchInterval: 5000 });

    const t = {
      welcome: { ar: "{t.welcome[lang]}", en: "Welcome to" },
      desc: { ar: "{t.desc[lang]}", en: "Advanced geofencing attendance system. Secure, reliable, and easy to use." },
      protection: { ar: "{t.protection[lang]}", en: "Enterprise-level protection and tracking system" },
      loginTitle: { ar: "تسجيل الدخول", en: "Login" },
      loginDesc: { ar: "{t.loginDesc[lang]}", en: "Enter employee ID and password to continue." },
      empId: { ar: "معرف الموظف", en: "Employee ID" },
      password: { ar: "كلمة المرور", en: "Password" },
      forgot: { ar: "{t.forgot[lang]}", en: "Forgot password?" },
      loginBtn: { ar: "دخول", en: "Login" },
      verifying: { ar: "جاري التحقق...", en: "Verifying..." },
      successTitle: { ar: "أهلاً بك!", en: "Welcome!" },
      successDesc: { ar: "تم تسجيل الدخول بنجاح.", en: "Logged in successfully." },
      errorTitle: { ar: "فشل الدخول", en: "Login Failed" },
      errorDesc: { ar: "بيانات الدخول غير صحيحة", en: "Invalid credentials" }
    };
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ employeeId, password });
      toast({
        title: t.successTitle[lang],
        description: t.successDesc[lang],
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.errorTitle[lang],
        description: error.message || t.errorDesc[lang],
      });
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background overflow-hidden" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Left panel - Decorative */}
      <div className="hidden lg:flex flex-1 relative bg-primary/5 items-center justify-center overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/20 blur-3xl opacity-50" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-lg p-12 glass-panel rounded-3xl text-right"
        >
          <div className="bg-primary p-4 rounded-2xl inline-block mb-6 shadow-lg shadow-primary/30">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} className="h-10 w-10 object-contain brightness-0 invert" alt="Logo" />
            ) : (
              <MapPin className="h-10 w-10 text-primary-foreground" />
            )}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            مرحباً بك في <br/><span className="text-primary">{settings?.appName || "GeoTrack"}</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            نظام متطور لمتابعة الحضور والانصراف بناءً على الموقع الجغرافي. آمن، موثوق، وسهل الاستخدام.
          </p>
          
          <div className="mt-8 flex items-center justify-end gap-4 text-sm font-medium text-muted-foreground">
            نظام حماية وتتبع بمستوى الشركات الكبرى
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
        </motion.div>
      </div>

      {/* Right panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
          <div className="absolute top-4 right-4 z-50">
            <Button variant="outline" size="sm" className="rounded-xl shadow-sm bg-card/50 backdrop-blur-sm" onClick={() => setLang(l => l === "ar" ? "en" : "ar")}>
              {lang === "ar" ? "English" : "العربية"}
            </Button>
          </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8 lg:hidden">
            <div className="bg-primary/10 p-3 rounded-2xl inline-block mb-4">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} className="h-8 w-8 object-contain" alt="Logo" />
              ) : (
                <MapPin className="h-8 w-8 text-primary" />
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{settings?.appName || "GeoTrack"}</h1>
          </div>

          <Card className="p-8 shadow-2xl border-border/50 rounded-2xl bg-card/90 backdrop-blur-sm text-right">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">{t.loginTitle[lang]}</h2>
              <p className="text-muted-foreground text-sm">أدخل معرف الموظف وكلمة المرور للمتابعة.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="employeeId" className="text-sm font-medium">{t.empId[lang]}</Label>
                <Input
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="مثال: EMP001"
                  required
                  className="text-left h-12 px-4 rounded-xl border-border/50 bg-background focus:ring-primary/20 focus:border-primary transition-all"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between flex-row-reverse">
                  <Label htmlFor="password" className="text-sm font-medium">{t.password[lang]}</Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    نسيت كلمة المرور؟
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 px-4 rounded-xl border-border/50 bg-background focus:ring-primary/20 focus:border-primary transition-all text-left"
                  dir="ltr"
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover-elevate active-elevate-2 group flex flex-row-reverse items-center justify-center gap-2"
              >
                {isLoggingIn ? t.verifying[lang] : t.loginBtn[lang]}
                {!isLoggingIn && <ArrowRight className="h-5 w-5 rotate-180 group-hover:-translate-x-1 transition-transform" />}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
