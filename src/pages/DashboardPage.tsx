import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Database,
  FileText,
  Gauge,
  Home,
  LineChart,
  Loader2,
  Plus,
  Search,
  Settings,
  Shield,
  Target,
  LogOut,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MarketExplorerMap } from '../components/map/MarketExplorerMap';
import { PropertyLocationPicker } from '../components/map/PropertyLocationPicker';
import { getDistricts, getMarketIndicators, getPropertyTypes } from '../lib/data';
import { validatePropertyInput, buildReport } from '../lib/reportBuilder';
import { defaultPropertyInput, formatSar, PropertyInput, ReportData } from '../lib/muasher';
import { useAuth } from '../lib/auth';
import { AdminDashboardData, getAdminDashboardData } from '../services/adminService';
import { ApiMarketIndicators, getMarketStats } from '../services/modelApi';
import { getReports, saveReport as saveGeneratedReport } from '../services/reportService';
import { useI18n } from '../lib/i18n';

type AppPage = 'dashboard' | 'new-analysis' | 'reports' | 'market' | 'settings' | 'admin';

export function DashboardPage({ page }: { page: AppPage }) {
  const { dir } = useI18n();
  return (
    <div className="surface-page text-slate-950" dir={dir}>
      <AppShell>
        {page === 'dashboard' && <DashboardHome />}
        {page === 'new-analysis' && <NewAnalysis />}
        {page === 'reports' && <ReportsList />}
        {page === 'market' && <MarketExplorer />}
        {page === 'settings' && <SettingsPage />}
        {page === 'admin' && <AdminPanel />}
      </AppShell>
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const nav = [
    ['/app/dashboard', Home, t('navDashboard')],
    ['/app/new-analysis', Plus, t('navNewAnalysis')],
    ['/app/reports', FileText, t('navReports')],
    ['/app/market', BarChart3, t('navMarket')],
    ['/app/settings', Settings, t('navSettings')],
    ...(isAdmin ? [['/admin', Shield, t('adminTitle')] as const] : []),
  ] as const;

  return (
    <div className="flex">
      <aside className="fixed inset-y-0 right-0 hidden w-72 border-l border-emerald-950/10 bg-white/90 p-4 shadow-xl shadow-emerald-950/5 backdrop-blur lg:block">
        <Link to="/" className="mb-8 flex items-center gap-3 px-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-white"><Target size={20} /></span>
          <span className="text-lg font-black">{t('appName')}</span>
        </Link>
        <nav className="space-y-1">
          {nav.map(([path, Icon, label]) => (
            <Link key={path} to={path} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800">
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-600">
          <div className="text-slate-400">مسجّل الدخول بواسطة:</div>
          <div className="truncate text-slate-900">{user?.email}</div>
        </div>
        <button onClick={() => signOut()} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-50">
          <LogOut size={16} /> {t('logout')}
        </button>
      </aside>
      <main className="min-w-0 flex-1 p-4 lg:mr-72 lg:p-8">
        {children}
      </main>
    </div>
  );
}

function DashboardHome() {
  const { t } = useI18n();
  const [reports, setReports] = useState<ReportData[]>([]);

  useEffect(() => {
    getReports().then(setReports).catch((error) => console.error('Failed to load reports', error));
  }, []);

  const chartData = useMemo(() => {
    const byCity = reports.reduce<Record<string, number>>((acc, report) => {
      acc[report.property.city] = (acc[report.property.city] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(byCity).map(([city, count]) => ({ city, reports: count }));
  }, [reports]);

  const scoreData = useMemo(() => {
    const buckets = [
      { name: 'Strong', value: reports.filter((report) => report.summary.investmentScore >= 85).length, color: '#059669' },
      { name: 'Good', value: reports.filter((report) => report.summary.investmentScore >= 70 && report.summary.investmentScore < 85).length, color: '#0284c7' },
      { name: 'Average', value: reports.filter((report) => report.summary.investmentScore >= 55 && report.summary.investmentScore < 70).length, color: '#d97706' },
      { name: 'Weak', value: reports.filter((report) => report.summary.investmentScore < 55).length, color: '#dc2626' },
    ];
    return buckets.some((bucket) => bucket.value > 0) ? buckets : [{ name: 'No reports', value: 1, color: '#cbd5e1' }];
  }, [reports]);

  const averageScore = reports.length ? Math.round(reports.reduce((sum, report) => sum + report.summary.investmentScore, 0) / reports.length) : 0;
  const bestDistrict = reports[0]?.property.district || 'No reports yet';

  return (
    <PageHeader title={t('dashboardTitle')} subtitle={t('dashboardSubtitle')}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={FileText} label={t('reportsThisMonth')} value={String(reports.length)} detail="Supabase" />
        <Metric icon={Gauge} label={t('averageScore')} value={String(averageScore)} detail={t('investmentScore')} />
        <Metric icon={Building2} label={t('latestDistrict')} value={bestDistrict} detail={t('marketTitle')} />
        <Metric icon={AlertTriangle} label={t('mediumRisks')} value={String(reports.filter((report) => report.summary.riskLevel !== 'Low').length)} detail={t('riskAnalysis')} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title={t('activeReports')}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.length ? chartData : [{ city: 'No reports', reports: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="city" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="reports" fill="#0f172a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={t('investmentScore')}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={scoreData} innerRadius={68} outerRadius={95} dataKey="value" paddingAngle={4}>
                  {scoreData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <ReportsList compact />
    </PageHeader>
  );
}

function NewAnalysis() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const districts = useMemo(() => getDistricts(), []);
  const propertyTypes = useMemo(() => getPropertyTypes(), []);
  const [form, setForm] = useState<PropertyInput>({
    ...defaultPropertyInput,
    district: districts[0] ?? '',
    propertyType: propertyTypes[0] ?? defaultPropertyInput.propertyType,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const market = useMemo(() => getMarketIndicators(form), [form]);

  const update = (key: keyof PropertyInput, value: string | boolean | null) => {
    setForm((current) => {
      const currentValue = current[key];
      const nextValue = typeof currentValue === 'number' || currentValue === null ? (value === '' || value === null ? null : Number(value)) : value;
      const next = { ...current, [key]: nextValue } as PropertyInput;
      return {
        ...next,
        pricePerSqm: next.areaSqm > 0 ? Math.round(next.askingPrice / next.areaSqm) : 0,
      };
    });
  };

  const submit = async () => {
    const validationErrors = validatePropertyInput(form, {
      city: t('validationCity'),
      district: t('validationDistrict'),
      propertyType: t('validationPropertyType'),
      area: t('validationArea'),
      askingPrice: t('validationAskingPrice'),
    });
    setErrors(validationErrors);
    if (validationErrors.length) return;

    setLoading(true);
    try {
      const report = await buildReport(form, language);
      const savedReport = await saveGeneratedReport(report);
      navigate(`/app/reports/${savedReport.id}`, { state: { report: savedReport } });
    } catch (error) {
      console.error('Failed to generate report', error);
      setErrors([
        error instanceof Error
          ? `تعذر إنشاء التقرير: ${error.message}`
          : 'تعذر إنشاء التقرير. حاول مرة أخرى أو تأكد من تشغيل خدمة التقييم.',
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageHeader title={t('newAnalysisTitle')} subtitle={t('newAnalysisSubtitle')}>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Panel title={t('propertyData')}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('city')} value={form.city} onChange={(value) => update('city', value)} />
            <label className="block">
              <span className="text-xs font-black uppercase text-slate-500">{t('district')}</span>
              <select value={form.district} onChange={(event) => update('district', event.target.value)} className="field-input">
                {districts.map((district) => <option key={district}>{district}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase text-slate-500">{t('propertyType')}</span>
              <select value={form.propertyType} onChange={(event) => update('propertyType', event.target.value)} className="field-input">
                {propertyTypes.map((propertyType) => <option key={propertyType}>{propertyType}</option>)}
              </select>
            </label>
            <Field label={t('landUse')} value={form.landUse} onChange={(value) => update('landUse', value)} />
            <Field label={t('areaSqm')} type="number" value={form.areaSqm} onChange={(value) => update('areaSqm', value)} />
            <Field label={t('askingPrice')} type="number" value={form.askingPrice} onChange={(value) => update('askingPrice', value)} />
            <Field label={t('pricePerSqm')} type="number" value={form.pricePerSqm} onChange={() => undefined} readOnly />
          </div>

          <h3 className="mt-8 text-sm font-black uppercase text-slate-500">{t('location')}</h3>
          <div className="mt-4">
            <PropertyLocationPicker
              value={{ latitude: form.latitude, longitude: form.longitude }}
              district={form.district}
              onChange={(location) => setForm((current) => ({ ...current, latitude: location.latitude, longitude: location.longitude }))}
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label={t('latitude')} type="number" value={form.latitude ?? ''} onChange={(value) => update('latitude', value)} />
            <Field label={t('longitude')} type="number" value={form.longitude ?? ''} onChange={(value) => update('longitude', value)} />
          </div>

          <h3 className="mt-8 text-sm font-black uppercase text-slate-500">{t('propertyDetails')}</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label={t('streetWidth')} type="number" value={form.streetWidth} onChange={(value) => update('streetWidth', value)} />
            <Field label={t('frontage')} type="number" value={form.frontage} onChange={(value) => update('frontage', value)} />
            <label className="flex items-center gap-3 rounded-lg border border-slate-300 px-3 py-3 text-sm font-bold">
              <input type="checkbox" checked={form.isCorner} onChange={(event) => update('isCorner', event.target.checked)} />
              {t('cornerPlot')}
            </label>
          </div>

          <h3 className="mt-8 text-sm font-black uppercase text-slate-500">معايير التقييم الرسمية (TAQEEM)</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase text-slate-500">الغرض من التقييم</span>
              <select value={form.purpose} onChange={(event) => update('purpose', event.target.value)} className="field-input">
                <option value="purchase">شراء</option>
                <option value="sale">بيع</option>
                <option value="financing">تمويل رهن عقاري</option>
                <option value="taxation">نزع ملكية منفعة عامة</option>
                <option value="estate">تقسيم إرث</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-slate-500">نوع الملكية</span>
              <select value={form.ownership} onChange={(event) => update('ownership', event.target.value)} className="field-input">
                <option value="absolute">ملكية مطلقة (حرة)</option>
                <option value="restricted">ملكية مقيدة (مرهونة)</option>
                <option value="leasehold">حق منفعة (إيجار طويل)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-slate-500">طبيعة تضاريس الأرض</span>
              <select value={form.terrain} onChange={(event) => update('terrain', event.target.value)} className="field-input">
                <option value="flat">مستوية (Flat)</option>
                <option value="elevated">مرتفعة (Elevated)</option>
                <option value="depressed">منخفضة / غير مستوية (Depressed)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-slate-500">اتجاه الواجهة الرئيسية</span>
              <select value={form.frontageDirection} onChange={(event) => update('frontageDirection', event.target.value)} className="field-input">
                <option value="east">شرقية (East)</option>
                <option value="north">شمالية (North)</option>
                <option value="west">غربية (West)</option>
                <option value="south">جنوبية (South)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-slate-500">سهولة الوصول للعقار</span>
              <select value={form.accessibility} onChange={(event) => update('accessibility', event.target.value)} className="field-input">
                <option value="main_street">طريق رئيسي مباشر</option>
                <option value="secondary_street">شارع فرعي</option>
                <option value="inner_alley">ممر داخلي ضيق</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-slate-500">حالة الصيانة الفنية</span>
              <select value={form.maintenance} onChange={(event) => update('maintenance', event.target.value)} className="field-input">
                <option value="excellent">ممتازة (شبه جديد/مجدد)</option>
                <option value="good">جيدة (جاهز للاستخدام)</option>
                <option value="fair">متوسطة (بحاجة لصيانة خفيفة)</option>
                <option value="poor">سيئة (تالف/بحاجة لترميم كامل)</option>
              </select>
            </label>

            <Field label="عمر المبنى (بالسنوات)" type="number" value={form.buildingAge} onChange={(value) => update('buildingAge', value)} />
          </div>

          <h3 className="mt-8 text-sm font-black uppercase text-slate-500">{t('assumptions')}</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label={t('expectedRent')} type="number" value={form.expectedRent} onChange={(value) => update('expectedRent', value)} />
            <Field label={t('developmentCost')} type="number" value={form.developmentCost} onChange={(value) => update('developmentCost', value)} />
            <Field label={t('holdingPeriod')} type="number" value={form.holdingPeriod} onChange={(value) => update('holdingPeriod', value)} />
            <Field label={t('targetRoi')} type="number" value={form.targetRoi} onChange={(value) => update('targetRoi', value)} />
          </div>
        </Panel>

        <Panel title={t('marketPreview')}>
          <div className="rounded-lg bg-slate-950 p-5 text-white">
            <div className="text-sm font-black text-slate-400">مؤشرات قاعدة البيانات</div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <PreviewMetric label={t('avgSqm')} value={formatSar(market.averagePricePerSqm)} />
              <PreviewMetric label={t('medianSqm')} value={formatSar(market.medianPricePerSqm)} />
              <PreviewMetric label={t('transactions')} value={String(market.transactionsCount)} />
              <PreviewMetric label={t('liquidity')} value={`${market.liquidityScore}/100`} />
            </div>
          </div>
          {errors.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {errors.map((error) => <div key={error}>{error}</div>)}
            </div>
          )}
          <button
            onClick={submit}
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {t('generateReport')}
          </button>
          <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
            {t('storageNote')}
          </p>
        </Panel>
      </div>
    </PageHeader>
  );
}

function ReportsList({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState('');

  useEffect(() => {
    let active = true;
    setLoadingReports(true);
    setReportsError('');
    getReports()
      .then((items) => {
        if (active) setReports(items);
      })
      .catch((error) => {
        console.error('Failed to load reports', error);
        if (active) setReportsError('تعذر تحميل التقارير. سيتم عرض أي تقارير محفوظة محليًا عند توفرها.');
      })
      .finally(() => {
        if (active) setLoadingReports(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <PageHeader title={compact ? t('activeReports') : t('reportsTitle')} subtitle={compact ? '' : t('reportsSubtitle')} compact={compact}>
      {!compact && (
        <div className="mb-4 flex max-w-xl items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input className="w-full bg-transparent text-sm font-bold outline-none" placeholder={t('searchReports')} />
        </div>
      )}
      {reportsError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          {reportsError}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t('report')}</th>
              <th className="px-4 py-3">{t('fairRange')}</th>
              <th className="px-4 py-3">{t('score')}</th>
              <th className="px-4 py-3">{t('recommendation')}</th>
              <th className="px-4 py-3">{t('action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loadingReports && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center font-bold text-slate-500">
                  <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading reports...</span>
                </td>
              </tr>
            )}
            {!loadingReports && reports.map((report) => (
              <tr key={report.id}>
                <td className="px-4 py-4 font-black">{report.property.district} {report.property.propertyType}</td>
                <td className="px-4 py-4 font-bold text-slate-600">{formatSar(report.valuation.fairValueMin)} - {formatSar(report.valuation.fairValueMax)}</td>
                <td className="px-4 py-4 font-black">{report.summary.investmentScore}</td>
                <td className="px-4 py-4"><span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">{report.summary.recommendation}</span></td>
                <td className="px-4 py-4">
                  <Link to={`/app/reports/${report.id}`} state={{ report }} className="font-black text-slate-950 underline underline-offset-4">{t('open')}</Link>
                </td>
              </tr>
            ))}
            {!loadingReports && reports.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center font-bold text-slate-500">{t('noReports')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageHeader>
  );
}

function MarketExplorer() {
  const { t } = useI18n();
  const districts = useMemo(() => getDistricts(), []);
  const propertyTypes = useMemo(() => getPropertyTypes(), []);
  const [district, setDistrict] = useState(districts[0] ?? '');
  const [propertyType, setPropertyType] = useState(propertyTypes[0] ?? '');
  const localMarket = useMemo(
    () => getMarketIndicators({ ...defaultPropertyInput, district, propertyType, areaSqm: 1, askingPrice: 1 }),
    [district, propertyType]
  );
  const [apiMarket, setApiMarket] = useState<ApiMarketIndicators | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const market = apiMarket ?? { ...localMarket, source: 'local_fallback' as const, annualGrowthRate: 0 };

  useEffect(() => {
    let active = true;
    setMarketLoading(true);
    getMarketStats({ ...defaultPropertyInput, district, propertyType, areaSqm: 1, askingPrice: 1 })
      .then((stats) => {
        if (active) setApiMarket(stats);
      })
      .catch(() => {
        if (active) setApiMarket(null);
      })
      .finally(() => {
        if (active) setMarketLoading(false);
      });

    return () => {
      active = false;
    };
  }, [district, propertyType]);

  return (
    <PageHeader title={t('marketTitle')} subtitle={t('marketSubtitle')}>
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">{t('district')}</span>
          <select value={district} onChange={(event) => setDistrict(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-slate-950">
            {districts.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">{t('propertyType')}</span>
          <select value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-slate-950">
            {propertyTypes.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={LineChart} label={t('avgSqm')} value={formatSar(market.averagePricePerSqm)} detail={market.source === 'api' ? 'Model API' : 'Local CSV'} />
        <Metric icon={Activity} label={t('transactions')} value={String(market.transactionsCount)} detail={propertyType} />
        <Metric icon={Shield} label={t('liquidity')} value={String(market.liquidityScore)} detail={marketLoading ? 'Loading API' : `${market.annualGrowthRate.toFixed(2)}% growth`} />
      </div>
      <div className="mt-6">
        <Panel title={t('marketMap')}>
          <MarketExplorerMap
            district={district}
            averagePricePerSqm={market.averagePricePerSqm}
            medianPricePerSqm={market.medianPricePerSqm}
            transactionsCount={market.transactionsCount}
            liquidityScore={market.liquidityScore}
          />
          <p className="mt-3 text-xs font-semibold text-slate-500">
            {market.source === 'api'
              ? `API market data: ${market.dataCoverage?.date_min ?? 'unknown'} to ${market.dataCoverage?.date_max ?? 'unknown'}.`
              : 'Local CSV fallback is active. Transaction points can be added when latitude/longitude columns are available in the dataset.'}
          </p>
          {market.latest12Months && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <PreviewMetric label="Latest 12m avg" value={formatSar(market.latest12Months.avg_price_per_meter)} />
              <PreviewMetric label="Latest 12m tx" value={String(market.latest12Months.total_transactions)} />
              <PreviewMetric label="Data rows" value={String(market.dataCoverage?.rows ?? market.transactionsCount)} />
            </div>
          )}
        </Panel>
      </div>
    </PageHeader>
  );
}

function SettingsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  return (
    <PageHeader title={t('settingsTitle')} subtitle={t('settingsSubtitle')}>
      <Panel title={t('companyInfo')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('companyName')} value="Muasher Real Estate Office" onChange={() => undefined} />
          <Field label={t('userEmail')} value={user?.email ?? ''} onChange={() => undefined} readOnly />
          <Field label={t('reportLanguage')} value="العربية" onChange={() => undefined} />
        </div>
      </Panel>
    </PageHeader>
  );
}

function AdminPanel() {
  const { t } = useI18n();
  const { isAdmin, user } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    getAdminDashboardData()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load admin data.'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <PageHeader title={t('adminTitle')} subtitle={t('adminSubtitle')}>
        <Panel title="Access denied">
          <p className="text-sm font-bold text-slate-600">
            {user?.email ?? 'This account'} is not an admin account.
          </p>
        </Panel>
      </PageHeader>
    );
  }

  return (
    <PageHeader title={t('adminTitle')} subtitle={t('adminSubtitle')}>
      {loading && (
        <Panel title="Loading">
          <div className="flex items-center gap-2 text-sm font-black text-slate-600">
            <Loader2 size={16} className="animate-spin" /> Loading Supabase admin data...
          </div>
        </Panel>
      )}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Metric icon={Users} label="Users" value={String(data.stats.users)} detail="profiles" />
            <Metric icon={FileText} label="Reports" value={String(data.stats.reports)} detail="analysis_reports" />
            <Metric icon={Building2} label="Properties" value={String(data.stats.properties)} detail="properties" />
            <Metric icon={Database} label="Transactions" value={String(data.stats.transactions)} detail="transactions" />
            <Metric icon={Shield} label="Comparables" value={String(data.stats.comparables)} detail="comparables" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
            <Panel title="Users and subscriptions">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs font-black uppercase text-slate-500">
                    <tr>
                      <th className="py-3 pr-3">User</th>
                      <th className="py-3 pr-3">Role</th>
                      <th className="py-3 pr-3">Plan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.users.map((profile) => (
                      <tr key={profile.id}>
                        <td className="py-3 pr-3">
                          <div className="font-black text-slate-950">{profile.full_name || 'Unnamed user'}</div>
                          <div className="max-w-56 truncate text-xs font-bold text-slate-500">{profile.email}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <span className={`status-badge ${profile.role === 'admin' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                            {profile.role}
                          </span>
                        </td>
                        <td className="py-3 pr-3 font-bold text-slate-600">{profile.subscription_plan}</td>
                      </tr>
                    ))}
                    {data.users.length === 0 && <tr><td colSpan={3} className="py-8 text-center font-bold text-slate-500">No users found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Latest reports">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs font-black uppercase text-slate-500">
                    <tr>
                      <th className="py-3 pr-3">Property</th>
                      <th className="py-3 pr-3">Owner</th>
                      <th className="py-3 pr-3">Score</th>
                      <th className="py-3 pr-3">Value</th>
                      <th className="py-3 pr-3">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.reports.map((report) => (
                      <tr key={report.id}>
                        <td className="py-3 pr-3">
                          <div className="font-black text-slate-950">{report.properties?.district || 'Unknown district'}</div>
                          <div className="text-xs font-bold text-slate-500">{report.properties?.city || 'Unknown city'} / {report.properties?.property_type || 'Property'}</div>
                        </td>
                        <td className="max-w-48 truncate py-3 pr-3 font-bold text-slate-600">{report.profiles?.email || report.user_id}</td>
                        <td className="py-3 pr-3 font-black">{Math.round(report.investment_score ?? 0)}</td>
                        <td className="py-3 pr-3 font-bold text-slate-600">{formatSar(report.estimated_price ?? 0)}</td>
                        <td className="py-3 pr-3">
                          <span className="status-badge bg-amber-100 text-amber-800">{report.risk_level || 'Unknown'}</span>
                        </td>
                      </tr>
                    ))}
                    {data.reports.length === 0 && <tr><td colSpan={5} className="py-8 text-center font-bold text-slate-500">No reports found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </PageHeader>
  );
}

function PageHeader({ title, subtitle, children, compact = false }: { title: string; subtitle: string; children: React.ReactNode; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <section className={compact ? 'mt-6' : ''}>
      {!compact && (
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">{subtitle}</p>
          </div>
          <Link to="/app/new-analysis" className="primary-button">
            <Plus size={16} /> {t('createNewAnalysis')}
          </Link>
        </div>
      )}
      {compact && <h2 className="mb-4 text-xl font-black">{title}</h2>}
      {children}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="premium-card">
      <h2 className="mb-4 text-sm font-black uppercase text-slate-500">{title}</h2>
      {children}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Target; label: string; value: string; detail: string }) {
  return (
    <div className="premium-kpi">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><Icon size={20} /></div>
      <div className="text-xs font-black uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{detail}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', readOnly = false }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; readOnly?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
  <input readOnly={readOnly} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="field-input" />
    </label>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <div className="text-[10px] font-black uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}
