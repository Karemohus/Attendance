import { ReactNode } from "react";
import { LayoutDashboard, Users, Clock } from "lucide-react";
import { Link, useLocation } from "wouter";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex w-full bg-slate-50/50">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white flex-shrink-0 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 font-display font-bold text-lg text-slate-900 tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <LayoutDashboard size={18} />
            </div>
            Nexus<span className="text-slate-400">Manage</span>
          </div>
        </div>
        
        <nav className="p-4 flex-1 space-y-1">
          <Link 
            href="/supervisor" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
              location === '/supervisor' 
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/5' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users size={18} />
            Supervisor Dashboard
          </Link>
          <div className="pt-4 pb-2 px-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reports</p>
          </div>
          <Link 
            href="/supervisor?tab=attendance" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
              location.includes('tab=attendance')
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/5' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Clock size={18} />
            Attendance Logs
          </Link>
        </nav>
        
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700">
              SV
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">Supervisor</p>
              <p className="text-xs text-slate-500 truncate">Management</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center px-4 md:px-8 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <h1 className="text-xl font-display font-semibold text-slate-900 md:hidden">NexusManage</h1>
          <div className="flex-1" />
        </header>
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
