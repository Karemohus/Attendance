import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  MapPin, 
  Users, 
  Clock, 
  LogOut, 
  LayoutDashboard,
  Settings as SettingsIcon,
  Menu,
  Building2,
  FileBarChart
} from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { data: settings } = useQuery({ queryKey: [api.settings.get.path], refetchInterval: 5000 });
  const { t, language } = useLanguage();

  const navItems = [
    { title: t('nav.dashboard'), url: "/admin", icon: LayoutDashboard },
    { title: t('nav.departments'), url: "/admin/departments", icon: Building2 },
    { title: t('nav.locations'), url: "/admin/locations", icon: MapPin },
    { title: t('nav.employees'), url: "/admin/employees", icon: Users },
    { title: t('nav.attendance'), url: "/admin/attendance", icon: Clock },
    { title: language === 'ar' ? 'التقارير' : 'Reports', url: "/admin/reports", icon: FileBarChart },
    { title: t('nav.settings'), url: "/admin/settings", icon: SettingsIcon },
  ];

  const handleLogout = () => {
    logout();
  };

  const style = {
    "--sidebar-width": "16rem",
  } as React.CSSProperties;

  const isSupervisor = user?.role === "supervisor";

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full bg-muted/30" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {!isSupervisor && (
          <Sidebar className="border-r border-border/50 bg-card">
            <SidebarContent>
              <div className="p-6">
                <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
                  {settings?.logoUrl ? (
                    <img src={settings.logoUrl} className="h-8 w-8 object-contain" alt="Logo" />
                  ) : (
                    <MapPin className="h-6 w-6" />
                  )}
                  {settings?.appName || "GeoTrack"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'ar' ? 'لوحة الإدارة' : 'Admin Portal'}
                </p>
              </div>
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  {language === 'ar' ? 'الإدارة' : 'Management'}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navItems.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={location === item.url}
                          className={`hover-elevate active-elevate-2 font-medium rounded-lg mb-1 transition-all ${
                            location === item.url 
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          <Link href={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className="h-5 w-5" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              
              <div className="mt-auto p-4 border-t border-border/50">
                <div className="flex items-center gap-3 mb-4 px-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'مدير النظام' : 'Administrator'}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border hover-elevate active-elevate-2" 
                  onClick={handleLogout}
                >
                  <LogOut className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  {t('logout')}
                </Button>
              </div>
            </SidebarContent>
          </Sidebar>
        )}
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-10">
            <div className="flex items-center gap-4">
              {!isSupervisor && <SidebarTrigger className="md:hidden hover-elevate" />}
              <h1 className="text-xl font-semibold capitalize">
                {isSupervisor ? (language === 'ar' ? 'لوحة المشرف' : 'Supervisor Dashboard') : (location.split('/').pop() || 'Dashboard')}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              {isSupervisor && (
                <>
                  <div className="flex items-center gap-3 px-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {user?.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="hidden sm:flex flex-col">
                      <span className="text-xs font-semibold">{user?.name}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {language === 'ar' ? 'مشرف' : 'Supervisor'}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg h-8" 
                    onClick={handleLogout}
                  >
                    <LogOut className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    {t('logout')}
                  </Button>
                </>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
