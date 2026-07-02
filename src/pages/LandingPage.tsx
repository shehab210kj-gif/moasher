import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Check,
  FileText,
  Gauge,
  LineChart,
  MapPinned,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { formatSar } from '../lib/muasher';
import { useI18n } from '../lib/i18n';

type PublicPage = 'landing' | 'features' | 'use-cases' | 'pricing' | 'login' | 'register';

const marketingPreview = {
  investmentScore: 82,
  fairValueMin: 1450000,
  fairValueMax: 1680000,
  roiPercentage: 18.4,
};

export function LandingPage({ page }: { page: PublicPage }) {
  const { dir } = useI18n();

  return (
    <div className="surface-page" dir={dir}>
      <PublicNav />
      {page === 'landing' && <LandingContent />}
      {page === 'features' && <FeaturesContent />}
      {page === 'use-cases' && <UseCasesContent />}
      {page === 'pricing' && <PricingContent />}
      <Footer />
    </div>
  );
}

function PublicNav() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-white shadow-lg shadow-emerald-900/20">
            <Target size={21} />
          </span>
          <div>
            <span className="block text-lg font-black text-slate-950">{t('appName')}</span>
            <span className="block text-[11px] font-bold text-emerald-700">Real Estate Intelligence</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
          <Link to="/features" className="hover:text-emerald-800">{t('navFeatures')}</Link>
          <Link to="/use-cases" className="hover:text-emerald-800">{t('navUseCases')}</Link>
          <Link to="/pricing" className="hover:text-emerald-800">{t('navPricing')}</Link>
          <Link to="/sample-report" className="hover:text-emerald-800">{t('navSampleReport')}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden px-4 py-2 text-sm font-bold text-slate-600 hover:text-emerald-800 sm:block">{t('navLogin')}</Link>
          <Link to="/app/new-analysis" className="primary-button">
            {t('navGenerate')}
          </Link>
        </div>
      </div>
    </header>
  );
}

function LandingContent() {
  const { t } = useI18n();
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-900/10 to-transparent" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_500px] lg:py-24">
          <div className="flex flex-col justify-center">
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-800">
              <Sparkles size={14} /> {t('heroEyebrow')}
            </p>
            <h1 className="max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-6xl">
              {t('heroTitle')}
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-bold leading-9 text-slate-600">
              {t('heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app/new-analysis" className="primary-button">
                {t('heroPrimary')} <ArrowLeft size={16} />
              </Link>
              <Link to="/sample-report" className="secondary-button">
                {t('heroSecondary')}
              </Link>
            </div>
            <TrustStrip />
          </div>
          <ReportPreview />
        </div>
      </section>

      <Section title={t('sectionReportTitle')} subtitle={t('sectionReportSubtitle')}>
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard title={t('featureFairValue')} body={t('featureFairValueBody')} icon={Gauge} />
          <FeatureCard title={t('featureComparable')} body={t('featureComparableBody')} icon={BarChart3} />
          <FeatureCard title={t('featureMemo')} body={t('featureMemoBody')} icon={FileText} />
        </div>
      </Section>

      <Section title={t('sectionHowTitle')} subtitle={t('sectionHowSubtitle')}>
        <div className="grid gap-4 md:grid-cols-3">
          {[t('stepData'), t('stepAnalyze'), t('stepReport')].map((step, index) => (
            <div key={step} className="premium-card">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-sm font-black text-white">{index + 1}</div>
              <h3 className="text-lg font-black text-slate-950">{step}</h3>
              <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{t('sectionHowSubtitle')}</p>
            </div>
          ))}
        </div>
      </Section>

      <PricingContent compact />

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="premium-shell overflow-hidden bg-gradient-to-br from-emerald-900 to-slate-950 p-8 text-white md:p-10">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-black">{t('ctaTitle')}</h2>
            <p className="mt-3 text-base font-bold leading-8 text-emerald-50">{t('ctaBody')}</p>
            <Link to="/app/new-analysis" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-emerald-900">
              {t('heroPrimary')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function TrustStrip() {
  const { t } = useI18n();
  const items = [
    ['+9,900', t('transactions')],
    ['82%', t('investmentScore')],
    ['< 3m', t('stepReport')],
  ];
  return (
    <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
      {items.map(([value, label]) => (
        <div key={label} className="rounded-2xl border border-emerald-900/10 bg-white/75 p-4 shadow-sm">
          <div className="text-2xl font-black text-emerald-800">{value}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
        </div>
      ))}
    </div>
  );
}

function FeaturesContent() {
  const { t } = useI18n();
  const features = [
    [t('featureFairValue'), t('featureFairValueBody'), LineChart],
    [t('featureComparable'), t('featureComparableBody'), BarChart3],
    [t('featureRisk'), t('featureRiskBody'), ShieldAlert],
    [t('featureMap'), t('featureMapBody'), MapPinned],
    [t('featureReports'), t('featureReportsBody'), FileText],
    [t('featureMemo'), t('featureMemoBody'), Users],
  ];
  return (
    <Section title={t('sectionFeaturesTitle')} subtitle={t('sectionFeaturesSubtitle')}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map(([title, body, Icon]) => (
          <FeatureCard key={title as string} title={title as string} body={body as string} icon={Icon as typeof Target} />
        ))}
      </div>
    </Section>
  );
}

function UseCasesContent() {
  const { t } = useI18n();
  const cases = [
    ['المكاتب العقارية', 'إعداد تقارير احترافية للعملاء ودعم التفاوض بأدلة سوقية.'],
    ['المستثمرون', 'فهم عدالة السعر ومخاطر الصفقة قبل الالتزام برأس المال.'],
    ['المطورون العقاريون', 'تحليل الاستخدام الأعلى والأفضل ومقارنة سيناريوهات التطوير.'],
    ['فرق الاستثمار', 'توحيد منهجية دراسة الفرص ورفع جودة قرارات اللجان.'],
  ];
  return (
    <Section title={t('navUseCases')} subtitle={t('sectionFeaturesSubtitle')}>
      <div className="grid gap-4 md:grid-cols-2">
        {cases.map(([title, body]) => (
          <div key={title} className="premium-card p-7">
            <h3 className="text-xl font-black text-slate-950">{title}</h3>
            <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function PricingContent({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const plans = [
    ['مجاني', '0 ر.س', ['تقريران شهريًا', 'تقييم أساسي', 'مقارنة سوقية أساسية']],
    ['احترافي', '199 ر.س/شهر', ['20 تقريرًا شهريًا', 'تصدير PDF', 'توصية ذكية', 'تحليل مخاطر']],
    ['أعمال', '499 ر.س/شهر', ['100 تقرير شهريًا', 'هوية الشركة', 'تقارير متقدمة', 'دعم أولوية']],
    ['مؤسسي', 'حسب الطلب', ['تقارير مخصصة', 'تكامل API', 'مصادر بيانات خاصة', 'لوحة مخصصة']],
  ];
  return (
    <Section title={compact ? t('sectionPricingTitle') : t('navPricing')} subtitle={t('sectionPricingSubtitle')}>
      <div className="grid gap-4 lg:grid-cols-4">
        {plans.map(([name, price, items]) => (
          <div key={name as string} className="premium-card p-6">
            <h3 className="text-lg font-black text-slate-950">{name}</h3>
            <div className="mt-3 text-2xl font-black text-emerald-800">{price}</div>
            <ul className="mt-6 space-y-3">
              {(items as string[]).map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm font-bold text-slate-600">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" /> {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ReportPreview() {
  const { t } = useI18n();
  return (
    <div className="premium-shell relative overflow-hidden p-4">
      <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-emerald-200/50 blur-3xl" />
      <div className="relative rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between border-b border-emerald-950/10 pb-4">
          <div>
            <p className="text-xs font-black uppercase text-emerald-700">{t('previewTitle')}</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{t('previewDistrict')}</h2>
          </div>
          <span className="status-badge bg-amber-100 text-amber-800">{t('previewRecommendation')}</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <MiniStat label={t('investmentScore')} value={`${marketingPreview.investmentScore}/100`} />
          <MiniStat label={t('riskLevel')} value="متوسط" />
          <MiniStat label={t('fairRange')} value={`${formatSar(marketingPreview.fairValueMin)} - ${formatSar(marketingPreview.fairValueMax)}`} wide />
          <MiniStat label={t('marketPosition')} value="ضمن النطاق" />
          <MiniStat label={t('roiEstimate')} value={`${marketingPreview.roiPercentage}%`} />
        </div>
        <div className="mt-6 h-28 rounded-2xl bg-gradient-to-l from-emerald-800 to-slate-900 p-4 text-white">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-100"><TrendingUp size={16} /> Market Signal</div>
          <p className="mt-3 text-sm font-bold leading-6">{t('previewMemo')}</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, body, icon: Icon }: { title: string; body: string; icon: typeof Target }) {
  return (
    <div className="premium-card">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
        <Icon size={21} />
      </div>
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{body}</p>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-8 max-w-3xl">
        <h2 className="text-3xl font-black text-slate-950">{title}</h2>
        <p className="mt-3 text-base font-bold leading-8 text-slate-600">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-2xl border border-emerald-950/10 bg-emerald-50/60 p-3 ${wide ? 'col-span-2' : ''}`}>
      <div className="text-[11px] font-black uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-slate-950">{value}</div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-emerald-950/10 bg-white/70 px-4 py-8">
      <div className="mx-auto max-w-7xl text-sm font-bold leading-6 text-slate-500">
        مؤشر AI منصة دعم قرار وليست تقييمًا عقاريًا معتمدًا. يرجى مراجعة مختص مرخص قبل اتخاذ قرار الشراء.
      </div>
    </footer>
  );
}
