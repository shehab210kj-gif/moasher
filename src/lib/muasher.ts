export type Recommendation = 'Strong Buy' | 'Buy' | 'Negotiate' | 'Hold' | 'Avoid';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export type MarketPosition = 'Undervalued' | 'Fair' | 'Overpriced';

export type ConfidenceLevel = 'Low' | 'Medium' | 'High';

export type PropertyInput = {
  city: string;
  district: string;
  propertyType: string;
  landUse: string;
  areaSqm: number;
  askingPrice: number;
  pricePerSqm: number;
  latitude: number | null;
  longitude: number | null;
  streetWidth: number;
  frontage: number;
  isCorner: boolean;
  expectedRent: number;
  developmentCost: number;
  holdingPeriod: number;
  targetRoi: number;

  // New TAQEEM parameters
  purpose: string;
  ownership: string;
  terrain: string;
  buildingAge: number;
  maintenance: string;
  accessibility: string;
  frontageDirection: string;
};

export type Comparable = {
  id: string;
  district: string;
  areaSqm: number;
  totalPrice: number;
  pricePerSqm: number;
  date: string;
  distanceKm: number | null;
  similarityScore: number;
};

export type MarketIndicators = {
  city: string;
  district: string;
  propertyType: string;
  averagePricePerSqm: number;
  medianPricePerSqm: number;
  minPricePerSqm: number;
  maxPricePerSqm: number;
  transactionsCount: number;
  liquidityScore: number;
};

export type ModelValuation = {
  estimatedPricePerSqm: number;
  estimatedTotalPrice: number;
  fairRangeMin: number;
  fairRangeMax: number;
  confidence: ConfidenceLevel;
  modelVersion: string;
  source: 'model' | 'statistical_fallback';
  valuationDate?: string;
  annualGrowthRatePercentage?: number;
  oneYearForecastPrice?: number;
  marketContext?: {
    city: string;
    district: string;
    property_type: string;
    transactions_count: number;
    district_avg_price_per_sqm: number;
    district_median_price_per_sqm: number;
    district_min_price_per_sqm: number;
    district_max_price_per_sqm: number;
    model_vs_market_median_percentage: number;
    data_date_min: string | null;
    data_date_max: string | null;
  } | null;
  agentAdvice?: {
    market_position: string;
    recommendation: string;
    decision_summary: string;
    asking_price?: number;
    over_under_percentage?: number;
    suggested_offer_min: number;
    suggested_offer_max: number;
    walk_away_price: number;
    next_actions: string[];
  };
  methodology?: {
    basis_of_value: 'Market Value' | string;
    valuation_date: string;
    reporting_standard_reference: string;
    primary_approach: 'Market Approach' | 'Cost Approach' | 'Income Approach' | string;
    supporting_approaches: string[];
    intended_use: string;
    scope_of_work: string;
    inspection_status: string;
    data_cutoff: string | null;
    data_period: {
      from: string | null;
      to: string | null;
    };
    confidence_rationale: string;
    assumptions: string[];
    limiting_conditions: string[];
  };
  warnings?: string[];
};

export type RiskItem = {
  title: string;
  level: RiskLevel;
  explanation: string;
  mitigation: string;
};

export type ValuationMethodology = {
  valuationDate: string;
  reportDate: string;
  basisOfValue: 'Market Value';
  standardReference: string;
  primaryApproach: 'Market Approach' | 'Cost Approach' | 'Income Approach';
  supportingApproaches: Array<'Market Approach' | 'Cost Approach' | 'Income Approach'>;
  intendedUse: string;
  scopeOfWork: string;
  inspectionStatus: string;
  dataSources: string[];
  confidenceRationale: string;
  assumptions: string[];
  limitingConditions: string[];
  disclaimer: string;
};

export type OneYearForecast = {
  currentEstimatedPrice: number;
  currentEstimatedPricePerSqm: number;
  annualGrowthRatePercentage: number;
  conservativePrice: number;
  basePrice: number;
  optimisticPrice: number;
  conservativePricePerSqm: number;
  basePricePerSqm: number;
  optimisticPricePerSqm: number;
  confidence: ConfidenceLevel;
  method: string;
  rationale: string;
  warnings: string[];
};

export type AgentAdvisory = {
  decisionSummary: string;
  negotiationPosition: string;
  suggestedOfferMin: number;
  suggestedOfferMax: number;
  walkAwayPrice: number;
  nextActions: string[];
  dueDiligenceChecklist: string[];
  missingInputs: string[];
  questionsToAsk: string[];
};

export type ReportEvidence = {
  generatedAt: string;
  dataset: {
    sourceFile: string;
    rows: number;
    deduplicatedRows: number;
    duplicateRows: number;
    districtCount: number;
    propertyTypeCounts: Record<string, number>;
    dateRangeMin: string;
    dateRangeMax: string;
    latest12MonthRows: number;
  };
  dataQuality: {
    missingPlan: number;
    missingParcel: number;
    suspectTotalPriceRows: number;
    zeroOrNegativeTotalPriceRows: number;
  };
  model: {
    family: string;
    target: string;
    features: string[];
    randomSplitMae: number;
    timeSplitMae: number;
    timeSplitMape: number;
    baselineTimeSplitMae: number;
    validationWarning: string;
  };
  forecastBacktest: {
    method: string;
    segmentsTested: number;
    maeSarPerSqm: number | null;
    medianAbsoluteErrorSarPerSqm: number | null;
    mapePercent: number | null;
    medianApePercent: number | null;
  };
  artifacts: {
    manifestGeneratedAt: string;
    datasetSha256: string | null;
    valuationModelSha256: string | null;
    predictionStatsSha256: string | null;
    pythonVersion: string | null;
    xgboostVersion: string | null;
    sklearnVersion: string | null;
  };
};

export type ValuationReconciliation = {
  finalValue: number;
  finalValuePerSqm: number;
  fairValueMin: number;
  fairValueMax: number;
  primaryApproach: 'Market Approach' | 'Cost Approach' | 'Income Approach' | 'Model Estimate' | 'Statistical Market';
  approaches: Array<{
    name: 'Market Approach' | 'Cost Approach' | 'Income Approach' | 'Model Estimate' | 'Statistical Market';
    value: number;
    valuePerSqm: number;
    weight: number;
    confidence: ConfidenceLevel;
    rationale: string;
  }>;
  summary: string;
};

export type ReportData = {
  id: string;
  createdAt: string;
  property: PropertyInput;
  summary: {
    recommendation: Recommendation;
    investmentScore: number;
    riskLevel: RiskLevel;
    keyInsights: string[];
    recommendationRationale?: string[];
  };
  valuation: {
    askingPrice: number;
    estimatedPrice: number;
    estimatedPricePerSqm: number;
    fairValueMin: number;
    fairValueMax: number;
    overUnderPercentage: number;
    marketPosition: MarketPosition;
    confidence: ConfidenceLevel;
    modelVersion: string;
    source: ModelValuation['source'];
  };
  forecast?: OneYearForecast;
  agentAdvisory?: AgentAdvisory;
  evidence?: ReportEvidence;
  reconciliation?: ValuationReconciliation;
  methodology?: ValuationMethodology;
  market: MarketIndicators;
  comparables: Comparable[];
  scoreBreakdown: {
    price: number;
    location: number;
    liquidity: number;
    development: number;
    risk: number;
  };
  hbu: {
    bestUse: string;
    scenarios: Array<{
      name: string;
      revenue: number;
      cost: number;
      roi: number;
      risk: RiskLevel;
      suitability: number;
    }>;
  };
  roi: {
    purchaseCost: number;
    developmentCost: number;
    totalInvestmentCost: number;
    expectedSellingPrice: number;
    expectedRentalIncome: number;
    expectedNetProfit: number;
    roiPercentage: number;
    paybackPeriod: string | number;
    projectedCapitalGain?: number;
    annualRentalYield?: number;
  };
  risks: RiskItem[];
  dataQualityNotes: string[];
  memo: string;

  // New TAQEEM response extensions
  comparables_adjustments_table?: Array<{
    comp_data: {
      name: string;
      district: string;
      price_per_sqm: number;
      total_price: number;
      area: number;
      date: string;
      transaction_type: string;
      distance_km: number;
      is_corner: boolean;
      street_width: number;
      terrain: string;
      frontage: string;
      building_age: number;
      maintenance: string;
      ownership: string;
    };
    adjustment_details: {
      adjustments: Record<string, number>;
      adjusted_price_per_sqm: number;
      net_adjustment_percentage: number;
    };
    similarity: number;
    weight_percent: number;
  }>;
  cost_approach?: {
    land_value: number;
    replacement_cost_new: number;
    depreciation_rate_percent: number;
    total_depreciation_amount: number;
    depreciated_building_value: number;
    total_property_value: number;
    depreciation_breakdown: {
      physical: number;
      functional: number;
      economic: number;
    };
    parameters: {
      building_age: number;
      total_economic_life: number;
      cost_per_sqm: number;
      depreciation_method?: string;
      economic_life?: number;
      extended_life_years?: number;
      remaining_life?: number;
    };
  };
};

export const defaultPropertyInput: PropertyInput = {
  city: 'جدة',
  district: '',
  propertyType: 'قطعة أرض',
  landUse: 'سكني',
  areaSqm: 0,
  askingPrice: 0,
  pricePerSqm: 0,
  latitude: null,
  longitude: null,
  streetWidth: 0,
  frontage: 0,
  isCorner: false,
  expectedRent: 0,
  developmentCost: 0,
  holdingPeriod: 5,
  targetRoi: 18,
  
  // New TAQEEM parameters
  purpose: 'purchase',
  ownership: 'absolute',
  terrain: 'flat',
  buildingAge: 0,
  maintenance: 'good',
  accessibility: 'main_street',
  frontageDirection: 'east',
};

export function formatSar(value: number) {
  if (!Number.isFinite(value)) return '0 SAR';
  return `${Math.round(value).toLocaleString('en-US')} SAR`;
}

export function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('en-US');
}
