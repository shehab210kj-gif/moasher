import { useNavigate, NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  Map,
  TableProperties,
  CreditCard,
  User,
  LogOut,
  BarChart3 } from
'lucide-react';
export function Sidebar() {
  const navigate = useNavigate();
  const navItems = [
  {
    path: '/dashboard',
    icon: LayoutDashboard,
    label: 'لوحة التحكم'
  },
  {
    path: '/map',
    icon: Map,
    label: 'الخريطة'
  },
  {
    path: '/table',
    icon: TableProperties,
    label: 'البيانات'
  },
  {
    path: '/subscription',
    icon: CreditCard,
    label: 'الاشتراك'
  }];

  const handleLogout = async () => {
    try {
      await supabase?.auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-l border-slate-200 h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-sm">
          <BarChart3 size={24} />
        </div>
        <span className="text-2xl font-bold text-slate-800 tracking-tight">
          مؤشر
        </span>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) =>
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-brand-50 text-brand-600 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
          }>
          
            <item.icon size={20} className="shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        )}
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-2">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
          
          <User size={20} />
          <span>الملف الشخصي</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors">
          
          <LogOut size={20} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>);

}
