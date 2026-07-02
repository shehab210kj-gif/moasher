import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, TableProperties, User } from 'lucide-react';
export function BottomNav() {
  const navItems = [
  {
    path: '/dashboard',
    icon: LayoutDashboard,
    label: 'الرئيسية'
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
    path: '/profile',
    icon: User,
    label: 'حسابي'
  }];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) =>
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
          `flex flex-col items-center justify-center w-16 py-2 gap-1 rounded-xl transition-colors ${isActive ? 'text-brand-600' : 'text-slate-500 hover:text-slate-900'}`
          }>
          
            {({ isActive }) =>
          <>
                <div
              className={`relative ${isActive ? 'bg-brand-50 p-1.5 rounded-lg' : 'p-1.5'}`}>
              
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span
              className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
              
                  {item.label}
                </span>
              </>
          }
          </NavLink>
        )}
      </div>
    </nav>);

}
