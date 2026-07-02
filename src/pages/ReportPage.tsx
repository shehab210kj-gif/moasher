import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  Database,
  Download,
  FileText,
  Gauge,
  LineChart,
  Printer,
  ShieldAlert,
  Target,
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
import { PropertyMapPreview } from '../components/map/PropertyMapPreview';
import { getLatestReport, getReportById } from '../services/reportService';
import { formatSar, ReportData } from '../lib/muasher';
import { hasValidCoordinates } from '../lib/location';
import { useI18n } from '../lib/i18n';
import { RealEstateAgentChat } from '../components/RealEstateAgentChat';

export function ReportPage({ mode }: { mode: 'sample' | 'app' }) {
  const { t, dir } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const stateReport = location.state?.report as ReportData | undefined;
  const [report, setReport] = useState<ReportData | null>(stateReport ?? null);
  const [loading, setLoading] = useState(!stateReport);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(!stateReport);
    const load = async () => {
      try {
        const loaded = id ? await getReportById(id) : await getLatestReport();
        if (active) setReport(loaded ?? stateReport ?? null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Report load failed.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id, stateReport]);

  if (loading) {
    return <div className="surface-page p-8 text-sm font-black text-slate-600" dir={dir}>...</div>;
  }

  if (error) {
    return <div className="surface-page p-8 text-sm font-black text-red-700" dir={dir}>{error}</div>;
  }

  if (!report) {
    return <EmptyReportState mode={mode} />;
  }

  return (
    <div className="surface-page text-slate-950" dir={dir}>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button onClick={() => mode === 'app' ? navigate('/app/reports') : navigate('/')} className="flex items-center gap-2 text-sm font-black text-slate-600 hover:text-slate-950">
            <ArrowLeft size={16} /> {t('back')}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black">
              <Printer size={16} /> {t('print')}
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">
              <Download size={16} /> {t('exportPdf')}
            </button>
          </div>
        </div>
      </header>

      <main dir="rtl" className="mx-auto my-6 max-w-6xl rounded-lg bg-white p-6 shadow-sm print:my-0 print:max-w-none print:rounded-none print:shadow-none md:p-10">
        <Cover report={report} />
        <ExecutiveSummary report={report} />
        <PropertySnapshot report={report} />
        <LocationSection report={report} />
        <DataQualityNotes report={report} />
        <MethodologySection report={report} />
        <EvidenceSection report={report} />
        <Valuation report={report} />
        <ValuationReconciliationSection report={report} />
        <OneYearForecastSection report={report} />
        <AgentAdvisorySection report={report} />
        <Comparables report={report} />
        <MarketApproachAdjustments report={report} />
        <CostApproachSection report={report} />
        <InvestmentScore report={report} />
        <Hbu report={report} />
        <Roi report={report} />
        <Risks report={report} />
        <FinalRecommendation report={report} />
      </main>
      <RealEstateAgentChat report={report} />
    </div>
  );
}

function EmptyReportState({ mode }: { mode: 'sample' | 'app' }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
          <FileText size={22} />
        </div>
        <h1 className="mt-6 text-2xl font-black">{t('noReportFound')}</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          أنشئ تحليل عقار أولاً. يتم تحميل التقارير حالياً من الذاكرة المؤقتة للمتصفح، لذا يعمل الرابط المباشر فقط بعد إنشاء التقرير في هذا المتصفح.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/app/new-analysis" className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white">
            {t('createNewAnalysis')}
          </Link>
          <Link to={mode === 'app' ? '/app/reports' : '/'} className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800">
            {t('back')}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Cover({ report }: { report: ReportData }) {
  const { t } = useI18n();
  return (
    <section className="border-b border-slate-200 pb-10">
      <div className="mb-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white"><Target size={22} /></span>
          <div>
            <div className="text-xl font-black">{t('appName')}</div>
            <div className="text-xs font-black uppercase text-slate-400">ذكاء الاستثمار العقاري</div>
          </div>
        </Link>
        <div className="text-right text-sm font-bold text-slate-500">
          <div>رقم التقرير: {report.id}</div>
          <div>{new Date(report.createdAt).toLocaleDateString('ar-SA')}</div>
        </div>
      </div>
      <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">{t('reportCoverTitle')}</h1>
      <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
        تحليل دعم قرار احترافي لفرصة استثمارية في {report.property.propertyType} — حي {report.property.district}، {report.property.city}.
      </p>
      <div className="mt-8 grid gap-3 md:grid-cols-4">
        <Kpi label={t('recommendation')} value={t(report.summary.recommendation)} />
        <Kpi label={t('investmentScore')} value={`${report.summary.investmentScore}/100`} />
        <Kpi label={t('riskLevel')} value={t(report.summary.riskLevel)} />
        <Kpi label={t('marketPosition')} value={t(report.valuation.marketPosition)} />
      </div>
    </section>
  );
}

function ExecutiveSummary({ report }: { report: ReportData }) {
  const { t } = useI18n();
  return (
    <ReportSection titleKey="executiveSummary" icon={FileText}>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <p className="text-lg font-bold leading-8 text-slate-700">{report.memo}</p>
          <ul className="mt-6 space-y-3">
            {report.summary.keyInsights.map((insight) => (
              <li key={insight} className="flex gap-3 text-sm font-bold leading-6 text-slate-700">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" /> {insight}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-slate-950 p-6 text-white">
          <div className="text-sm font-black text-slate-400">القرار النهائي</div>
          <div className="mt-2 text-4xl font-black">{t(report.summary.recommendation)}</div>
          <div className="mt-6 text-sm font-semibold leading-6 text-slate-300">تابع الصفقة فقط إذا كان سعر الاستحواذ يدعم نطاق القيمة العادلة المحسوب وتم التحقق من افتراضات التخطيط والتقسيم.</div>
        </div>
      </div>
    </ReportSection>
  );
}

const purposeMap: Record<string, string> = {
  purchase: 'شراء',
  sale: 'بيع',
  financing: 'تمويل رهن عقاري',
  taxation: 'نزع ملكية / ضرائب',
  estate: 'توزيع تركة',
  internal: 'أغراض داخلية / استرشادية',
};

const ownershipMap: Record<string, string> = {
  absolute: 'ملكية مطلقة',
  restricted: 'ملكية مقيدة',
};

const terrainMap: Record<string, string> = {
  flat: 'مستوية',
  sloped: 'منحدرة',
  low: 'منخفضة',
};

const maintenanceMap: Record<string, string> = {
  excellent: 'ممتازة',
  good: 'جيدة',
  fair: 'متوسطة',
  poor: 'ضعيفة',
};

const accessibilityMap: Record<string, string> = {
  main_street: 'شارع رئيسي',
  secondary: 'فرعي من رئيسي',
  internal: 'داخل الحي',
};

const frontageMap: Record<string, string> = {
  east: 'شرق',
  west: 'غرب',
  north: 'شمال',
  south: 'جنوب',
};

function PropertySnapshot({ report }: { report: ReportData }) {
  const property = report.property;
  const rows = [
    ['المدينة', property.city],
    ['الحي', property.district],
    ['نوع العقار', property.propertyType],
    ['الاستخدام', property.landUse],
    ['المساحة', `${property.areaSqm.toLocaleString()} م²`],
    ['السعر المطلوب', formatSar(property.askingPrice)],
    ['سعر المتر للمطلوب', formatSar(property.askingPrice / property.areaSqm)],
    ['عرض الشارع', `${property.streetWidth} م`],
    ['الواجهة', `${property.frontage} م`],
    ['موقع زاوية', property.isCorner ? 'نعم' : 'لا'],
    ['غرض التقييم', purposeMap[property.purpose] || property.purpose || 'غير محدد'],
    ['أساس القيمة', property.purpose === 'financing' ? 'منفعة الرهن' : property.purpose === 'internal' ? 'القيمة الاستثمارية' : 'القيمة السوقية'],
    ['أسلوب التقييم', property.propertyType === 'قطعة أرض' ? 'المقارنة بالمبيعات' : 'السوق + التكلفة'],
    ['نوع الملكية', ownershipMap[property.ownership] || property.ownership || 'ملكية مطلقة'],
    ['طبيعة الأرض', terrainMap[property.terrain] || property.terrain || 'مستوية'],
    ['عمر المبنى', property.buildingAge > 0 ? `${property.buildingAge} سنة` : 'جديد أو أرض'],
    ['حالة الصيانة', maintenanceMap[property.maintenance] || property.maintenance || 'جيدة'],
    ['سهولة الوصول', accessibilityMap[property.accessibility] || property.accessibility || 'شارع رئيسي'],
    ['اتجاه الواجهة', frontageMap[property.frontageDirection] || property.frontageDirection || 'شرق'],
  ];
  return (
    <ReportSection titleKey="propertySnapshot" icon={Building2}>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {rows.map(([label, value]) => <Kpi key={label} label={label} value={value} />)}
      </div>
    </ReportSection>
  );
}

function LocationSection({ report }: { report: ReportData }) {
  const { t } = useI18n();
  const hasLocation = hasValidCoordinates(report.property);
  return (
    <ReportSection titleKey="propertyLocation" icon={Target}>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <PropertyMapPreview latitude={hasLocation ? report.property.latitude : null} longitude={hasLocation ? report.property.longitude : null} district={report.property.district} />
        <div className="grid gap-3">
          <Kpi label={t('latitude')} value={hasLocation ? String(report.property.latitude) : t('notSelected')} />
          <Kpi label={t('longitude')} value={hasLocation ? String(report.property.longitude) : t('notSelected')} />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600">
            تعكس الخريطة الإحداثيات المُدخلة في هذا التحليل. إذا لم يُحدد موقع، فإن التقييم يعتمد على بيانات الحي والصفقات.
          </div>
        </div>
      </div>
    </ReportSection>
  );
}

function DataQualityNotes({ report }: { report: ReportData }) {
  const notes = report.dataQualityNotes ?? [];
  if (!notes.length) return null;

  return (
    <ReportSection titleKey="dataQualityNotes" icon={AlertTriangle}>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note} className="text-sm font-bold leading-6 text-amber-900">{note}</li>
          ))}
        </ul>
      </div>
    </ReportSection>
  );
}

function MethodologySection({ report }: { report: ReportData }) {
  const methodology = report.methodology;
  if (!methodology) return null;

  const valuationDate = new Date(methodology.valuationDate).toLocaleDateString('en-US');
  const reportDate = new Date(methodology.reportDate).toLocaleDateString('en-US');

  return (
    <ReportSection titleKey="methodologySection" icon={ShieldAlert}>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <div className="text-xs font-black uppercase text-slate-500">نطاق العمل</div>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-700">{methodology.scopeOfWork}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Kpi label="تاريخ التقييم" value={valuationDate} />
            <Kpi label="تاريخ التقرير" value={reportDate} />
            <Kpi label="أساس القيمة" value={methodology.basisOfValue} />
            <Kpi label="الأسلوب الأساسي" value={methodology.primaryApproach} />
            <Kpi label="الأساليب الداعمة" value={methodology.supportingApproaches.join(', ')} />
            <Kpi label="الغرض المقصود" value={methodology.intendedUse} />
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <div className="text-xs font-black uppercase text-amber-700">تحفظ الاعتماد</div>
          <p className="mt-3 text-sm font-bold leading-7 text-amber-950">{methodology.disclaimer}</p>
          <p className="mt-4 text-xs font-bold leading-6 text-amber-900">{methodology.standardReference}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <MethodologyList title="مصادر البيانات" items={methodology.dataSources} />
        <MethodologyList title="الافتراضات الرئيسية" items={methodology.assumptions} />
        <MethodologyList title="شروط التحديد" items={methodology.limitingConditions} />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 text-sm font-bold leading-7 text-slate-700">
        <span className="font-black text-slate-950">مبررات مستوى الثقة: </span>
        {methodology.confidenceRationale}
      </div>
    </ReportSection>
  );
}

function MethodologyList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-xs font-black uppercase text-slate-500">{title}</div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="text-sm font-bold leading-6 text-slate-700">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceSection({ report }: { report: ReportData }) {
  const evidence = report.evidence;
  if (!evidence) return null;

  const propertyTypes = Object.entries(evidence.dataset.propertyTypeCounts)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');
  const shortHash = (value: string | null) => value ? value.slice(0, 12) : 'n/a';
  const formatOptionalMetric = (value: number | null, suffix = '') => value === null ? 'n/a' : `${Math.round(value)}${suffix}`;

  return (
    <ReportSection titleKey="evidenceSection" icon={Database}>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-black uppercase text-slate-500">تغطية مجموعة البيانات</div>
          <div className="mt-4 grid gap-3">
            <Kpi label="الملف المصدر" value={evidence.dataset.sourceFile} />
            <Kpi label="عدد الصفوف" value={String(evidence.dataset.rows)} />
            <Kpi label="الصفوف بعد إزالة التكرار" value={String(evidence.dataset.deduplicatedRows)} />
            <Kpi label="عدد الأحياء" value={String(evidence.dataset.districtCount)} />
            <Kpi label="الفترة الزمنية" value={`${new Date(evidence.dataset.dateRangeMin).toLocaleDateString('ar-SA')} - ${new Date(evidence.dataset.dateRangeMax).toLocaleDateString('ar-SA')}`} />
            <Kpi label="آخر 12 شهر" value={`${evidence.dataset.latest12MonthRows} صفقة`} />
          </div>
          <p className="mt-4 text-xs font-bold leading-6 text-slate-500">{propertyTypes}</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <div className="text-xs font-black uppercase text-amber-700">مؤشرات جودة البيانات</div>
          <div className="mt-4 grid gap-3">
            <Kpi label="صفوف مكررة" value={String(evidence.dataset.duplicateRows)} />
            <Kpi label="مخطط مفقود" value={String(evidence.dataQuality.missingPlan)} />
            <Kpi label="قطعة مفقودة" value={String(evidence.dataQuality.missingParcel)} />
            <Kpi label="صفوف سعر مشبوهة" value={String(evidence.dataQuality.suspectTotalPriceRows)} />
            <Kpi label="سعر صفري أو سالب" value={String(evidence.dataQuality.zeroOrNegativeTotalPriceRows)} />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-black uppercase text-slate-500">تشخيصات النموذج</div>
          <div className="mt-4 grid gap-3">
            <Kpi label="عائلة النموذج" value={evidence.model.family} />
            <Kpi label="المتغير المستهدف" value={evidence.model.target} />
            <Kpi label="متوسط الخطأ (عشوائي)" value={`${Math.round(evidence.model.randomSplitMae)} ريال/م²`} />
            <Kpi label="متوسط الخطأ (زمني)" value={`${Math.round(evidence.model.timeSplitMae)} ريال/م²`} />
            <Kpi label="نسبة الخطأ (زمني)" value={`${Math.round(evidence.model.timeSplitMape)}%`} />
            <Kpi label="متوسط خطأ خط الأساس" value={`${Math.round(evidence.model.baselineTimeSplitMae)} ريال/م²`} />
          </div>
          <p className="mt-4 text-xs font-bold leading-6 text-slate-500">{evidence.model.validationWarning}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-5">
        <div className="text-xs font-black uppercase text-blue-700">اختبار التنبؤ الرجعي (Backtest) — سنة واحدة</div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Kpi label="شرائح مختبرة" value={String(evidence.forecastBacktest.segmentsTested)} />
          <Kpi label="متوسط خطأ التنبؤ" value={formatOptionalMetric(evidence.forecastBacktest.maeSarPerSqm, ' ريال/م²')} />
          <Kpi label="الخطأ الوسيط" value={formatOptionalMetric(evidence.forecastBacktest.medianAbsoluteErrorSarPerSqm, ' ريال/م²')} />
          <Kpi label="نسبة خطأ التنبؤ" value={formatOptionalMetric(evidence.forecastBacktest.mapePercent, '%')} />
          <Kpi label="نسبة الخطأ الوسيطة" value={formatOptionalMetric(evidence.forecastBacktest.medianApePercent, '%')} />
        </div>
        <p className="mt-4 text-xs font-bold leading-6 text-blue-900">
          {evidence.forecastBacktest.method} مخرجات التنبؤ تقديرية اتجاهية ولا تُعدّ ارتفاعاً مضموناً.
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
        <div className="text-xs font-black uppercase text-slate-500">تتبع الأرتيفاكتس (Artifact Traceability)</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Kpi label="SHA256 — البيانات" value={shortHash(evidence.artifacts.datasetSha256)} />
          <Kpi label="SHA256 — نموذج التقييم" value={shortHash(evidence.artifacts.valuationModelSha256)} />
          <Kpi label="SHA256 — إحصاءات التنبؤ" value={shortHash(evidence.artifacts.predictionStatsSha256)} />
          <Kpi label="Python" value={evidence.artifacts.pythonVersion ?? 'غ.م'} />
          <Kpi label="XGBoost" value={evidence.artifacts.xgboostVersion ?? 'غ.م'} />
          <Kpi label="scikit-learn" value={evidence.artifacts.sklearnVersion ?? 'غ.م'} />
        </div>
        <p className="mt-4 text-xs font-bold leading-6 text-slate-500">
          تم إنشاء الملف الرئيسي في {new Date(evidence.artifacts.manifestGeneratedAt).toLocaleString('ar-SA')}. الهاشات الكاملة محفوظة في artifact_manifest.json.
        </p>
      </div>
    </ReportSection>
  );
}

function Valuation({ report }: { report: ReportData }) {
  const { t } = useI18n();
  return (
    <ReportSection titleKey="valuationAnalysis" icon={BarChart3}>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-lg border border-slate-200 p-6">
          <div className="text-xs font-black uppercase text-slate-500">{t('fairRange')}</div>
          <div className="mt-3 text-2xl font-black">{formatSar(report.valuation.fairValueMin)}</div>
          <div className="text-sm font-black text-slate-400">إلى</div>
          <div className="text-2xl font-black">{formatSar(report.valuation.fairValueMax)}</div>
          <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm font-bold text-amber-800">
            السعر المطلوب {report.valuation.overUnderPercentage > 0 ? 'أعلى' : 'أقل'} بنسبة {Math.abs(report.valuation.overUnderPercentage)}% من التقدير المركزي.
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Kpi label={t('askingPrice')} value={formatSar(report.valuation.askingPrice)} />
          <Kpi label="القيمة المقدرة" value={formatSar(report.valuation.estimatedPrice)} />
          <Kpi label={t('pricePerSqm')} value={formatSar(report.valuation.estimatedPricePerSqm)} />
          <Kpi label={t('marketPosition')} value={t(report.valuation.marketPosition)} />
          <Kpi label="مستوى الثقة" value={t(report.valuation.confidence)} />
          <Kpi label="مصدر التقييم" value={t(report.valuation.source)} />
          <Kpi label="إصدار النموذج" value={report.valuation.modelVersion} />
          <Kpi label={t('transactions')} value={String(report.comparables.length)} />
        </div>
      </div>
    </ReportSection>
  );
}

function ValuationReconciliationSection({ report }: { report: ReportData }) {
  const { t } = useI18n();
  const reconciliation = report.reconciliation;
  if (!reconciliation) return null;

  return (
    <ReportSection titleKey="reconciliationSection" icon={Gauge}>
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white">
          <div className="text-xs font-black uppercase text-slate-400">القيمة المسوّاة النهائية</div>
          <div className="mt-3 text-3xl font-black">{formatSar(reconciliation.finalValue)}</div>
          <div className="mt-1 text-sm font-black text-slate-300">{formatSar(reconciliation.finalValuePerSqm)} / م²</div>
          <div className="mt-5 rounded-lg bg-white/10 p-4 text-sm font-bold leading-6 text-slate-200">
            الأسلوب الأساسي: {t(reconciliation.primaryApproach)}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">الأسلوب</th>
                <th className="px-4 py-3">القيمة</th>
                <th className="px-4 py-3">سعر المتر</th>
                <th className="px-4 py-3">الوزن</th>
                <th className="px-4 py-3">الثقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reconciliation.approaches.map((approach) => (
                <tr key={approach.name}>
                  <td className="px-4 py-3 font-black text-slate-900">{t(approach.name)}</td>
                  <td className="px-4 py-3 font-bold">{formatSar(approach.value)}</td>
                  <td className="px-4 py-3 font-bold">{formatSar(approach.valuePerSqm)}</td>
                  <td className="px-4 py-3 font-black">{approach.weight}%</td>
                  <td className="px-4 py-3 font-bold text-slate-500">{t(approach.confidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 text-sm font-bold leading-7 text-slate-700">
        {reconciliation.summary}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {reconciliation.approaches.map((approach) => (
          <div key={`${approach.name}-rationale`} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-black uppercase text-slate-500">مبررات أسلوب {t(approach.name)}</div>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-700">{approach.rationale}</p>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

function OneYearForecastSection({ report }: { report: ReportData }) {
  const { t } = useI18n();
  const forecast = report.forecast;
  if (!forecast) return null;

  const growthLabel = `${forecast.annualGrowthRatePercentage > 0 ? '+' : ''}${forecast.annualGrowthRatePercentage}%`;
  const upside = forecast.currentEstimatedPrice > 0
    ? Math.round(((forecast.basePrice - forecast.currentEstimatedPrice) / forecast.currentEstimatedPrice) * 100)
    : 0;

  return (
    <ReportSection titleKey="forecastSection" icon={LineChart}>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <div className="text-xs font-black uppercase text-emerald-700">التنبؤ الأساسي بعد 12 شهراً</div>
          <div className="mt-3 text-3xl font-black text-emerald-950">{formatSar(forecast.basePrice)}</div>
          <div className="mt-1 text-sm font-black text-emerald-700">{formatSar(forecast.basePricePerSqm)} / م²</div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Kpi label="معدل النمو السنوي" value={growthLabel} />
            <Kpi label="الزيادة المتوقعة" value={`${upside > 0 ? '+' : ''}${upside}%`} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Kpi label="القيمة الحالية المقدرة" value={formatSar(forecast.currentEstimatedPrice)} />
          <Kpi label="سعر المتر الحالي" value={formatSar(forecast.currentEstimatedPricePerSqm)} />
          <Kpi label="ثقة التنبؤ" value={t(forecast.confidence)} />
          <Kpi label="السيناريو المتحفظ" value={formatSar(forecast.conservativePrice)} />
          <Kpi label="السيناريو الأساسي" value={formatSar(forecast.basePrice)} />
          <Kpi label="السيناريو المتفائل" value={formatSar(forecast.optimisticPrice)} />
          <Kpi label="متر — متحفظ" value={formatSar(forecast.conservativePricePerSqm)} />
          <Kpi label="متر — أساسي" value={formatSar(forecast.basePricePerSqm)} />
          <Kpi label="متر — متفائل" value={formatSar(forecast.optimisticPricePerSqm)} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-bold leading-7 text-slate-700">
          <span className="font-black text-slate-950">الأسلوب: </span>
          {forecast.method}
          <br />
          <span className="font-black text-slate-950">المبررات: </span>
          {forecast.rationale}
        </div>
        {forecast.warnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <div className="text-xs font-black uppercase text-amber-700">تحذيرات التنبؤ</div>
            <ul className="mt-3 space-y-2">
              {forecast.warnings.slice(0, 4).map((warning) => (
                <li key={warning} className="text-sm font-bold leading-6 text-amber-950">{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ReportSection>
  );
}

function AgentAdvisorySection({ report }: { report: ReportData }) {
  const advisory = report.agentAdvisory;
  if (!advisory) return null;

  return (
    <ReportSection titleKey="agentAdvisorySection" icon={Target}>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-xs font-black uppercase text-slate-500">ملخص القرار</div>
          <p className="mt-3 text-lg font-black leading-8 text-slate-900">{advisory.decisionSummary}</p>
          <div className="mt-5 rounded-lg bg-slate-50 p-5 text-sm font-bold leading-7 text-slate-700">
            <span className="font-black text-slate-950">موقف التفاوض: </span>
            {advisory.negotiationPosition}
          </div>
        </div>

        <div className="grid gap-3">
          <Kpi label="الحد الأدنى للعرض المقترح" value={formatSar(advisory.suggestedOfferMin)} />
          <Kpi label="الحد الأقصى للعرض المقترح" value={formatSar(advisory.suggestedOfferMax)} />
          <Kpi label="سعر الانسحاب" value={formatSar(advisory.walkAwayPrice)} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AgentList title="الإجراءات التالية" items={advisory.nextActions} />
        <AgentList title="قائمة العناية الواجبة" items={advisory.dueDiligenceChecklist} />
        <AgentList title="المدخلات الناقصة لتحسين الثقة" items={advisory.missingInputs.length ? advisory.missingInputs : ['لا توجد مدخلات ناقصة جوهرية في النموذج المُقدَّم.']} />
        <AgentList title="أسئلة للبائع أو الوسيط" items={advisory.questionsToAsk} />
      </div>
    </ReportSection>
  );
}

function AgentList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-xs font-black uppercase text-slate-500">{title}</div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="text-sm font-bold leading-6 text-slate-700">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Comparables({ report }: { report: ReportData }) {
  return (
    <ReportSection titleKey="comparableAnalysis" icon={BarChart3}>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">الحي</th>
              <th className="px-4 py-3">المساحة</th>
              <th className="px-4 py-3">السعر</th>
              <th className="px-4 py-3">سعر المتر</th>
              <th className="px-4 py-3">التاريخ</th>
              <th className="px-4 py-3">المسافة</th>
              <th className="px-4 py-3">التشابه</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.comparables.map((item) => (
              <tr key={`${item.date}-${item.pricePerSqm}`}>
                <td className="px-4 py-3 font-black">{item.district}</td>
                <td className="px-4 py-3 font-bold">{item.areaSqm} م²</td>
                <td className="px-4 py-3 font-bold">{formatSar(item.totalPrice)}</td>
                <td className="px-4 py-3 font-bold">{formatSar(item.pricePerSqm)}</td>
                <td className="px-4 py-3 font-bold text-slate-500">{item.date}</td>
                <td className="px-4 py-3 font-bold">{item.distanceKm} كم</td>
                <td className="px-4 py-3 font-black">{item.similarityScore}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSection>
  );
}

function MarketApproachAdjustments({ report }: { report: ReportData }) {
  if (!report.comparables_adjustments_table || report.comparables_adjustments_table.length === 0) {
    return null;
  }

  const adjustmentTable = report.comparables_adjustments_table;
  const keys = [
    { label: 'سعر المتر الأساسي', path: (c: any) => formatSar(c.comp_data.price_per_sqm) },
    { label: 'تسوية شروط التمويل', path: (c: any) => `${c.adjustment_details.adjustments.financing || 0}%` },
    { label: 'تسوية ظروف السوق (الزمنية)', path: (c: any) => `${c.adjustment_details.adjustments.market_conditions || 0}%` },
    { label: 'تسوية حقوق الملكية', path: (c: any) => `${c.adjustment_details.adjustments.ownership || 0}%` },
    { label: 'تسوية المساحة', path: (c: any) => `${c.adjustment_details.adjustments.area || 0}%` },
    { label: 'تسوية الواجهات والشوارع', path: (c: any) => `${c.adjustment_details.adjustments.streets || 0}%` },
    { label: 'تسوية اتجاه الواجهة', path: (c: any) => `${c.adjustment_details.adjustments.frontage || 0}%` },
    { label: 'تسوية عرض الشارع والوصول', path: (c: any) => `${c.adjustment_details.adjustments.accessibility || 0}%` },
    { label: 'تسوية تضاريس الأرض', path: (c: any) => `${c.adjustment_details.adjustments.terrain || 0}%` },
    { label: 'تسوية عمر المبنى والتقادم', path: (c: any) => `${c.adjustment_details.adjustments.building_age || 0}%` },
    { label: 'تسوية حالة الصيانة', path: (c: any) => `${c.adjustment_details.adjustments.maintenance || 0}%` },
    { label: 'إجمالي التعديلات (صافي)', path: (c: any) => `${c.adjustment_details.net_adjustment_percentage || 0}%` },
    { label: 'سعر المتر المعدّل النهائي', path: (c: any) => formatSar(c.adjustment_details.adjusted_price_per_sqm), highlight: true },
    { label: 'الوزن النسبي في التقييم', path: (c: any) => `${c.weight_percent || 0}%`, highlight: true },
  ];

  return (
    <ReportSection titleKey="جدول تسويات أسلوب السوق (TAQEEM)" icon={BarChart3}>
      <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm font-semibold leading-6 text-slate-700 text-right space-y-2">
        <p className="font-black text-slate-900">ملاحظة منهجية التعديل والتسويات (TAQEEM Adjustment Note):</p>
        <p>تخضع أسعار المبيعات المقارنة لنسب تسوية مئوية تعكس الفروقات الفنية والبلدية والجغرافية مقارنة بالعقار محل التقييم:</p>
        <ul className="list-disc list-inside space-y-1 text-slate-600 font-medium">
          <li><strong>التسوية الموجبة (+)</strong>: تعني أن العقار محل التقييم أفضل من العقار المقارن في هذا العنصر، لذا يتم رفع سعر المقارن ليعادل قيمة عقارنا.</li>
          <li><strong>التسوية السالبة (-)</strong>: تعني أن العقار المقارن أفضل من العقار محل التقييم في هذا العنصر، لذا يتم خفض سعر المقارن ليعادل قيمة عقارنا.</li>
        </ul>

      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-950 text-white text-xs font-black uppercase">
            <tr>
              <th className="px-4 py-3 text-right">عنصر المقارنة والتسوية</th>
              {adjustmentTable.map((c, i) => (
                <th key={i} className="px-4 py-3 text-right">مقارن {i + 1} ({c.comp_data.district})</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {keys.map((k) => (
              <tr key={k.label} className={k.highlight ? 'bg-emerald-50/50 font-black' : ''}>
                <td className="px-4 py-3 font-black text-slate-800 text-right">{k.label}</td>
                {adjustmentTable.map((c, i) => {
                  const val = k.path(c);
                  const isNeg = val.toString().startsWith('-');
                  const isPos = val.toString().endsWith('%') && val !== '0%' && !isNeg;
                  return (
                    <td key={i} className={`px-4 py-3 font-bold text-right ${isNeg ? 'text-red-600' : isPos ? 'text-emerald-700' : ''}`}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSection>
  );
}

function CostApproachSection({ report }: { report: ReportData }) {
  if (!report.cost_approach) {
    return null;
  }

  const cost = report.cost_approach;
  const breakData = [
    { name: 'مادي (Physical)', value: cost.depreciation_breakdown.physical, color: '#dc2626' },
    { name: 'وظيفي (Functional)', value: cost.depreciation_breakdown.functional, color: '#d97706' },
    { name: 'اقتصادي (Economic)', value: cost.depreciation_breakdown.economic, color: '#0284c7' },
  ];

  return (
    <ReportSection titleKey="أسلوب التكلفة والإهلاك (Cost Approach)" icon={Building2}>
      <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm font-semibold leading-6 text-blue-900 text-right">
        يُطبق أسلوب التكلفة لتقدير قيمة العقار بناءً على جمع قيمة الأرض السوقية إلى تكلفة إحلال المباني جديدة مطروحاً منها الإهلاك المتراكم طبقاً للعمر الاقتصادي الممتد.
      </div>
      <div className="grid gap-6 lg:grid-cols-2 text-right">
        <div className="rounded-lg border border-slate-200 p-6 space-y-4">
          <div className="flex justify-between border-b pb-2">
            <span className="font-black text-slate-900">{formatSar(cost.land_value)}</span>
            <span className="font-black text-slate-600">قيمة الأرض التقديرية</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-black text-slate-900">{formatSar(cost.replacement_cost_new)}</span>
            <span className="font-black text-slate-600">تكلفة إنشاء المباني جديدة (Replacement)</span>
          </div>
          <div className="flex justify-between border-b pb-2 text-red-600">
            <span className="font-black">-{formatSar(cost.total_depreciation_amount)}</span>
            <span className="font-black">معدل الإهلاك المتراكم ({cost.depreciation_rate_percent}%)</span>
          </div>
          <div className="flex justify-between border-b pb-2 font-bold text-slate-700">
            <span className="font-black">{formatSar(cost.depreciated_building_value)}</span>
            <span className="font-black">القيمة المهلكة الصافية للمباني</span>
          </div>
          <div className="flex justify-between pt-2 text-lg font-black text-emerald-800">
            <span>{formatSar(cost.total_property_value)}</span>
            <span>إجمالي قيمة العقار بأسلوب التكلفة</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-sm uppercase text-slate-500 mb-4">تفاصيل تراجع قيمة المبنى (Depreciation)</h3>
            <div className="space-y-3">
              <div className="text-xs text-slate-600 mb-2 border-b pb-2">
                <strong>طريقة الإهلاك:</strong> {cost.parameters.depreciation_method || 'العمر الممتد (Extended Life Method)'}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>{cost.parameters.economic_life || 50} سنة</span>
                  <span>العمر الاقتصادي الأساسي</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>+{cost.parameters.extended_life_years || 0} سنة</span>
                  <span>التمديد التقديري للعمر</span>
                </div>
                <div className="flex justify-between text-xs font-black text-slate-800 border-t pt-1">
                  <span>{cost.parameters.total_economic_life} سنة</span>
                  <span>العمر الاقتصادي الإجمالي الممتد</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>{cost.parameters.building_age} سنة</span>
                  <span>العمر الفعلي للمبنى</span>
                </div>
                <div className="flex justify-between text-xs font-black text-slate-800 border-t pt-1 font-bold">
                  <span>{cost.parameters.remaining_life ?? (cost.parameters.total_economic_life - cost.parameters.building_age)} سنة</span>
                  <span>العمر الاقتصادي المتبقي للمبنى</span>
                </div>
              </div>
            </div>
          </div>
          <div className="h-44 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={breakData} dataKey="value" innerRadius={35} outerRadius={60} paddingAngle={4}>
                  {breakData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ReportSection>
  );
}

function InvestmentScore({ report }: { report: ReportData }) {
  const data = [
    { name: 'السعر', value: report.scoreBreakdown.price, max: 30 },
    { name: 'الموقع', value: report.scoreBreakdown.location, max: 25 },
    { name: 'السيولة', value: report.scoreBreakdown.liquidity, max: 20 },
    { name: 'التطوير', value: report.scoreBreakdown.development, max: 15 },
    { name: 'المخاطر', value: report.scoreBreakdown.risk, max: 10 },
  ];
  return (
    <ReportSection titleKey="investmentScore" icon={Gauge}>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-lg bg-slate-950 p-6 text-white">
          <div className="text-sm font-black text-slate-400">درجة الفرصة الاستثمارية</div>
          <div className="mt-2 text-6xl font-black">{report.summary.investmentScore}</div>
          <div className="mt-2 text-sm font-bold text-slate-300">من 100</div>
        </div>
        <div className="h-72 rounded-lg border border-slate-200 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0f172a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ReportSection>
  );
}

function Hbu({ report }: { report: ReportData }) {
  return (
    <ReportSection titleKey="hbuAnalysis" icon={Target}>
      <div className="mb-4 rounded-lg bg-emerald-50 p-4 text-sm font-black text-emerald-800">أفضل استخدام: {report.hbu.bestUse}</div>
      <div className="grid gap-4 lg:grid-cols-3">
        {report.hbu.scenarios.map((scenario) => (
          <div key={scenario.name} className="rounded-lg border border-slate-200 p-5">
            <h3 className="text-lg font-black">{scenario.name}</h3>
            <div className="mt-4 space-y-2 text-sm font-bold text-slate-600">
              <div>الإيراد السنوي: {formatSar(scenario.revenue)}</div>
              <div>التكلفة الإجمالية: {formatSar(scenario.cost)}</div>
              <div>العائد (ROI): {scenario.roi}%</div>
              <div>المخاطر: {scenario.risk}</div>
              <div>درجة الملاءمة: {scenario.suitability}/100</div>
            </div>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

function Roi({ report }: { report: ReportData }) {
  const data = [
    { name: 'Purchase', value: report.roi.purchaseCost },
    { name: 'Development', value: report.roi.developmentCost },
    { name: 'Profit', value: Math.max(report.roi.expectedNetProfit, 0) },
  ];
  const capitalGain = report.roi.projectedCapitalGain ?? Math.max(report.roi.expectedSellingPrice - report.roi.totalInvestmentCost, 0);
  const rentalYield = report.roi.annualRentalYield ?? 0;

  return (
    <ReportSection titleKey="roiSection" icon={BarChart3}>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Kpi label="إجمالي تكلفة الاستثمار (Total Investment Cost)" value={formatSar(report.roi.totalInvestmentCost)} />
          <Kpi label="سعر البيع المتوقع (Expected Resale Price)" value={formatSar(report.roi.expectedSellingPrice)} />
          <Kpi label="ربح رأسمالي متوقع (Projected Capital Gain)" value={formatSar(capitalGain)} />
          <Kpi label="إجمالي الإيرادات الإيجارية (Expected Rental Income)" value={formatSar(report.roi.expectedRentalIncome)} />
          <Kpi label="صافي الربح المتوقع (Expected Net Profit)" value={formatSar(report.roi.expectedNetProfit)} />
          <Kpi label="العائد على الاستثمار الكلي (Total ROI)" value={`${report.roi.roiPercentage}%`} />
          <Kpi label="العائد الإيجاري السنوي (Annual Rental Yield / Cap Rate)" value={rentalYield > 0 ? `${rentalYield}%` : 'غير متاح - لم يتم إدخال إيجار متوقع'} />
          <Kpi label="فترة استرداد رأس المال (Payback Period)" value={String(report.roi.paybackPeriod)} />
        </div>
        <div className="h-64 rounded-lg border border-slate-200 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={4}>
                {['#0f172a', '#0284c7', '#059669'].map((color) => <Cell key={color} fill={color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ReportSection>
  );
}

function Risks({ report }: { report: ReportData }) {
  return (
    <ReportSection titleKey="riskAnalysis" icon={ShieldAlert}>
      <div className="grid gap-4">
        {report.risks.map((risk) => (
          <div key={risk.title} className="rounded-lg border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-black">{risk.title}</h3>
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black">{risk.level}</span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{risk.explanation}</p>
            <p className="mt-2 text-sm font-black leading-6 text-slate-800">الحد من المخاطر: {risk.mitigation}</p>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

function FinalRecommendation({ report }: { report: ReportData }) {
  return (
    <ReportSection titleKey="finalRecommendation" icon={AlertTriangle}>
      <div className="rounded-lg bg-slate-950 p-6 text-white">
        <div className="text-xs font-black uppercase text-slate-400">القرار الاستثماري النهائي / Investment Decision</div>
        <div className="text-3xl font-black mt-2">{report.summary.recommendation}</div>
        <p className="mt-4 max-w-4xl text-base font-semibold leading-8 text-slate-300 border-b border-slate-800 pb-4">{report.memo}</p>
        
        {report.summary.recommendationRationale && report.summary.recommendationRationale.length > 0 && (
          <div className="mt-4 text-right">
            <h4 className="text-sm font-black text-emerald-400 mb-2">مبررات التوصية والقرار الاستثماري (Recommendation Rationale):</h4>
            <ul className="space-y-2">
              {report.summary.recommendationRationale.map((bullet, idx) => (
                <li key={idx} className="flex gap-2 text-sm font-bold text-slate-200">
                  <span className="text-emerald-500">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      

    </ReportSection>
  );
}

function ReportSection({ titleKey, icon: Icon, children }: { titleKey: string; icon: typeof Target; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="border-b border-slate-200 py-10 last:border-b-0 print:break-inside-avoid">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100"><Icon size={20} /></span>
        <div>
          <h2 className="text-2xl font-black">{t(titleKey)}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-card rounded-lg border border-slate-200 bg-white p-4" dir="ltr">
      <div className="text-[11px] font-black uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-base font-black text-slate-950">{value}</div>
    </div>
  );
}
