import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/auth';

export type AdminReportRow = {
  id: string;
  created_at: string | null;
  recommendation: string | null;
  risk_level: string | null;
  investment_score: number | null;
  estimated_price: number | null;
  user_id: string;
  profiles?: { email: string | null; full_name: string | null } | null;
  properties?: { city: string | null; district: string | null; property_type: string | null } | null;
};

export type AdminStats = {
  users: number;
  reports: number;
  properties: number;
  transactions: number;
  comparables: number;
};

export type AdminDashboardData = {
  stats: AdminStats;
  users: UserProfile[];
  reports: AdminReportRow[];
};

type AdminReportQueryRow = Omit<AdminReportRow, 'profiles' | 'properties'> & {
  properties?: AdminReportRow['properties'] | AdminReportRow['properties'][] | null;
};

async function getTableCount(table: string) {
  if (!supabase) return 0;
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      stats: { users: 0, reports: 0, properties: 0, transactions: 0, comparables: 0 },
      users: [],
      reports: [],
    };
  }

  const [users, reports, propertiesCount, transactionsCount, comparablesCount] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, subscription_plan, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('analysis_reports')
      .select(`
        id,
        created_at,
        recommendation,
        risk_level,
        investment_score,
        estimated_price,
        user_id,
        properties:property_id(city, district, property_type)
      `)
      .order('created_at', { ascending: false })
      .limit(25),
    getTableCount('properties'),
    getTableCount('transactions'),
    getTableCount('comparables'),
  ]);

  if (users.error) throw users.error;
  if (reports.error) throw reports.error;

  const profileById = new Map((users.data ?? []).map((user) => [user.id, user]));

  return {
    stats: {
      users: await getTableCount('profiles'),
      reports: await getTableCount('analysis_reports'),
      properties: propertiesCount,
      transactions: transactionsCount,
      comparables: comparablesCount,
    },
    users: (users.data ?? []) as UserProfile[],
    reports: ((reports.data ?? []) as AdminReportQueryRow[]).map((report) => {
      const property = Array.isArray(report.properties) ? report.properties[0] ?? null : report.properties ?? null;
      return {
        ...report,
        properties: property,
        profiles: profileById.get(report.user_id) ?? null,
      };
    }),
  };
}
