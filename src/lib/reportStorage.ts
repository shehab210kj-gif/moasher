import { ReportData } from './muasher';

const REPORTS_KEY = 'muasher.reports.v1';
const LATEST_REPORT_KEY = 'muasher.latestReportId.v1';

export function getStoredReports(): ReportData[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? JSON.parse(raw) as ReportData[] : [];
  } catch {
    return [];
  }
}

export function saveReport(report: ReportData) {
  const reports = getStoredReports().filter((item) => item.id !== report.id);
  const nextReports = [report, ...reports].slice(0, 50);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(nextReports));
  localStorage.setItem(LATEST_REPORT_KEY, report.id);
}

export function getReportById(id: string | undefined) {
  if (!id) return null;
  return getStoredReports().find((report) => report.id === id) ?? null;
}

export function getLatestReport() {
  const reports = getStoredReports();
  const latestId = localStorage.getItem(LATEST_REPORT_KEY);
  return reports.find((report) => report.id === latestId) ?? reports[0] ?? null;
}
