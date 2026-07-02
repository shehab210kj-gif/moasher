import { MarketIndicators, MarketPosition, ModelValuation, PropertyInput, Recommendation, RiskLevel } from './muasher';

export type ScoreBreakdown = {
  price: number;
  location: number;
  liquidity: number;
  development: number;
  risk: number;
};

export function getMarketPosition(askingPrice: number, fairMin: number, fairMax: number): MarketPosition {
  if (askingPrice > fairMax) return 'Overpriced';
  if (askingPrice < fairMin) return 'Undervalued';
  return 'Fair';
}

export function getOverUnderPercentage(askingPrice: number, estimatedPrice: number) {
  if (!estimatedPrice) return 0;
  return Number((((askingPrice - estimatedPrice) / estimatedPrice) * 100).toFixed(1));
}

export function calculateScore(input: PropertyInput, valuation: ModelValuation, market: MarketIndicators): ScoreBreakdown {
  const overUnder = getOverUnderPercentage(input.askingPrice, valuation.estimatedTotalPrice);
  const price = Math.max(0, Math.min(30, Math.round(24 - overUnder * 0.75)));
  const location = Math.max(5, Math.min(25, Math.round((market.averagePricePerSqm / Math.max(market.maxPricePerSqm, 1)) * 25)));
  const liquidity = Math.max(0, Math.min(20, Math.round((market.liquidityScore / 100) * 20)));
  const development = Math.max(0, Math.min(15, Math.round(6 + input.streetWidth / 4 + (input.isCorner ? 2 : 0) + Math.min(input.areaSqm / 1000, 3))));
  const position = getMarketPosition(input.askingPrice, valuation.fairRangeMin, valuation.fairRangeMax);
  const risk = position === 'Overpriced' ? 5 : valuation.confidence === 'Low' ? 6 : 9;

  return { price, location, liquidity, development, risk };
}

export function totalScore(score: ScoreBreakdown) {
  return score.price + score.location + score.liquidity + score.development + score.risk;
}

export function getRecommendation(score: number, position: MarketPosition): Recommendation {
  if (score >= 85) return 'Strong Buy';
  if (score >= 70) return position === 'Overpriced' ? 'Negotiate' : 'Buy';
  if (score >= 55) return 'Negotiate';
  if (score >= 40) return 'Hold';
  return 'Avoid';
}

export function getRiskLevel(score: number, position: MarketPosition, confidence: string): RiskLevel {
  if (position === 'Overpriced' || score < 55 || confidence === 'Low') return 'High';
  if (score < 75) return 'Medium';
  return 'Low';
}
