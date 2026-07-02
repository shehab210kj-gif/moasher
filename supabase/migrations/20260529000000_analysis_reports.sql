-- Muasher analysis persistence
-- Created on 2026-05-29

CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city TEXT,
  district TEXT,
  property_type TEXT,
  land_use TEXT,
  area_sqm NUMERIC,
  asking_price NUMERIC,
  price_per_sqm NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  street_width NUMERIC,
  frontage NUMERIC,
  is_corner BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  estimated_price NUMERIC,
  estimated_price_per_sqm NUMERIC,
  fair_value_min NUMERIC,
  fair_value_max NUMERIC,
  over_under_percentage NUMERIC,
  investment_score NUMERIC,
  recommendation TEXT,
  risk_level TEXT,
  valuation_source TEXT,
  model_version TEXT,
  confidence TEXT,
  report_json JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comparables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.analysis_reports(id) ON DELETE CASCADE,
  transaction_source_id TEXT,
  district TEXT,
  property_type TEXT,
  area_sqm NUMERIC,
  total_price NUMERIC,
  price_per_sqm NUMERIC,
  transaction_date TEXT,
  similarity_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own properties" ON public.properties
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own properties" ON public.properties
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can select own analysis reports" ON public.analysis_reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analysis reports" ON public.analysis_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analysis reports" ON public.analysis_reports
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own analysis reports" ON public.analysis_reports
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can select own comparables" ON public.comparables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analysis_reports
      WHERE analysis_reports.id = comparables.report_id
      AND analysis_reports.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own comparables" ON public.comparables
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analysis_reports
      WHERE analysis_reports.id = comparables.report_id
      AND analysis_reports.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own comparables" ON public.comparables
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.analysis_reports
      WHERE analysis_reports.id = comparables.report_id
      AND analysis_reports.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analysis_reports
      WHERE analysis_reports.id = comparables.report_id
      AND analysis_reports.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own comparables" ON public.comparables
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.analysis_reports
      WHERE analysis_reports.id = comparables.report_id
      AND analysis_reports.user_id = auth.uid()
    )
  );
