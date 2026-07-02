import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/ProtectedRoute';
import { AuthProvider } from './lib/auth';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { ReportPage } from './pages/ReportPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { I18nProvider, useI18n } from './lib/i18n';

export function App() {
  return (
    <I18nProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage page="landing" />} />
            <Route path="/features" element={<LandingPage page="features" />} />
            <Route path="/use-cases" element={<LandingPage page="use-cases" />} />
            <Route path="/pricing" element={<LandingPage page="pricing" />} />
            <Route path="/sample-report" element={<ReportPage mode="sample" />} />
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/app" element={<ProtectedRoute><Navigate to="/app/dashboard" replace /></ProtectedRoute>} />
            <Route path="/app/dashboard" element={<ProtectedRoute><DashboardPage page="dashboard" /></ProtectedRoute>} />
            <Route path="/app/new-analysis" element={<ProtectedRoute><DashboardPage page="new-analysis" /></ProtectedRoute>} />
            <Route path="/app/reports" element={<ProtectedRoute><DashboardPage page="reports" /></ProtectedRoute>} />
            <Route path="/app/reports/:id" element={<ProtectedRoute><ReportPage mode="app" /></ProtectedRoute>} />
            <Route path="/app/market" element={<ProtectedRoute><DashboardPage page="market" /></ProtectedRoute>} />
            <Route path="/app/settings" element={<ProtectedRoute><DashboardPage page="settings" /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><DashboardPage page="admin" /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
        <LanguageButton />
      </BrowserRouter>
    </I18nProvider>
  );
}

function LanguageButton() {
  const { language, toggleLanguage } = useI18n();
  return (
      <button
        type="button"
        onClick={toggleLanguage}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl border border-emerald-100 bg-white/95 px-4 py-3 text-sm font-black text-emerald-950 shadow-xl shadow-emerald-950/10 backdrop-blur print:hidden"
      >
        <Languages size={16} />
        {language === 'ar' ? 'English' : 'العربية'}
      </button>
  );
}
