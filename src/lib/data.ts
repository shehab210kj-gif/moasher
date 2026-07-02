import csvText from '../ai_model/muasher_full_data.csv?raw';
import { Comparable, MarketIndicators, PropertyInput } from './muasher';

type CsvRow = Record<string, string>;

export type MarketTransaction = {
  id: string;
  city: string;
  district: string;
  propertyType: string;
  transactionDate: string;
  areaSqm: number;
  totalPrice: number;
  pricePerSqm: number;
  planNumber: string;
  parcelNumber: string;
  latitude: number | null;
  longitude: number | null;
};

const COLUMNS = {
  date: 'التاريخ',
  city: 'المدينة',
  plan: 'المخطط',
  parcel: 'القطعة',
  totalPrice: 'السعر (ريال)',
  district: 'الحي',
  propertyType: 'نوع العقار',
  area: 'المساحة (م2)',
  pricePerSqm: 'سعر المتر',
};

let cachedTransactions: MarketTransaction[] | null = null;
let cachedDataQuality = {
  repairedTotalPrices: 0,
  excludedRows: 0,
};

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  const [headers = [], ...body] = rows;
  return body.map((values) => {
    const record: CsvRow = {};
    headers.forEach((header, index) => {
      record[header.trim()] = (values[index] ?? '').trim();
    });
    return record;
  });
}

function toNumber(value: string) {
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function valueFrom(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }
  return '';
}

function cleanTransaction(row: CsvRow, index: number): MarketTransaction | null {
  const areaSqm = toNumber(valueFrom(row, [COLUMNS.area, 'المساحة (م2)', 'المساحة']));
  const pricePerSqm = toNumber(valueFrom(row, [COLUMNS.pricePerSqm, 'سعر المتر']));
  const rawTotalPrice = toNumber(valueFrom(row, [COLUMNS.totalPrice, 'السعر (ريال)', 'سعر العملية']));
  const expectedTotalPrice = areaSqm * pricePerSqm;
  const totalIsRealistic = rawTotalPrice > 0 && expectedTotalPrice > 0 && rawTotalPrice >= expectedTotalPrice * 0.65;
  const totalPrice = totalIsRealistic ? rawTotalPrice : expectedTotalPrice;

  if (!totalIsRealistic && expectedTotalPrice > 0) {
    cachedDataQuality.repairedTotalPrices += 1;
  }

  const item = {
    id: `tx-${index + 1}`,
    city: valueFrom(row, [COLUMNS.city, 'المدينة']),
    district: valueFrom(row, [COLUMNS.district, 'الحي']),
    propertyType: valueFrom(row, [COLUMNS.propertyType, 'نوع العقار']),
    transactionDate: valueFrom(row, [COLUMNS.date, 'التاريخ']),
    areaSqm,
    totalPrice,
    pricePerSqm,
    planNumber: valueFrom(row, [COLUMNS.plan, 'المخطط']),
    parcelNumber: valueFrom(row, [COLUMNS.parcel, 'القطعة']),
    latitude: null,
    longitude: null,
  };

  const realisticTotal = item.totalPrice >= item.areaSqm * item.pricePerSqm * 0.65;
  if (!item.city || !item.district || !item.propertyType || item.areaSqm <= 0 || item.pricePerSqm <= 0 || item.totalPrice <= 0 || !realisticTotal) {
    cachedDataQuality.excludedRows += 1;
    return null;
  }

  return item;
}

export function getTransactions(): MarketTransaction[] {
  if (cachedTransactions) return cachedTransactions;

  cachedDataQuality = { repairedTotalPrices: 0, excludedRows: 0 };
  cachedTransactions = parseCsv(csvText)
    .map(cleanTransaction)
    .filter((item): item is MarketTransaction => item !== null);

  return cachedTransactions;
}

export function getTransactionDataQualityWarnings() {
  getTransactions();
  const warnings: string[] = [];
  if (cachedDataQuality.repairedTotalPrices > 0) {
    warnings.push(`${cachedDataQuality.repairedTotalPrices} transaction rows had inconsistent total prices and were repaired using area multiplied by price per sqm.`);
  }
  if (cachedDataQuality.excludedRows > 0) {
    warnings.push(`${cachedDataQuality.excludedRows} invalid transaction rows were excluded from comparable selection.`);
  }
  return warnings;
}

export function getDistricts() {
  return Array.from(new Set(getTransactions().map((item) => item.district))).sort((a, b) => a.localeCompare(b, 'ar'));
}

export function getPropertyTypes() {
  return Array.from(new Set(getTransactions().map((item) => item.propertyType))).sort((a, b) => a.localeCompare(b, 'ar'));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function getMarketIndicators(input: PropertyInput): MarketIndicators {
  const scoped = getTransactions().filter((item) =>
    item.city === input.city &&
    item.district === input.district &&
    item.propertyType === input.propertyType
  );
  const fallback = getTransactions().filter((item) =>
    item.city === input.city &&
    item.district === input.district
  );
  const records = scoped.length ? scoped : fallback;
  const prices = records.map((item) => item.pricePerSqm);
  const averagePricePerSqm = prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : 0;
  const transactionsCount = records.length;

  return {
    city: input.city,
    district: input.district,
    propertyType: input.propertyType,
    averagePricePerSqm,
    medianPricePerSqm: median(prices),
    minPricePerSqm: prices.length ? Math.min(...prices) : 0,
    maxPricePerSqm: prices.length ? Math.max(...prices) : 0,
    transactionsCount,
    liquidityScore: Math.max(0, Math.min(100, Math.round((transactionsCount / 40) * 100))),
  };
}

function areaSimilarity(target: number, candidate: number) {
  if (!target || !candidate) return 0;
  return Math.max(0, 1 - Math.abs(candidate - target) / Math.max(target, candidate));
}

function recencyScore(date: string) {
  const time = new Date(date).getTime();
  if (!Number.isFinite(time)) return 0.5;
  const days = Math.max(0, (Date.now() - time) / 86400000);
  return Math.max(0.2, 1 - days / (365 * 5));
}

export function getComparableTransactions(input: PropertyInput, limit = 10): Comparable[] {
  const candidates = getTransactions().filter((item) => item.city === input.city);

  return candidates
    .map((item) => {
      const districtMatch = item.district === input.district ? 1 : 0;
      const typeMatch = item.propertyType === input.propertyType ? 1 : 0;
      const areaScore = areaSimilarity(input.areaSqm, item.areaSqm);
      const recent = recencyScore(item.transactionDate);
      const similarityScore = Math.round((districtMatch * 0.35 + typeMatch * 0.25 + areaScore * 0.25 + recent * 0.15) * 100);

      return {
        id: item.id,
        district: item.district,
        areaSqm: item.areaSqm,
        totalPrice: item.totalPrice,
        pricePerSqm: item.pricePerSqm,
        date: item.transactionDate,
        distanceKm: null,
        similarityScore,
      };
    })
    .filter((item) => item.similarityScore >= 35)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}
