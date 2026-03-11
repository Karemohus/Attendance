import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { LogOut, MapPin, CalendarDays, Home, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n";

export function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { data: settings } = useQuery({ queryKey: [api.settings.get.path] });
  const [location] = useLocation();
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} className="h-5 w-5 object-contain" alt="Logo" />
            ) : (
              <MapPin className="h-5 w-5 text-primary" />
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {settings?.appName || "GeoTrack"}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold">{user?.name}</span>
            <span className="text-xs text-muted-foreground">ID: {user?.employeeId}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full hover-elevate active-elevate-2" 
            onClick={() => logout()}
            title={t('logout')}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <div className="flex-1 container mx-auto flex flex-col md:flex-row gap-6 p-4 sm:p-6 lg:p-8 max-w-6xl">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-2 sticky top-24">
            <Link href="/employee">
              <a className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location === '/employee' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                <Home className="h-5 w-5" />
                {language === 'ar' ? 'الرئيسية' : 'Home'}
              </a>
            </Link>
            <Link href="/employee/attendance">
              <a className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location === '/employee/attendance' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                <CalendarDays className="h-5 w-5" />
                {language === 'ar' ? 'سجل الحضور' : 'Attendance Logs'}
              </a>
            </Link>
            <Link href="/employee/qr-code">
              <a className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location === '/employee/qr-code' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                <QrCode className="h-5 w-5" />
                {language === 'ar' ? 'كود QR' : 'My QR Code'}
              </a>
            </Link>
          </nav>
        </aside>
        
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
