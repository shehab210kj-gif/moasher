import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  delay?: number;
}
export function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  delay = 0
}: KPICardProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        duration: 0.4,
        delay
      }}
      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
          <Icon size={24} />
        </div>
        {trend &&
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${trend.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}
          dir="ltr">
          
            {trend.isPositive ? '+' : '-'}
            {trend.value}
          </span>
        }
      </div>
      <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </motion.div>);

}
