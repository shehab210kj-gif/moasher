import { getComparableTransactions, getMarketIndicators, getTransactionDataQualityWarnings } from './data';
import { AgentAdvisory, ConfidenceLevel, MarketPosition, ModelValuation, OneYearForecast, PropertyInput, Recommendation, ReportData, ReportEvidence, RiskItem, ValuationMethodology, ValuationReconciliation, formatSar } from './muasher';
import { calculateScore, getMarketPosition, getOverUnderPercentage, getRecommendation, getRiskLevel, totalScore } from './scoring';
import { predictValuation, getFullReport } from '../services/modelApi';
import { getCoordinateWarnings, normalizeCoordinates } from './location';
import dataQualityReport from '../ai_model/data_quality_report.json';
import modelMetrics from '../ai_model/model_metrics.json';
import forecastMetrics from '../ai_model/forecast_metrics.json';
import artifactManifest from '../ai_model/artifact_manifest.json';

export function validatePropertyInput(input: PropertyInput, messages?: Partial<Record<'city' | 'district' | 'propertyType' | 'area' | 'askingPrice', string>>) {
  const errors: string[] = [];
  if (!input.city.trim()) errors.push(messages?.city ?? 'المدينة مطلوبة.');
  if (!input.district.trim()) errors.push(messages?.district ?? 'الحي مطلوب.');
  if (!input.propertyType.trim()) errors.push(messages?.propertyType ?? 'نوع العقار مطلوب.');
  if (input.areaSqm <= 0) errors.push(messages?.area ?? 'يجب أن تكون المساحة أكبر من صفر.');
  if (input.askingPrice <= 0) errors.push(messages?.askingPrice ?? 'يجب أن يكون السعر المطلوب أكبر من صفر.');
  return errors;
}

function buildMethodology(input: PropertyInput, options: {
  confidence: ConfidenceLevel;
  confidenceRationale: string;
  primaryApproach?: ValuationMethodology['primaryApproach'];
  supportingApproaches?: ValuationMethodology['supportingApproaches'];
  valuationSource: ModelValuation['source'] | 'full_report_api';
  comparableCount: number;
  dataQualityNotes: string[];
  modelMethodology?: ModelValuation['methodology'];
}, lang: 'ar' | 'en' = 'ar'): ValuationMethodology {
  const now = new Date().toISOString();
  const method = options.modelMethodology;
  const isAr = lang === 'ar';
  const primaryApproach = options.primaryApproach ?? 'Market Approach';
  const supportingApproaches = options.supportingApproaches ?? (
    input.propertyType.includes('أرض') || input.propertyType.includes('Ø£Ø±Ø¶')
      ? ['Cost Approach']
      : ['Cost Approach', 'Income Approach']
  );

  const purposeMapAr: Record<string, string> = {
    purchase: 'شراء',
    sale: 'بيع',
    financing: 'تمويل رهن عقاري',
    taxation: 'نزع ملكية / منفعة عامة',
    estate: 'تقسيم إرث',
    internal: 'أغراض داخلية / استرشادية',
  };

  const translatedPurpose = input.purpose && purposeMapAr[input.purpose] ? purposeMapAr[input.purpose] : input.purpose;

  return {
    valuationDate: method?.valuation_date ?? now,
    reportDate: now,
    basisOfValue: 'Market Value',
    standardReference: method?.reporting_standard_reference ?? (isAr
      ? 'منهجية تحليل معززة بدعم القرار متوافقة مع أساليب التقييم المعتمدة (السوق، التكلفة، الدخل) طبقاً للمعايير الدولية.'
      : 'TAQEEM-aligned decision-support workflow referencing IVS-style market, cost, and income approaches.'),
    primaryApproach,
    supportingApproaches,
    intendedUse: method?.intended_use ?? (isAr ? (translatedPurpose || 'دعم قرار استثماري') : (input.purpose ?? 'purchase decision support')),
    scopeOfWork: method?.scope_of_work ?? (isAr
      ? `تحليل مكتبي مؤتمت لعقار من نوع ${input.propertyType} في حي ${input.district} بمدينة ${input.city}. يقوم مسار العمل بتقدير القيمة السوقية الحالية، وافتراضات إعادة البيع بعد عام، وتحديد الصفقات المماثلة، وتحليل الجدوى المالية ومؤشرات المخاطر.`
      : `Automated desktop analysis for ${input.propertyType} in ${input.district}, ${input.city}. The workflow estimates current market value, one-year resale assumptions, comparable evidence, feasibility, and risk indicators.`),
    inspectionStatus: method?.inspection_status ?? (isAr
      ? 'لم يتم إجراء معاينة ميدانية للعقار من قبل المنصة. تستند إحداثيات الموقع ومواصفات العقار بالكامل على مدخلات المستخدم وبيانات الصفقات المتاحة.'
      : 'No physical inspection was performed by the platform. Location and property attributes are based on user input and available dataset fields.'),
    dataSources: isAr
      ? [
        'مجموعة بيانات الصفقات العقارية النظيفة والمحلية بمدينة جدة: muasher_full_data.csv',
        `مصدر التقييم الرئيسي: ${options.valuationSource === 'model' ? 'نموذج التقييم الذكي (AI)' : 'النموذج الإحصائي الاحتياطي'}`,
        `تم اختيار عدد ${options.comparableCount} صفقات مقارنة حقيقية كأدلة مرجعية في التقرير.`,
        method?.data_cutoff ? `تاريخ قطع البيانات: ${method.data_cutoff}` : '',
      ].filter(Boolean)
      : [
        'Local cleaned Jeddah transaction dataset: src/ai_model/muasher_full_data.csv',
        `Valuation source: ${options.valuationSource}`,
        `${options.comparableCount} comparable transactions selected for report evidence.`,
        method?.data_cutoff ? `Data cut-off date: ${method.data_cutoff}` : '',
      ].filter(Boolean),
    confidenceRationale: isAr
      ? `مستوى ثقة ${options.confidence === 'High' ? 'مرتفع' : options.confidence === 'Medium' ? 'متوسط' : 'منخفض'}. ${method?.confidence_rationale ?? (options.confidenceRationale === 'Generated from the trained model or statistical fallback using the available transaction dataset.' ? 'تم التوليد من النموذج المدرب أو الإحصائي البديل باستخدام مجموعة الصفقات المتاحة.' : options.confidenceRationale)}`
      : `${options.confidence} confidence. ${method?.confidence_rationale ?? options.confidenceRationale}`,
    assumptions: isAr
      ? [
        ...(method?.assumptions ?? []),
        'الافتراضات المدخلة لمواصفات العقار دقيقة وكاملة.',
        'مجموعة بيانات الصفقات تعكس أدلة وقيم السوق الحقيقية بعد التنظيف والتصفية.',
        'لم يتم التحقق المستقل من أي عيوب قانونية أو صكوك ملكية أو موانع بيئية أو عيوب خفية.',
        'بالنسبة للتوقعات المستقبلية لعام واحد، تفترض الدراسة استقرار اتجاهات السوق العامة ما لم يذكر خلاف ذلك.',
      ].filter((item, index, array) => array.indexOf(item) === index)
      : [
        ...(method?.assumptions ?? []),
        'The submitted property attributes are accurate and complete.',
        'The transaction dataset reflects comparable arm-length market evidence after cleaning and filtering.',
        'No legal, title, environmental, easement, or hidden physical defects were independently verified.',
        'For the one-year projection, current market trend assumptions remain broadly stable unless otherwise stated.',
      ].filter((item, index, array) => array.indexOf(item) === index),
    limitingConditions: isAr
      ? [
        ...(method?.limiting_conditions ?? []),
        'بيانات الأحياء الضعيفة، أو الصفقات المتكررة، أو نقص تفاصيل القطعة قد يقلل من دقة التقييم.',
        ...options.dataQualityNotes.slice(0, 4),
      ].filter((item, index, array) => array.indexOf(item) === index)
      : [
        ...(method?.limiting_conditions ?? []),
        'Thin district data, duplicate transactions, missing parcel details, or unavailable coordinates may reduce reliability.',
        ...options.dataQualityNotes.slice(0, 4),
      ].filter((item, index, array) => array.indexOf(item) === index),
    disclaimer: isAr
      ? 'تم إنشاء هذا التقرير لدعم اتخاذ القرار العقاري والاستثماري بناءً على التحليلات الإحصائية وبيانات السوق المتاحة.'
      : 'This report is generated for decision support only based on statistical analysis and available market data.',
  };
}

function buildOneYearForecast(options: {
  currentEstimatedPrice: number;
  currentEstimatedPricePerSqm: number;
  areaSqm: number;
  annualGrowthRatePercentage: number;
  basePrice?: number;
  confidence: ConfidenceLevel;
  method: string;
  rationale: string;
  warnings?: string[];
}): OneYearForecast {
  const boundedGrowth = Math.max(-20, Math.min(30, options.annualGrowthRatePercentage));
  const basePrice = Math.max(0, Math.round(options.basePrice ?? options.currentEstimatedPrice * (1 + boundedGrowth / 100)));
  const conservativeGrowth = boundedGrowth - 4;
  const optimisticGrowth = boundedGrowth + 4;
  const conservativePrice = Math.max(0, Math.round(options.currentEstimatedPrice * (1 + conservativeGrowth / 100)));
  const optimisticPrice = Math.max(basePrice, Math.round(options.currentEstimatedPrice * (1 + optimisticGrowth / 100)));
  const area = Math.max(options.areaSqm, 1);

  return {
    currentEstimatedPrice: Math.round(options.currentEstimatedPrice),
    currentEstimatedPricePerSqm: Math.round(options.currentEstimatedPricePerSqm),
    annualGrowthRatePercentage: Number(boundedGrowth.toFixed(2)),
    conservativePrice,
    basePrice,
    optimisticPrice,
    conservativePricePerSqm: Math.round(conservativePrice / area),
    basePricePerSqm: Math.round(basePrice / area),
    optimisticPricePerSqm: Math.round(optimisticPrice / area),
    confidence: options.confidence,
    method: options.method,
    rationale: options.rationale,
    warnings: options.warnings ?? [],
  };
}

function buildAgentAdvisory(input: PropertyInput, options: {
  recommendation: Recommendation;
  marketPosition: MarketPosition;
  confidence: ConfidenceLevel;
  fairValueMin: number;
  fairValueMax: number;
  estimatedPrice: number;
  overUnderPercentage: number;
  comparableCount: number;
  dataQualityNotes: string[];
  forecast?: OneYearForecast;
}, lang: 'ar' | 'en' = 'ar'): AgentAdvisory {
  const confidenceDiscount = options.confidence === 'Low' ? 0.08 : options.confidence === 'Medium' ? 0.05 : 0.03;
  const suggestedOfferMin = Math.max(0, Math.round(options.fairValueMin * (1 - confidenceDiscount)));
  const suggestedOfferMax = Math.max(suggestedOfferMin, Math.round(Math.min(options.estimatedPrice, options.fairValueMax) * 0.98));
  const walkAwayPrice = Math.round(options.fairValueMax * (options.marketPosition === 'Undervalued' ? 1.02 : 1));
  const forecastUpside = options.forecast && options.estimatedPrice > 0
    ? Math.round(((options.forecast.basePrice - options.estimatedPrice) / options.estimatedPrice) * 100)
    : 0;

  const isAr = lang === 'ar';

  const decisionSummary = isAr
    ? (options.recommendation === 'Avoid'
      ? 'لا ننصح بأخذ أي خطوة شراء إلا إذا قام البائع بخفض السعر بشكل كبير أو ظهرت أدلة جديدة تغير التقييم.'
      : options.recommendation === 'Strong Buy' || options.recommendation === 'Buy'
        ? 'الفرصة الاستثمارية جاذبة وممتازة بشرط تأكيد الافتراضات التخطيطية والبلدية وفحص صك الملكية.'
        : options.marketPosition === 'Overpriced'
          ? 'المتابعة فقط عبر التفاوض الجاد؛ السعر المطلوب أعلى من النطاق المدعوم بالصفقات.'
          : 'المتابعة بحذر مع التفاوض والتحقق الدقيق قبل تخصيص أو استثمار رأس المال.')
    : (options.recommendation === 'Avoid'
      ? 'Do not proceed unless the seller materially reduces the price or new evidence changes the valuation.'
      : options.recommendation === 'Strong Buy' || options.recommendation === 'Buy'
        ? 'The opportunity is attractive if legal, planning, and parcel checks confirm the submitted assumptions.'
        : options.marketPosition === 'Overpriced'
          ? 'Proceed only through negotiation; the asking price is above the supported range.'
          : 'Proceed carefully with negotiation and verification before committing capital.');

  const negotiationPosition = isAr
    ? (options.marketPosition === 'Overpriced'
      ? `ابدأ المفاوضات بسعر قريب من ${formatSar(suggestedOfferMin)} وتجنب تجاوز ${formatSar(walkAwayPrice)} دون وجود صفقات مقارنة أقوى.`
      : options.marketPosition === 'Undervalued'
        ? `السعر المطلوب يبدو أقل من النطاق السوقي المدعوم؛ تحرك بسرعة ولكن مع وضع حد أقصى للعرض عند ${formatSar(suggestedOfferMax)} حتى تكتمل الدراسة القانونية والفنية.`
        : `استخدم النطاق السعري العادل كورقة ضغط في التفاوض واستهدف تقديم عرض بين ${formatSar(suggestedOfferMin)} و ${formatSar(suggestedOfferMax)}.`)
    : (options.marketPosition === 'Overpriced'
      ? `Anchor negotiations near ${formatSar(suggestedOfferMin)} and avoid exceeding ${formatSar(walkAwayPrice)} without stronger comparable evidence.`
      : options.marketPosition === 'Undervalued'
        ? `The asking price appears below the supported range; move quickly but still cap the offer around ${formatSar(suggestedOfferMax)} until due diligence is complete.`
        : `Use the fair range as leverage and target an offer between ${formatSar(suggestedOfferMin)} and ${formatSar(suggestedOfferMax)}.`);

  const nextActions = isAr
    ? [
      'التحقق من صك الملكية وحدود قطعة الأرض وأي رهونات قبل البدء في التفاوض.',
      'طلب صفقات مقارنة حديثة من البائع أو الوسيط ومقارنتها بالأسعار الموضحة في هذا التقرير.',
      'تأكيد الاشتراطات البلدية، الاستخدام المصرح، الارتدادات، عرض الشارع، وقيود التطوير مع الأمانة أو البلدية المختصة.',
      forecastUpside > 0
        ? `استخدام نسبة النمو المتوقعة لعام واحد وهي ${forecastUpside}% كحجة ثانوية في التفاوض وليس كأرباح مضمونة.`
        : 'التركيز على القيمة العادلة الحالية وحماية رأس المال من الهبوط بدلاً من الاعتماد على توقعات نمو الأسعار.',
    ]
    : [
      'Verify title, parcel boundaries, and any encumbrances before negotiation.',
      'Request recent comparable evidence from the seller or broker and compare it with this report.',
      'Confirm zoning, permitted use, setbacks, street width, and development restrictions with the relevant authority.',
      forecastUpside > 0
        ? `Use the one-year base forecast upside of ${forecastUpside}% as a secondary argument, not as guaranteed appreciation.`
        : 'Do not rely on appreciation upside; focus on current fair value and downside protection.',
    ];

  const dueDiligenceChecklist = isAr
    ? [
      'مطابقة صك الملكية وحالة الملاك',
      'إحداثيات قطعة الأرض والحدود الرسمية في المخطط المعتمد',
      'عرض الشارع الفعلي والوصول وحالة الأسفلت والإنارة',
      'اشتراطات البناء ونسبة البناء والاستخدام المعتمد من البلدية',
      'تتبع صفقات البيع المقارنة الأخيرة في الحي خلال الفترة القريبة الماضية',
      'تحديد عمولة السعي، الضريبة (التصرفات العقارية)، تكاليف النقل، وشروط التمويل',
    ]
    : [
      'Title deed and ownership status',
      'Parcel coordinates and official survey boundaries',
      'Street width and access verification',
      'Zoning, land-use, and building regulations',
      'Comparable transactions from the latest market period',
      'Broker commission, taxes, transfer costs, and financing terms',
    ];

  const missingInputs = isAr
    ? [
      input.latitude === null || input.longitude === null ? 'الاحداثيات الدقيقة لقطعة الأرض' : '',
      !input.streetWidth ? 'عرض الشارع المؤكد' : '',
      !input.frontage ? 'طول الواجهة الفعلي' : '',
      !input.frontageDirection ? 'اتجاه الواجهة' : '',
      options.comparableCount < 5 ? 'مزيد من صفقات البيع المقارنة القريبة والحديثة' : '',
      options.dataQualityNotes.length ? 'معالجة تحذيرات وملاحظات جودة البيانات' : '',
    ].filter(Boolean)
    : [
      input.latitude === null || input.longitude === null ? 'Exact parcel coordinates' : '',
      !input.streetWidth ? 'Verified street width' : '',
      !input.frontage ? 'Frontage length' : '',
      !input.frontageDirection ? 'Frontage direction' : '',
      options.comparableCount < 5 ? 'More recent comparable transactions' : '',
      options.dataQualityNotes.length ? 'Resolution of data-quality warnings' : '',
    ].filter(Boolean);

  const questionsToAsk = isAr
    ? [
      'ما هي أسباب البيع الحالية، وما هي مدى مرونة البائع في السعر المطلوب؟',
      'هل توجد أي قيود أو رهون عقارية أو نزاعات قانونية أو ملكيات مشتركة على الأرض؟',
      'هل يستطيع البائع توفير قرار ذرعة رسمي، صورة الصك، وتقرير الكروكي التنظيمي؟',
      'ما هي صفقات البيع الفعلية التي اعتمد عليها الوسيط لتبرير هذا السعر المطلوب؟',
      'هل تتوفر خدمات البنية التحتية (كهرباء، ماء، صرف، إنارة) في القطعة حالياً؟',
    ]
    : [
      'Why is the seller selling now, and how flexible is the asking price?',
      'Are there any restrictions, liens, disputes, or shared ownership issues?',
      'Can the seller provide official survey, deed, and zoning documents?',
      'What comparable sales does the broker use to justify the asking price?',
      'Are infrastructure, access, and utilities already available at the parcel?',
    ];

  return {
    decisionSummary,
    negotiationPosition,
    suggestedOfferMin,
    suggestedOfferMax,
    walkAwayPrice,
    nextActions,
    dueDiligenceChecklist,
    missingInputs,
    questionsToAsk,
  };
}

function mergeModelAgentAdvice(base: AgentAdvisory, modelValuation: ModelValuation): AgentAdvisory {
  const advice = modelValuation.agentAdvice;
  if (!advice) return base;

  return {
    ...base,
    decisionSummary: advice.decision_summary || base.decisionSummary,
    negotiationPosition: advice.recommendation
      ? `${advice.recommendation}. ${advice.decision_summary || base.negotiationPosition}`
      : base.negotiationPosition,
    suggestedOfferMin: Number.isFinite(advice.suggested_offer_min) ? advice.suggested_offer_min : base.suggestedOfferMin,
    suggestedOfferMax: Number.isFinite(advice.suggested_offer_max) ? advice.suggested_offer_max : base.suggestedOfferMax,
    walkAwayPrice: Number.isFinite(advice.walk_away_price) ? advice.walk_away_price : base.walkAwayPrice,
    nextActions: advice.next_actions?.length
      ? Array.from(new Set([...advice.next_actions, ...base.nextActions])).slice(0, 6)
      : base.nextActions,
  };
}

function buildReportEvidence(lang: 'ar' | 'en' = 'ar'): ReportEvidence {
  const timeSplit = modelMetrics.evaluations.deduplicated_time_split_latest_12_months;
  const randomSplit = modelMetrics.evaluations.deduplicated_random_split;
  const baseline = modelMetrics.evaluations.baseline_district_type_median_time_split;
  const artifactByPath = new Map(artifactManifest.files.map((item) => [item.path, item]));

  return {
    generatedAt: new Date().toISOString(),
    dataset: {
      sourceFile: dataQualityReport.source_file,
      rows: dataQualityReport.rows,
      deduplicatedRows: modelMetrics.dataset.deduplicated_rows,
      duplicateRows: dataQualityReport.duplicate_rows,
      districtCount: dataQualityReport.district_count,
      propertyTypeCounts: dataQualityReport.property_type_counts,
      dateRangeMin: dataQualityReport.date_range.min,
      dateRangeMax: dataQualityReport.date_range.max,
      latest12MonthRows: dataQualityReport.quality_flags.latest_12_month_rows,
    },
    dataQuality: {
      missingPlan: dataQualityReport.missing_values.plan,
      missingParcel: dataQualityReport.missing_values.parcel,
      suspectTotalPriceRows: dataQualityReport.quality_flags.suspect_total_price_vs_area_times_price_per_sqm,
      zeroOrNegativeTotalPriceRows: dataQualityReport.quality_flags.zero_or_negative_total_price,
    },
    model: {
      family: modelMetrics.model_family,
      target: modelMetrics.target,
      features: modelMetrics.features,
      randomSplitMae: randomSplit.mae_sar_per_sqm,
      timeSplitMae: timeSplit.mae_sar_per_sqm,
      timeSplitMape: timeSplit.mape_percent,
      baselineTimeSplitMae: baseline.mae_sar_per_sqm,
      validationWarning: lang === 'ar'
        ? 'التحقق الزمني هو الإشارة الرئيسية لجاهزية التشغيل؛ قد يبالغ التقسيم العشوائي في الدقة عند وجود صفقات مكررة.'
        : 'Time-based validation is the primary production-readiness signal; random split can overstate accuracy when duplicate transactions exist.',
    },
    forecastBacktest: {
      method: forecastMetrics.method,
      segmentsTested: forecastMetrics.summary.segments_tested,
      maeSarPerSqm: forecastMetrics.summary.mae_sar_per_sqm,
      medianAbsoluteErrorSarPerSqm: forecastMetrics.summary.median_absolute_error_sar_per_sqm,
      mapePercent: forecastMetrics.summary.mape_percent,
      medianApePercent: forecastMetrics.summary.median_ape_percent,
    },
    artifacts: {
      manifestGeneratedAt: artifactManifest.generated_at,
      datasetSha256: artifactByPath.get('muasher_full_data.csv')?.sha256 ?? null,
      valuationModelSha256: artifactByPath.get('valuation_model.pkl')?.sha256 ?? null,
      predictionStatsSha256: artifactByPath.get('prediction_stats.json')?.sha256 ?? null,
      pythonVersion: artifactManifest.dependencies.python,
      xgboostVersion: artifactManifest.dependencies.xgboost,
      sklearnVersion: artifactManifest.dependencies['scikit-learn'],
    },
  };
}

function confidenceWeight(confidence: ConfidenceLevel) {
  if (confidence === 'High') return 1;
  if (confidence === 'Medium') return 0.82;
  return 0.62;
}

function buildReconciliation(options: {
  areaSqm: number;
  marketValue: number;
  modelValue?: number;
  statisticalValue?: number;
  costValue?: number | null;
  fairValueMin: number;
  fairValueMax: number;
  marketConfidence: ConfidenceLevel;
  modelConfidence?: ConfidenceLevel;
  costConfidence?: ConfidenceLevel;
  primaryApproach?: ValuationReconciliation['primaryApproach'];
}, lang: 'ar' | 'en' = 'ar'): ValuationReconciliation {
  const area = Math.max(options.areaSqm, 1);
  const isAr = lang === 'ar';
  const approaches: ValuationReconciliation['approaches'] = [
    {
      name: 'Market Approach',
      value: Math.round(options.marketValue),
      valuePerSqm: Math.round(options.marketValue / area),
      weight: 0.7 * confidenceWeight(options.marketConfidence),
      confidence: options.marketConfidence,
      rationale: isAr
        ? 'تأتي الأدلة الأساسية للأراضي في جدة من صفقات البيع المقارنة الفعلية في السوق ونطاق القيمة العادلة المكتشف.'
        : 'Primary evidence for Jeddah land comes from comparable market transactions and the indicated fair range.',
    },
  ];

  if (options.modelValue && options.modelValue > 0) {
    approaches.push({
      name: 'Model Estimate',
      value: Math.round(options.modelValue),
      valuePerSqm: Math.round(options.modelValue / area),
      weight: 0.2 * confidenceWeight(options.modelConfidence ?? 'Medium'),
      confidence: options.modelConfidence ?? 'Medium',
      rationale: isAr
        ? 'تقدير نموذج تعلم الآلة يُستخدم كمؤشر داعم إضافي وليس كاستنتاج نهائي وحيد للقيمة.'
        : 'Machine-learning estimate used as a supporting indicator, not as the sole valuation conclusion.',
    });
  }

  if (options.statisticalValue && options.statisticalValue > 0) {
    approaches.push({
      name: 'Statistical Market',
      value: Math.round(options.statisticalValue),
      valuePerSqm: Math.round(options.statisticalValue / area),
      weight: 0.2,
      confidence: 'Medium',
      rationale: isAr
        ? 'إحصاءات أسعار السوق على مستوى الحي تُستخدم كفحص معقولية إضافي للقيمة.'
        : 'District-level market statistics used as a reasonableness check.',
    });
  }

  if (options.costValue && options.costValue > 0) {
    approaches.push({
      name: 'Cost Approach',
      value: Math.round(options.costValue),
      valuePerSqm: Math.round(options.costValue / area),
      weight: 0.1 * confidenceWeight(options.costConfidence ?? 'Medium'),
      confidence: options.costConfidence ?? 'Medium',
      rationale: isAr
        ? 'يتم تضمين أسلوب التكلفة كفحص معقولية ثانوي عندما تتوفر بيانات تكلفة المباني والإنشاء.'
        : 'Cost approach is included as a secondary reasonableness check where building/cost data is available.',
    });
  }

  const totalWeight = approaches.reduce((sum, approach) => sum + approach.weight, 0) || 1;
  const finalValue = Math.round(approaches.reduce((sum, approach) => sum + approach.value * approach.weight, 0) / totalWeight);
  const normalizedApproaches = approaches.map((approach) => ({
    ...approach,
    weight: Number(((approach.weight / totalWeight) * 100).toFixed(1)),
  }));
  
  const primaryApproach = options.primaryApproach ?? 'Market Approach';

  return {
    finalValue,
    finalValuePerSqm: Math.round(finalValue / area),
    fairValueMin: options.fairValueMin,
    fairValueMax: options.fairValueMax,
    primaryApproach,
    approaches: normalizedApproaches,
    summary: isAr
      ? `تتم تسوية القيمة النهائية بشكل أساسي بناءً على ${primaryApproach === 'Market Approach' ? 'أسلوب السوق' : primaryApproach === 'Cost Approach' ? 'أسلوب التكلفة' : 'أسلوب الدخل'}، مع استخدام المؤشرات الثانوية كفحوصات معقولية فقط. تظل أدلة السوق هي المسيطرة لتقييم الأراضي حتى تتوفر تفاصيل أكثر عن المخططات أو الدخل أو البناء.`
      : `Final value is reconciled primarily from the ${primaryApproach}, with secondary indicators used only as reasonableness checks. Market evidence remains the controlling approach for land until richer parcel, income, or construction evidence is available.`,
  };
}

export async function buildReport(input: PropertyInput, lang: 'ar' | 'en' = 'ar'): Promise<ReportData> {
  try {
    const rawReport = await getFullReport(input);
    const isAr = lang === 'ar';
    
    // Map the backend response directly to the ReportData structure
    const valuation = rawReport.valuation;
    const feasibility = rawReport.feasibility;
    const aiAnalysis = rawReport.ai_analysis;
    const costApproach = rawReport.cost_approach;
    const spatialFeatures = rawReport.spatial_features;
    const compAdjustmentsTable = rawReport.comparables_adjustments_table;

    // Calculate over/under percentage
    const estimatedPrice = valuation.total_current_price;
    const overUnderPercentage = input.askingPrice > 0 
      ? Math.round(((input.askingPrice - estimatedPrice) / estimatedPrice) * 100)
      : 0;
      
    const marketPosition = input.askingPrice > estimatedPrice * 1.05 
      ? 'Overpriced' 
      : input.askingPrice < estimatedPrice * 0.95 
        ? 'Undervalued' 
        : 'Fair';

    // Map scenarios
    const holdingPeriod = Math.max(input.holdingPeriod, 1);
    const annualGrowthRate = Number(valuation.annual_growth_rate_percentage ?? 3.5);
    const forecastConfidence: ConfidenceLevel = feasibility.confidence.score >= 80 ? 'High' : feasibility.confidence.score >= 65 ? 'Medium' : 'Low';
    const oneYearForecast = buildOneYearForecast({
      currentEstimatedPrice: estimatedPrice,
      currentEstimatedPricePerSqm: valuation.current_price_per_meter,
      areaSqm: input.areaSqm,
      annualGrowthRatePercentage: annualGrowthRate,
      basePrice: valuation.total_predicted_price_1year,
      confidence: forecastConfidence,
      method: isAr
        ? 'إسقاط اتجاهات الحي من سجل الصفقات التاريخية مع نطاق السيناريوهات.'
        : 'District trend projection from transaction history with scenario range.',
      rationale: isAr
        ? `يستخدم مرجع النمو السنوي للحي بنسبة ${annualGrowthRate}% من إحصاءات النموذج والقيمة الحالية المسوّاة.`
        : `Uses the district annual growth reference of ${annualGrowthRate}% from the model statistics and the current reconciled value.`,
      warnings: annualGrowthRate >= 20 || annualGrowthRate <= -5 
        ? [isAr ? 'معدل النمو مرتفع جداً أو مقيد؛ تعامل مع التنبؤ كاتجاه عام استرشادي.' : 'Growth rate is capped or extreme; treat the one-year forecast as directional.'] 
        : [],
    });
    const expectedSellingPrice = Math.round(estimatedPrice * Math.pow(1 + annualGrowthRate / 100, holdingPeriod));
    const totalInvestmentCost = input.askingPrice + input.developmentCost;
    const expectedRentalIncome = input.expectedRent * holdingPeriod;
    const expectedNetProfit = expectedSellingPrice + expectedRentalIncome - totalInvestmentCost;
    const roiPercentage = totalInvestmentCost > 0 ? Number(((expectedNetProfit / totalInvestmentCost) * 100).toFixed(1)) : 0;

    const rec = feasibility.recommendation.verdict.includes('STRONG BUY') ? 'Strong Buy' 
      : feasibility.recommendation.verdict.includes('BUY') ? 'Buy' 
      : feasibility.recommendation.verdict.includes('HOLD') ? 'Hold' : 'Avoid';

    // Rationale Bullets Generation
    const recommendationRationale: string[] = [];
    if (rec === 'Avoid' && marketPosition === 'Undervalued') {
      recommendationRationale.push(
        `سعر العقار مغرٍ وأقل من القيمة السوقية العادلة (Undervalued)، ولكن الجدوى الاستثمارية الإجمالية للمشروع ضعيفة بسبب انخفاض العائد المتوقع على الاستثمار (ROI: ${roiPercentage}%).`,
        `مستوى سيولة السوق في حي ${input.district} منخفض وتستغرق عملية الخروج وتسييل الأصول فترة أطول مما يرفع المخاطر.`,
        `حجم البيانات المتاحة ونشاط التداول المحدود بالمنطقة يزيد من درجة عدم اليقين وصعوبة التنبؤ بالقيمة المستقرة.`
      );
    } else if (rec === 'Avoid') {
      recommendationRationale.push(
        `السعر المطلوب مبالغ فيه (Overpriced) ويتجاوز القيمة العادلة التقديرية للعقار بنسبة ${overUnderPercentage}%.`,
        `العائد الاستثماري الكلي المتوقع ضعيف جداً (${roiPercentage}%) نظراً لارتفاع تكلفة الاستحواذ الأولية مقارنة بالإيجارات المتوقعة.`,
        `مخاطر السوق وتراجع الأسعار مرتفعة بالمنطقة في الوقت الحالي، مما يستدعي تجنب الشراء أو إعادة التفاوض بشكل صارم.`
      );
    } else if (rec === 'Strong Buy' || rec === 'Buy') {
      recommendationRationale.push(
        `سعر الشراء المطلوب أقل من القيمة السوقية العادلة أو يتماشى معها تماماً، مما يوفر هامش أمان ممتاز للمستثمر.`,
        `المشروع يحقق جدوى مالية قوية وعائداً استثمارياً كلياً متوقعاً يبلغ ${roiPercentage}% مع فترة استرداد رأس مال مناسبة.`,
        `نشاط التداول العقاري النشط والسيولة القوية بالحي تسهل عمليات التشغيل والتسييل والخروج الاستثماري مستقبلاً.`
      );
    } else { // Hold
      recommendationRationale.push(
        `سعر العقار المطلوب يقع ضمن النطاق العادل للقيمة التقديرية تماماً دون وجود خصم أو علاوة سعرية تذكر.`,
        `العوائد الاستثمارية متوازنة وتتماشى مع متوسطات السوق، ولكنها تتطلب تحسين كفاءة التشغيل أو خفض التكلفة الإضافية لرفع الجدوى.`,
        `مخاطر التطوير والتنفيذ معتدلة، والسيولة العقارية مستقرة بالحي مما يجعل المشروع استثماراً دفاعياً آمناً.`
      );
    }

    const paybackVal = feasibility.performance.payback_years;
    const paybackPeriod = (input.expectedRent > 0 && paybackVal > 0 && paybackVal < 900)
      ? `${paybackVal.toFixed(1)} ${isAr ? 'سنوات' : 'years'}`
      : 'غير متاح (N/A)';

    // Warning for valuation purpose
    const purposeWarning = (!input.purpose || input.purpose === 'معرفة القيمة السوقية')
      ? (isAr ? 'غرض التقييم غير محدد بدقة، وهذا قد يؤثر على صياغة التقرير.' : 'Valuation purpose is unspecified; this might affect report context.')
      : null;

    const dataQualityNotes = isAr
      ? [
        `تفاصيل مستوى الثقة: ${feasibility.confidence.reason}`,
        `التقييم الجغرافي: درجة الكثافة والمرافق المجاورة تبلغ ${spatialFeatures?.density_score || 5.0}/10 بناءً على القرب من المعالم.`
      ]
      : [
        `Confidence level details: ${feasibility.confidence.reason}`,
        `Spatial score: Density score of ${spatialFeatures?.density_score || 5.0}/10 based on landmark proximities.`
      ];
    if (purposeWarning) {
      dataQualityNotes.push(purposeWarning);
    }

    const agentAdvisory = buildAgentAdvisory(input, {
      recommendation: rec,
      marketPosition,
      confidence: forecastConfidence,
      fairValueMin: valuation.market_min_price_per_meter * input.areaSqm,
      fairValueMax: valuation.market_max_price_per_meter * input.areaSqm,
      estimatedPrice,
      overUnderPercentage,
      comparableCount: rawReport.comparables.length,
      dataQualityNotes,
      forecast: oneYearForecast,
    }, lang);
    const reconciliation = buildReconciliation({
      areaSqm: input.areaSqm,
      marketValue: estimatedPrice,
      modelValue: estimatedPrice,
      costValue: costApproach?.total_property_value ?? null,
      fairValueMin: valuation.market_min_price_per_meter * input.areaSqm,
      fairValueMax: valuation.market_max_price_per_meter * input.areaSqm,
      marketConfidence: forecastConfidence,
      modelConfidence: forecastConfidence,
      costConfidence: costApproach ? 'Medium' : undefined,
      primaryApproach: valuation.valuation_method === 'market_approach' ? 'Market Approach' : 'Cost Approach',
    }, lang);

    const report: ReportData = {
      id: `MR-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      property: input,
      summary: {
        recommendation: rec,
        investmentScore: feasibility.recommendation.score,
        riskLevel: feasibility.recommendation.score >= 80 ? 'Low' 
          : feasibility.recommendation.score >= 65 ? 'Medium' : 'High',
        keyInsights: isAr
          ? [
            `نطاق القيمة العادلة يتراوح بين ${formatSar(valuation.market_min_price_per_meter * input.areaSqm)} إلى ${formatSar(valuation.market_max_price_per_meter * input.areaSqm)}.`,
            `تم اختيار ${rawReport.comparables.length} صفقة حقيقية من قاعدة البيانات المحلية كأدلة مقارنة.`,
            `منهجية التقييم المستخدمة هي ${valuation.valuation_method === 'market_approach' ? 'تسوية مبيعات السوق المقارنة' : 'حساب تكلفة الإحلال مع الإهلاك الصافي'}.`,
            `عرض الشارع هو ${input.streetWidth} متر، حالة الزاوية: ${input.isCorner ? 'نعم' : 'لا'}.`,
          ]
          : [
            `Fair value range is ${formatSar(valuation.market_min_price_per_meter * input.areaSqm)} to ${formatSar(valuation.market_max_price_per_meter * input.areaSqm)}.`,
            `${rawReport.comparables.length} real transactions from the local dataset were selected as comparable evidence.`,
            `The valuation method is ${valuation.valuation_method === 'market_approach' ? 'Market Comparable Adjustments' : 'Cost Economic Life Depreciation'}.`,
            `Street width is ${input.streetWidth}m, Corner status is ${input.isCorner ? 'Yes' : 'No'}.`,
          ],
        recommendationRationale,
      },
      valuation: {
        askingPrice: input.askingPrice,
        estimatedPrice: estimatedPrice,
        estimatedPricePerSqm: valuation.current_price_per_meter,
        fairValueMin: valuation.market_min_price_per_meter * input.areaSqm,
        fairValueMax: valuation.market_max_price_per_meter * input.areaSqm,
        overUnderPercentage,
        marketPosition,
        confidence: feasibility.confidence.score >= 80 ? 'High' : feasibility.confidence.score >= 65 ? 'Medium' : 'Low',
        modelVersion: 'taqeem-v3',
        source: 'model',
      },
      forecast: oneYearForecast,
      agentAdvisory,
      evidence: buildReportEvidence(lang),
      reconciliation,
      methodology: buildMethodology(input, {
        confidence: feasibility.confidence.score >= 80 ? 'High' : feasibility.confidence.score >= 65 ? 'Medium' : 'Low',
        confidenceRationale: feasibility.confidence.reason,
        primaryApproach: valuation.valuation_method === 'market_approach' ? 'Market Approach' : 'Cost Approach',
        supportingApproaches: valuation.valuation_method === 'market_approach' ? ['Cost Approach'] : ['Market Approach'],
        valuationSource: 'full_report_api',
        comparableCount: rawReport.comparables.length,
        dataQualityNotes,
      }, lang),
      market: {
        city: input.city,
        district: input.district,
        propertyType: input.propertyType,
        averagePricePerSqm: valuation.current_price_per_meter,
        medianPricePerSqm: valuation.current_price_per_meter,
        minPricePerSqm: valuation.market_min_price_per_meter,
        maxPricePerSqm: valuation.market_max_price_per_meter,
        transactionsCount: feasibility.confidence.transaction_count,
        liquidityScore: valuation.liquidity.status === 'Hot' ? 90 : valuation.liquidity.status === 'Active' ? 75 : 55,
      },
      comparables: rawReport.comparables.map((c: any, index: number) => ({
        id: `comp-${index}`,
        district: c.district || input.district,
        areaSqm: c.area || input.areaSqm,
        totalPrice: c.total_price || (c.price_sqm * (c.area || input.areaSqm)),
        pricePerSqm: c.price_sqm || c.price_per_sqm,
        date: c.date || new Date().toISOString().split('T')[0],
        distanceKm: c.distance ? parseFloat(c.distance) : 1.0,
        similarityScore: 85 - index * 5,
      })),
      scoreBreakdown: {
        price: feasibility.recommendation.breakdown?.roi || 70,
        location: feasibility.recommendation.breakdown?.market || 80,
        liquidity: 75,
        development: feasibility.recommendation.breakdown?.payback || 70,
        risk: feasibility.recommendation.breakdown?.risk || 20,
      },
      hbu: {
        bestUse: feasibility.hbu[0]?.label || input.landUse,
        scenarios: feasibility.hbu.map((h: any) => ({
          name: isAr
            ? (h.label === 'Residential development' ? 'تطوير سكني' : h.label === 'Buy and hold' ? 'شراء واحتفاظ' : h.label === 'Quick resale' ? 'إعادة بيع سريعة' : h.label)
            : h.label,
          revenue: h.revenue || (expectedSellingPrice + expectedRentalIncome),
          cost: h.cost || totalInvestmentCost,
          roi: h.roi,
          risk: h.risk || 'Medium',
          suitability: h.roi > 7.0 ? 85 : 65
        }))
      },
      roi: {
        purchaseCost: input.askingPrice,
        developmentCost: input.developmentCost,
        totalInvestmentCost,
        expectedSellingPrice,
        expectedRentalIncome,
        expectedNetProfit,
        roiPercentage: roiPercentage,
        paybackPeriod: paybackPeriod,
        projectedCapitalGain: Math.max(expectedSellingPrice - totalInvestmentCost, 0),
        annualRentalYield: input.expectedRent > 0 && totalInvestmentCost > 0
          ? Number((input.expectedRent / totalInvestmentCost * 100).toFixed(2))
          : 0,
      },
      risks: isAr
        ? [
          {
            title: marketPosition === 'Overpriced' ? 'السعر المطلوب أعلى من نطاق القيمة العادلة' : 'حساسية التسعير السوقي',
            level: marketPosition === 'Overpriced' ? 'High' : 'Medium',
            explanation: marketPosition === 'Overpriced'
              ? `السعر المطلوب أعلى بنسبة ${Math.abs(overUnderPercentage)}% من تقدير النموذج.`
              : 'السعر المطلوب يقع ضمن النطاق المحسوب، ولكن المفاوضات يجب أن ترتكز على أدلة صفقات مقارنة حقيقية.',
            mitigation: 'استخدم النطاق العادل والصفقات المقارنة كأسس للتفاوض وتحديد السعر المستهدف.',
          },
          {
            title: 'مدى توفر بيانات الصفقات المقارنة',
            level: feasibility.confidence.score >= 75 ? 'Low' : 'Medium',
            explanation: `يتوفر في الحي بيانات صفقات كافية للتقييم.`,
            mitigation: 'زيادة موثوقية التقييم عن طريق إدراج صفقات أحدث أو سجلات بلدية إضافية عند توفرها.',
          },
          {
            title: 'افتراضات التخطيط والتقسيم واشتراطات البناء',
            level: 'Medium',
            explanation: 'عرض الشارع واشتراطات البناء البلدية تؤثر بشكل مباشر على الجدوى المالية لقرار الاستحواذ ويجب التحقق منها رسمياً.',
            mitigation: 'التأكد من اشتراطات البناء والارتدادات ونسب التغطية وعدد الأدوار المسموح بها مع البلدية قبل الشراء.',
          },
        ]
        : [
          {
            title: marketPosition === 'Overpriced' ? 'Asking price above fair value range' : 'Pricing sensitivity',
            level: marketPosition === 'Overpriced' ? 'High' : 'Medium',
            explanation: marketPosition === 'Overpriced'
              ? `The asking price is ${Math.abs(overUnderPercentage)}% above the model estimate.`
              : 'The asking price is near the calculated range, but negotiation should still use verified comparables.',
            mitigation: 'Use the fair range and comparable transactions as negotiation anchors.',
          },
          {
            title: 'Comparable data depth',
            level: feasibility.confidence.score >= 75 ? 'Low' : 'Medium',
            explanation: feasibility.confidence.reason,
            mitigation: 'Increase confidence by adding licensed or newer transaction sources when available.',
          },
          {
            title: 'Zoning and development assumptions',
            level: 'Medium',
            explanation: 'Street width and development assumptions affect feasibility but must be verified externally.',
            mitigation: 'Confirm zoning, setbacks, parking, and allowed floors before acquisition.',
          },
        ],
      dataQualityNotes,
      memo: aiAnalysis.executive_summary + '\n\n' + aiAnalysis.recommendation,
      comparables_adjustments_table: compAdjustmentsTable,
      cost_approach: costApproach
    };

    return report;
  } catch (error) {
    console.error('Failed to get full report from API, falling back to local builder', error);
    // Fallback local build
    const normalizedCoordinates = normalizeCoordinates({ latitude: input.latitude, longitude: input.longitude });
    const preparedInput = {
      ...input,
      ...normalizedCoordinates,
      pricePerSqm: input.areaSqm > 0 ? Math.round(input.askingPrice / input.areaSqm) : 0,
    };
    const valuation = await predictValuation(preparedInput);
    return buildReportFromValuation(preparedInput, valuation, getCoordinateWarnings(input, normalizedCoordinates), lang);
  }
}

function validateReportQuality(input: PropertyInput, modelValuation: ModelValuation, comparables: ReportData['comparables'], coordinateWarnings: string[]) {
  const warnings: string[] = [...coordinateWarnings];
  if (input.askingPrice <= 0) warnings.push('Asking price must be greater than zero.');
  if (input.areaSqm <= 0) warnings.push('Area must be greater than zero.');
  if (modelValuation.estimatedTotalPrice <= 0) warnings.push('Estimated price is missing or invalid.');
  if (modelValuation.fairRangeMin <= 0 || modelValuation.fairRangeMax <= modelValuation.fairRangeMin) warnings.push('Fair value range is invalid.');
  if (comparables.some((item) => item.areaSqm <= 0 || item.pricePerSqm <= 0 || item.totalPrice <= 0 || item.totalPrice < item.areaSqm * item.pricePerSqm * 0.65)) {
    warnings.push('One or more comparable rows had unrealistic price/area values.');
  }
  return warnings;
}

function buildReportFromValuation(input: PropertyInput, modelValuation: ModelValuation, coordinateWarnings: string[], lang: 'ar' | 'en' = 'ar'): ReportData {
  const market = getMarketIndicators(input);
  const comparables = getComparableTransactions(input, 12);
  const isAr = lang === 'ar';
  const dataQualityNotes = [
    ...getTransactionDataQualityWarnings(),
    ...validateReportQuality(input, modelValuation, comparables, coordinateWarnings),
  ];
  const marketPosition = getMarketPosition(input.askingPrice, modelValuation.fairRangeMin, modelValuation.fairRangeMax);
  const overUnderPercentage = getOverUnderPercentage(input.askingPrice, modelValuation.estimatedTotalPrice);
  const scoreBreakdown = calculateScore(input, modelValuation, market);
  const investmentScore = totalScore(scoreBreakdown);
  const recommendation = getRecommendation(investmentScore, marketPosition);
  const riskLevel = getRiskLevel(investmentScore, marketPosition, modelValuation.confidence);

  const holdingPeriod = Math.max(input.holdingPeriod, 1);
  const annualGrowthRate = modelValuation.annualGrowthRatePercentage ?? 3.5;
  const oneYearForecast = buildOneYearForecast({
    currentEstimatedPrice: modelValuation.estimatedTotalPrice,
    currentEstimatedPricePerSqm: modelValuation.estimatedPricePerSqm,
    areaSqm: input.areaSqm,
    annualGrowthRatePercentage: annualGrowthRate,
    basePrice: modelValuation.oneYearForecastPrice,
    confidence: modelValuation.confidence,
    method: modelValuation.source === 'model'
      ? (isAr ? 'إسقاط اتجاهات الحي من سجل الصفقات التاريخية مع نطاق السيناريوهات.' : 'Model API one-year projection using district or global growth reference.')
      : (isAr ? 'إسقاط إحصائي بديل باستخدام افتراضات نمو السوق المحافظة.' : 'Statistical fallback projection using conservative market growth assumption.'),
    rationale: modelValuation.source === 'model'
      ? (isAr ? 'يستخدم مرجع النمو السنوي للحي المرتجع من واجهة التنبؤ.' : 'Uses the growth reference returned by the prediction API.')
      : (isAr ? 'يستخدم نمواً محافظاً بنسبة 3.5% كبديل نظراً لعدم توفر واجهة النموذج.' : 'Uses a conservative 3.5% annual growth fallback because the model API was unavailable.'),
    warnings: modelValuation.warnings ?? [],
  });
  const expectedSellingPrice = Math.round(modelValuation.estimatedTotalPrice * Math.pow(1 + annualGrowthRate / 100, holdingPeriod));
  const totalInvestmentCost = input.askingPrice + input.developmentCost;
  const expectedRentalIncome = input.expectedRent * holdingPeriod;
  const expectedNetProfit = expectedSellingPrice + expectedRentalIncome - totalInvestmentCost;
  const roiPercentage = totalInvestmentCost > 0 ? Number(((expectedNetProfit / totalInvestmentCost) * 100).toFixed(1)) : 0;

  const risks: RiskItem[] = isAr
    ? [
      {
        title: marketPosition === 'Overpriced' ? 'السعر المطلوب أعلى من نطاق القيمة العادلة' : 'حساسية التسعير السوقي',
        level: marketPosition === 'Overpriced' ? 'High' : 'Medium',
        explanation: marketPosition === 'Overpriced'
          ? `السعر المطلوب أعلى بنسبة ${Math.abs(overUnderPercentage)}% من تقدير النموذج.`
          : 'السعر المطلوب يقع ضمن النطاق المحسوب، ولكن المفاوضات يجب أن ترتكز على أدلة صفقات مقارنة حقيقية.',
        mitigation: 'استخدم النطاق العادل والصفقات المقارنة كأسس للتفاوض وتحديد السعر المستهدف.',
      },
      {
        title: 'مدى توفر بيانات الصفقات المقارنة',
        level: market.transactionsCount >= 10 ? 'Low' : 'Medium',
        explanation: `يتوفر في الحي ${market.transactionsCount} صفقة بيع مقارنة صالحة للاستخدام.`,
        mitigation: 'زيادة موثوقية التقييم عن طريق إدراج صفقات أحدث أو سجلات بلدية إضافية عند توفرها.',
      },
      {
        title: 'افتراضات التخطيط والتقسيم واشتراطات البناء',
        level: 'Medium',
        explanation: 'عرض الشارع واشتراطات البناء البلدية تؤثر بشكل مباشر على الجدوى المالية لقرار الاستحواذ ويجب التحقق منها رسمياً.',
        mitigation: 'التأكد من اشتراطات البناء والارتدادات ونسب التغطية وعدد الأدوار المسموح بها مع البلدية قبل الشراء.',
      },
    ]
    : [
      {
        title: marketPosition === 'Overpriced' ? 'Asking price above fair value range' : 'Pricing sensitivity',
        level: marketPosition === 'Overpriced' ? 'High' : 'Medium',
        explanation: marketPosition === 'Overpriced'
          ? `The asking price is ${Math.abs(overUnderPercentage)}% above the model estimate.`
          : 'The asking price is near the calculated range, but negotiation should still use verified comparables.',
        mitigation: 'Use the fair range and comparable transactions as negotiation anchors.',
      },
      {
        title: 'Comparable data depth',
        level: market.transactionsCount >= 10 ? 'Low' : 'Medium',
        explanation: `${market.transactionsCount} comparable district transactions are available for this filter.`,
        mitigation: 'Increase confidence by adding licensed or newer transaction sources when available.',
      },
      {
        title: 'Zoning and development assumptions',
        level: 'Medium',
        explanation: 'Street width and development assumptions affect feasibility but must be verified externally.',
        mitigation: 'Confirm zoning, setbacks, parking, and allowed floors before acquisition.',
      },
    ];

  const recommendationRationale = isAr
    ? [
      recommendation === 'Strong Buy' || recommendation === 'Buy'
        ? 'سعر الشراء المذكور مناسب وجاذبية الاستثمار جيدة بالنسبة لأسعار السوق السائدة.'
        : recommendation === 'Avoid'
          ? 'سعر الشراء مبالغ فيه بشكل كبير مقارنة بتقديرات القيمة العادلة المعتمدة.'
          : 'سعر الشراء متوازن وضمن القيمة العادلة، يُنصح بالانتظار أو خفض التكلفة.',
      'مخاطر تداول مقبولة وثقة معتدلة في مصادر البيانات المستخدمة بالحي.',
      'الفرصة ملائمة للمحفظة الاستثمارية ويجب تأكيد اشتراطات البناء البلدية.'
    ]
    : [
      recommendation === 'Strong Buy' || recommendation === 'Buy'
        ? 'The submitted purchase price is attractive and the investment appeal is solid relative to market prices.'
        : recommendation === 'Avoid'
          ? 'The purchase price is significantly overpriced relative to the central fair value estimates.'
          : 'The purchase price is balanced and within fair range; consider waiting or reducing auxiliary costs.',
      'Acceptable transaction risk and moderate confidence in dataset sources in the neighborhood.',
      'The opportunity fits the investment portfolio; confirm municipal zoning and development parameters.'
    ];

  const paybackPeriod = input.expectedRent > 0
    ? `${(totalInvestmentCost / input.expectedRent).toFixed(1)} ${isAr ? 'سنوات' : 'years'}`
    : 'غير متاح (N/A)';

  const agentAdvisory = mergeModelAgentAdvice(buildAgentAdvisory(input, {
    recommendation,
    marketPosition,
    confidence: modelValuation.confidence,
    fairValueMin: modelValuation.fairRangeMin,
    fairValueMax: modelValuation.fairRangeMax,
    estimatedPrice: modelValuation.estimatedTotalPrice,
    overUnderPercentage,
    comparableCount: comparables.length,
    dataQualityNotes,
    forecast: oneYearForecast,
  }, lang), modelValuation);
  const statisticalValue = Math.round((market.medianPricePerSqm || market.averagePricePerSqm || modelValuation.estimatedPricePerSqm) * input.areaSqm);
  const reconciliation = buildReconciliation({
    areaSqm: input.areaSqm,
    marketValue: modelValuation.estimatedTotalPrice,
    modelValue: modelValuation.source === 'model' ? modelValuation.estimatedTotalPrice : undefined,
    statisticalValue,
    fairValueMin: modelValuation.fairRangeMin,
    fairValueMax: modelValuation.fairRangeMax,
    marketConfidence: modelValuation.confidence,
    modelConfidence: modelValuation.confidence,
    primaryApproach: modelValuation.source === 'model' ? 'Model Estimate' : 'Statistical Market',
  }, lang);

  return {
    id: `MR-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    property: input,
    summary: {
      recommendation,
      investmentScore,
      riskLevel,
      keyInsights: isAr
        ? [
          `نطاق القيمة العادلة يتراوح بين ${formatSar(modelValuation.fairRangeMin)} إلى ${formatSar(modelValuation.fairRangeMax)}.`,
          `تم اختيار ${comparables.length} صفقة حقيقية من مجموعة البيانات كأدلة مقارنة.`,
          `مصدر التقييم الرئيسي هو ${modelValuation.source === 'model' ? 'نموذج التثمين المدرب' : 'النموذج الإحصائي الاحتياطي'}.`,
          ...(modelValuation.warnings?.length ? modelValuation.warnings : []),
        ]
        : [
          `Fair value range is ${formatSar(modelValuation.fairRangeMin)} to ${formatSar(modelValuation.fairRangeMax)}.`,
          `${comparables.length} real transactions from the local dataset were selected as comparable evidence.`,
          `The valuation source is ${modelValuation.source === 'model' ? 'the trained Python model' : 'real market statistics fallback'}.`,
          ...(modelValuation.warnings?.length ? modelValuation.warnings : []),
        ],
      recommendationRationale,
    },
    valuation: {
      askingPrice: input.askingPrice,
      estimatedPrice: modelValuation.estimatedTotalPrice,
      estimatedPricePerSqm: modelValuation.estimatedPricePerSqm,
      fairValueMin: modelValuation.fairRangeMin,
      fairValueMax: modelValuation.fairRangeMax,
      overUnderPercentage,
      marketPosition,
      confidence: modelValuation.confidence,
      modelVersion: modelValuation.modelVersion,
      source: modelValuation.source,
    },
    forecast: oneYearForecast,
    agentAdvisory,
    evidence: buildReportEvidence(lang),
    reconciliation,
    methodology: buildMethodology(input, {
      confidence: modelValuation.confidence,
      confidenceRationale: modelValuation.warnings?.length
        ? modelValuation.warnings.join(' ')
        : lang === 'ar'
          ? 'تم التوليد من النموذج المدرب أو الإحصائي البديل باستخدام مجموعة الصفقات المتاحة.'
          : 'Generated from the trained model or statistical fallback using the available transaction dataset.',
      valuationSource: modelValuation.source,
      comparableCount: comparables.length,
      dataQualityNotes,
      modelMethodology: modelValuation.methodology,
    }, lang),
    market,
    comparables,
    scoreBreakdown,
    hbu: {
      bestUse: input.landUse || 'Residential development',
      scenarios: [
        { 
          name: isAr ? 'تطوير سكني' : 'Residential development', 
          revenue: expectedSellingPrice + expectedRentalIncome, 
          cost: totalInvestmentCost, 
          roi: roiPercentage, 
          risk: 'Medium', 
          suitability: Math.min(100, investmentScore + 8) 
        },
        { 
          name: isAr ? 'شراء واحتفاظ' : 'Buy and hold', 
          revenue: Math.round(input.askingPrice * 1.16) + expectedRentalIncome, 
          cost: input.askingPrice, 
          roi: input.askingPrice ? Number((((input.askingPrice * 0.16 + expectedRentalIncome) / input.askingPrice) * 100).toFixed(1)) : 0, 
          risk: 'Low', 
          suitability: Math.max(40, investmentScore - 5) 
        },
        { 
          name: isAr ? 'إعادة بيع سريعة' : 'Quick resale', 
          revenue: Math.round(modelValuation.estimatedTotalPrice * 1.03), 
          cost: input.askingPrice, 
          roi: input.askingPrice ? Number((((modelValuation.estimatedTotalPrice * 1.03 - input.askingPrice) / input.askingPrice) * 100).toFixed(1)) : 0, 
          risk: 'High', 
          suitability: Math.max(25, investmentScore - 18) 
        },
      ],
    },
    roi: {
      purchaseCost: input.askingPrice,
      developmentCost: input.developmentCost,
      totalInvestmentCost,
      expectedSellingPrice,
      expectedRentalIncome,
      expectedNetProfit,
      roiPercentage,
      paybackPeriod,
      projectedCapitalGain: Math.max(expectedSellingPrice - totalInvestmentCost, 0),
      annualRentalYield: input.expectedRent > 0 && totalInvestmentCost > 0 ? Number((input.expectedRent / totalInvestmentCost * 100).toFixed(2)) : 0,
    },
    risks,
    dataQualityNotes,
    memo: isAr
      ? `بناءً على الصفقات الفعلية و ${modelValuation.source === 'model' ? 'نموذج التقييم المدرب' : 'النموذج الإحصائي البديل'}، فإن الفرصة مصنفة كـ (${recommendation === 'Strong Buy' ? 'شراء قوي' : recommendation === 'Buy' ? 'شراء' : recommendation === 'Hold' ? 'احتفاظ' : 'تجنب'}). العقار يعتبر (${marketPosition === 'Undervalued' ? 'أقل من القيمة العادلة' : marketPosition === 'Overpriced' ? 'أعلى من القيمة العادلة' : 'ذو سعر عادل'}) مقارنة بنطاق القيمة المقدرة، وبمستوى ثقة (${modelValuation.confidence === 'High' ? 'مرتفع' : modelValuation.confidence === 'Medium' ? 'متوسط' : 'منخفض'}). نوصي بمراجعة الاشتراطات البلدية ومطابقة الصكوك قبل إتمام الاستحواذ.`
      : `Based on the real transaction dataset and ${modelValuation.source === 'model' ? 'trained valuation model' : 'market statistics fallback'}, this opportunity is rated ${recommendation}. The property is ${marketPosition.toLowerCase()} against the estimated fair value range, with ${modelValuation.confidence.toLowerCase()} confidence. The decision should be validated with zoning checks and recent comparable evidence before purchase.`,
  };
}
