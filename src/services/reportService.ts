import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ReportData } from '../lib/muasher';
import {
  getLatestReport as getLatestLocalReport,
  getReportById as getLocalReportById,
  getStoredReports,
  saveReport as saveLocalReport,
} from '../lib/reportStorage';

async function getCurrentUserId() {
  if (!supabase || !isSupabaseConfigured) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

function withReportId(row: { id: string; report_json: ReportData | null }) {
  if (!row.report_json) return null;
  return { ...row.report_json, id: row.id } as ReportData;
}

export async function saveReport(report: ReportData): Promise<ReportData> {
  const userId = await getCurrentUserId();
  if (!supabase || !userId) {
    console.warn('Saving report to localStorage fallback because Supabase is not configured or user is not logged in.');
    saveLocalReport(report);
    return report;
  }

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert({
      user_id: userId,
      city: report.property.city,
      district: report.property.district,
      property_type: report.property.propertyType,
      land_use: report.property.landUse,
      area_sqm: report.property.areaSqm,
      asking_price: report.property.askingPrice,
      price_per_sqm: report.property.pricePerSqm,
      latitude: report.property.latitude,
      longitude: report.property.longitude,
      street_width: report.property.streetWidth,
      frontage: report.property.frontage,
      is_corner: report.property.isCorner,
    })
    .select('id')
    .single();

  if (propertyError) {
    console.warn('Saving report to localStorage fallback after Supabase property insert failed.', propertyError);
    saveLocalReport(report);
    return report;
  }

  const { data: reportRow, error: reportError } = await supabase
    .from('analysis_reports')
    .insert({
      user_id: userId,
      property_id: property.id,
      estimated_price: report.valuation.estimatedPrice,
      estimated_price_per_sqm: report.valuation.estimatedPricePerSqm,
      fair_value_min: report.valuation.fairValueMin,
      fair_value_max: report.valuation.fairValueMax,
      over_under_percentage: report.valuation.overUnderPercentage,
      investment_score: report.summary.investmentScore,
      recommendation: report.summary.recommendation,
      risk_level: report.summary.riskLevel,
      valuation_source: report.valuation.source,
      model_version: report.valuation.modelVersion,
      confidence: report.valuation.confidence,
      report_json: report,
    })
    .select('id')
    .single();

  if (reportError) {
    console.warn('Saving report to localStorage fallback after Supabase report insert failed.', reportError);
    saveLocalReport(report);
    return report;
  }

  if (report.comparables.length > 0) {
    const { error: comparableError } = await supabase.from('comparables').insert(report.comparables.map((item) => ({
      report_id: reportRow.id,
      transaction_source_id: item.id,
      district: item.district,
      property_type: report.property.propertyType,
      area_sqm: item.areaSqm,
      total_price: item.totalPrice,
      price_per_sqm: item.pricePerSqm,
      transaction_date: item.date,
      similarity_score: item.similarityScore,
    })));
    if (comparableError) {
      console.warn('Report was saved, but comparable rows were not stored in Supabase.', comparableError);
    }
  }

  const savedReport = { ...report, id: reportRow.id };
  saveLocalReport(savedReport);
  return savedReport;
}

export async function getReports(): Promise<ReportData[]> {
  const userId = await getCurrentUserId();
  if (!supabase || !userId) return getStoredReports();

  const { data, error } = await supabase
    .from('analysis_reports')
    .select('id, report_json, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Falling back to localStorage reports after Supabase read failed.', error);
    return getStoredReports();
  }

  return (data ?? []).map(withReportId).filter((item): item is ReportData => item !== null);
}

export async function getReportById(id: string | undefined): Promise<ReportData | null> {
  if (!id) return null;
  const userId = await getCurrentUserId();
  if (!supabase || !userId) return getLocalReportById(id);

  const { data, error } = await supabase
    .from('analysis_reports')
    .select('id, report_json')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Falling back to localStorage report after Supabase read failed.', error);
    return getLocalReportById(id);
  }

  return data ? withReportId(data) : getLocalReportById(id);
}

export async function getLatestReport(): Promise<ReportData | null> {
  const reports = await getReports();
  return reports[0] ?? getLatestLocalReport();
}

export async function deleteReport(id: string) {
  const userId = await getCurrentUserId();
  if (!supabase || !userId) return;
  const { error } = await supabase.from('analysis_reports').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}
