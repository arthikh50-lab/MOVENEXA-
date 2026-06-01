import React from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { 
  LogOut, Users, Truck, Package, 
  LayoutDashboard, Settings, CreditCard,
  Search, Bell, ChevronDown
} from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import NotificationBell from './NotificationBell.js';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-slate-50">
      {/* Mesh Gradient Background */}
      <div className="absolute top-0 right-0 -m-32 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 left-0 -m-32 w-96 h-96 bg-indigo-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-20 w-96 h-96 bg-purple-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      {/* Sidebar */}
      <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-white/50 hidden md:flex flex-col relative z-10 shadow-[4px_0_24px_rgb(0,0,0,0.02)]">
        <div className="h-16 flex items-center px-6 border-b border-slate-100/50">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3 shadow-sm">M</div>
          <span className="font-extrabold text-xl text-slate-900 tracking-tight">MoveNexa</span>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-1">
          <Link 
            to="/dashboard" 
            className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <LayoutDashboard className={`w-5 h-5 ${isActive('/dashboard') ? 'text-blue-600' : ''}`} />
            Dashboard
          </Link>
          <Link 
            to="/shipments" 
            className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg transition-colors ${isActive('/shipments') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Package className={`w-5 h-5 ${isActive('/shipments') ? 'text-blue-600' : ''}`} />
            Shipments
          </Link>
          <Link 
            to="/fleet" 
            className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg transition-colors ${isActive('/fleet') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Truck className={`w-5 h-5 ${isActive('/fleet') ? 'text-blue-600' : ''}`} />
            Fleet
          </Link>
          {user.role === 'admin' && (
            <>
              <Link 
                to="/team" 
                className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg transition-colors ${isActive('/team') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Users className={`w-5 h-5 ${isActive('/team') ? 'text-blue-600' : ''}`} />
                Team
              </Link>
              <Link 
                to="/subscription" 
                className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg transition-colors ${isActive('/subscription') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <CreditCard className={`w-5 h-5 ${isActive('/subscription') ? 'text-blue-600' : ''}`} />
                Subscription
              </Link>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100">
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10">
        {/* Top Navbar */}
        <header className="h-16 bg-white/60 backdrop-blur-xl border-b border-white/40 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 shadow-[0_4px_24px_rgb(0,0,0,0.02)]">
          <div className="flex items-center flex-1">
            <div className="max-w-md w-full relative hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search shipments, drivers, or routes..." 
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-700 leading-tight">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                {user.name.charAt(0)}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
