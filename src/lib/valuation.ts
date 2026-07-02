import { getMarketIndicators } from './data';
import { ModelValuation, PropertyInput } from './muasher';

export function calculateStatisticalValuation(input: PropertyInput): ModelValuation {
  const indicators = getMarketIndicators(input);
  const estimatedPricePerSqm = Math.round(indicators.medianPricePerSqm || indicators.averagePricePerSqm || input.pricePerSqm || 0);
  const estimatedTotalPrice = Math.round(estimatedPricePerSqm * input.areaSqm);
  const confidence = indicators.transactionsCount >= 20 ? 'High' : indicators.transactionsCount >= 6 ? 'Medium' : 'Low';
  const fairRangeMin = Math.round(estimatedTotalPrice * 0.9);
  const fairRangeMax = Math.round(estimatedTotalPrice * 1.1);
  const overUnderPercentage = estimatedTotalPrice > 0 ? Number((((input.askingPrice - estimatedTotalPrice) / estimatedTotalPrice) * 100).toFixed(1)) : 0;
  const marketPosition = input.askingPrice > fairRangeMax ? 'Overpriced' : input.askingPrice < fairRangeMin ? 'Undervalued' : 'Fair';

  return {
    estimatedPricePerSqm,
    estimatedTotalPrice,
    fairRangeMin,
    fairRangeMax,
    confidence,
    modelVersion: 'market-statistics-v1',
    source: 'statistical_fallback',
    valuationDate: new Date().toISOString().slice(0, 10),
    annualGrowthRatePercentage: 3.5,
    oneYearForecastPrice: Math.round(estimatedTotalPrice * 1.035),
    marketContext: {
      city: input.city,
      district: input.district,
      property_type: input.propertyType,
      transactions_count: indicators.transactionsCount,
      district_avg_price_per_sqm: Math.round(indicators.averagePricePerSqm),
      district_median_price_per_sqm: Math.round(indicators.medianPricePerSqm),
      district_min_price_per_sqm: Math.round(indicators.minPricePerSqm),
      district_max_price_per_sqm: Math.round(indicators.maxPricePerSqm),
      model_vs_market_median_percentage: 0,
      data_date_min: null,
      data_date_max: null,
    },
    agentAdvice: {
      market_position: marketPosition,
      recommendation: marketPosition === 'Overpriced' ? 'Negotiate' : marketPosition === 'Undervalued' ? 'Buy if due diligence passes' : 'Proceed with diligence',
      decision_summary: 'Fallback valuation used local CSV market statistics because the model API was unavailable.',
      asking_price: input.askingPrice,
      over_under_percentage: overUnderPercentage,
      suggested_offer_min: Math.round(fairRangeMin * 0.96),
      suggested_offer_max: Math.round(Math.min(input.askingPrice || fairRangeMax, fairRangeMax)),
      walk_away_price: fairRangeMax,
      next_actions: [
        'Restart the model API to get the trained model estimate.',
        'Validate the price against recent comparable land transactions.',
        'Confirm zoning, parcel, and street-width information before committing.',
      ],
    },
    methodology: {
      basis_of_value: 'Market Value',
      valuation_date: new Date().toISOString().slice(0, 10),
      reporting_standard_reference: 'TAQEEM-aligned decision-support workflow using market evidence concepts; not an accredited valuation unless reviewed and signed by a licensed valuer.',
      primary_approach: 'Market Approach',
      supporting_approaches: ['Statistical Market Check'],
      intended_use: input.purpose || 'purchase decision support',
      scope_of_work: `Local CSV fallback desktop estimate for ${input.propertyType} in ${input.district}, ${input.city}.`,
      inspection_status: 'No physical inspection was performed by the platform.',
      data_cutoff: null,
      data_period: { from: null, to: null },
      confidence_rationale: `${confidence} confidence based on local transaction count and fallback market statistics.`,
      assumptions: [
        'Submitted property attributes are accurate and complete.',
        'Local CSV transaction records are relevant to the subject property.',
        'No independent legal, title, survey, or inspection verification was performed.',
      ],
      limiting_conditions: [
        'This is an AI decision-support estimate, not an accredited valuation report by itself.',
        'Formal use requires review by an accredited valuer.',
      ],
    },
    warnings: ['Model API unavailable or returned an error; valuation used real CSV market statistics.'],
  };
}
