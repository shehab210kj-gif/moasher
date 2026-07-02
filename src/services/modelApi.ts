import { MarketIndicators, ModelValuation, PropertyInput } from '../lib/muasher';
import { getMarketIndicators } from '../lib/data';
import { calculateStatisticalValuation } from '../lib/valuation';

const MODEL_API_URL = import.meta.env.VITE_MODEL_API_URL || 'http://127.0.0.1:8000';

type PredictResponse = {
  estimated_price_per_sqm: number;
  estimated_total_price: number;
  fair_range_min: number;
  fair_range_max: number;
  confidence: ModelValuation['confidence'];
  model_version: string;
  valuation_date?: string;
  annual_growth_rate_percentage?: number;
  one_year_forecast_price?: number;
  market_context?: ModelValuation['marketContext'];
  agent_advice?: ModelValuation['agentAdvice'];
  methodology?: ModelValuation['methodology'];
  warnings?: string[];
};

type MarketStatsResponse = {
  avg_price_per_meter: number;
  median_price_per_meter: number;
  min_price_per_meter: number;
  max_price_per_meter: number;
  total_transactions: number;
  total_neighborhoods: number;
  annual_growth_rate: number;
  property_type_distribution: Record<string, number>;
  data_coverage?: {
    source_file?: string;
    date_min?: string;
    date_max?: string;
    rows?: number;
    latest_12_months_rows?: number;
  };
  latest_12_months?: {
    avg_price_per_meter: number;
    median_price_per_meter: number;
    total_transactions: number;
    total_neighborhoods: number;
  };
};

export type ApiMarketIndicators = MarketIndicators & {
  source: 'api' | 'local_fallback';
  annualGrowthRate: number;
  dataCoverage?: MarketStatsResponse['data_coverage'];
  latest12Months?: MarketStatsResponse['latest_12_months'];
  propertyTypeDistribution?: Record<string, number>;
};

export async function predictValuation(input: PropertyInput): Promise<ModelValuation> {
  try {
    const response = await fetch(`${MODEL_API_URL.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: input.city,
        district: input.district,
        property_type: input.propertyType,
        land_use: input.landUse,
        area_sqm: input.areaSqm,
        latitude: input.latitude,
        longitude: input.longitude,
        street_width: input.streetWidth,
        is_corner: input.isCorner,
        asking_price: input.askingPrice,
      }),
    });

    if (!response.ok) throw new Error(`Model API returned ${response.status}`);
    const data = await response.json() as PredictResponse;

    return {
      estimatedPricePerSqm: data.estimated_price_per_sqm,
      estimatedTotalPrice: data.estimated_total_price,
      fairRangeMin: data.fair_range_min,
      fairRangeMax: data.fair_range_max,
      confidence: data.confidence,
      modelVersion: data.model_version,
      source: 'model',
      valuationDate: data.valuation_date,
      annualGrowthRatePercentage: data.annual_growth_rate_percentage,
      oneYearForecastPrice: data.one_year_forecast_price,
      marketContext: data.market_context,
      agentAdvice: data.agent_advice,
      methodology: data.methodology,
      warnings: data.warnings ?? [],
    };
  } catch (error) {
    console.warn('Model API unavailable, using real dataset statistics fallback.', error);
    return calculateStatisticalValuation(input);
  }
}

export async function getMarketStats(input: PropertyInput): Promise<ApiMarketIndicators> {
  const fallback = getMarketIndicators(input);

  try {
    const params = new URLSearchParams({
      city: input.city,
      district: input.district,
      property_type: input.propertyType,
    });
    const response = await fetch(`${MODEL_API_URL.replace(/\/$/, '')}/market-stats?${params.toString()}`);

    if (!response.ok) throw new Error(`Market stats API returned ${response.status}`);
    const data = await response.json() as MarketStatsResponse;

    return {
      city: input.city,
      district: input.district,
      propertyType: input.propertyType,
      averagePricePerSqm: data.avg_price_per_meter,
      medianPricePerSqm: data.median_price_per_meter,
      minPricePerSqm: data.min_price_per_meter,
      maxPricePerSqm: data.max_price_per_meter,
      transactionsCount: data.total_transactions,
      liquidityScore: Math.max(0, Math.min(100, Math.round((data.total_transactions / 40) * 100))),
      source: 'api',
      annualGrowthRate: data.annual_growth_rate,
      dataCoverage: data.data_coverage,
      latest12Months: data.latest_12_months,
      propertyTypeDistribution: data.property_type_distribution,
    };
  } catch (error) {
    console.warn('Market stats API unavailable, using local CSV fallback.', error);
    return {
      ...fallback,
      source: 'local_fallback',
      annualGrowthRate: 0,
    };
  }
}

export async function getFullReport(input: PropertyInput): Promise<any> {
  const response = await fetch(`${MODEL_API_URL.replace(/\/$/, '')}/full-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      neighborhood: input.district,
      property_type: input.propertyType,
      area: input.areaSqm,
      usage: input.landUse === 'commercial' ? 'commercial' : 'residential',
      finish_level: 'تشطيب_متوسط',
      lat: input.latitude ?? 21.5433,
      lng: input.longitude ?? 39.1925,
      purpose: input.purpose || 'purchase',
      ownership: input.ownership || 'absolute',
      terrain: input.terrain || 'flat',
      frontage: input.frontageDirection || 'east',
      building_age: input.buildingAge ?? 0.0,
      maintenance: input.maintenance || 'good',
      accessibility: input.accessibility || 'main_street',
      is_corner: input.isCorner ?? false,
      street_width: input.streetWidth ?? 15.0,
      asking_price: input.askingPrice,
    }),
  });

  if (!response.ok) throw new Error(`Full Report API returned ${response.status}`);
  return await response.json();
}

export async function askAgent(
  reportData: any,
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<string> {
  const response = await fetch(`${MODEL_API_URL.replace(/\/$/, '')}/agent-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report_data: reportData,
      message,
      history,
    }),
  });

  if (!response.ok) throw new Error(`Agent Chat API returned ${response.status}`);
  const data = await response.json() as { response: string };
  return data.response;
}
