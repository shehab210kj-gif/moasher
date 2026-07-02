# Muasher AI Product Audit And Roadmap

Date: 2026-06-01

## Executive Decision

You are moving in the right direction, but the product is not yet a complete AI real estate agent or a TAQEEM-grade valuation workflow.

The current project is a strong MVP for Jeddah land price intelligence. It already has a React app, Supabase auth/storage, Mapbox location workflows, a local FastAPI model service, a printable report, and real Jeddah land transaction data. The main gap is that the valuation logic is still closer to an automated price-per-square-meter estimator than a professional valuation process.

For the next phase, the product should be treated as:

1. A decision-support platform, not an accredited valuation report.
2. A TAQEEM-aligned workflow engine, not only an ML model.
3. A land-first product for Jeddah, then gradually expanded by asset class and geography.

## Current Evidence From The Repository

Frontend:

- React + Vite + TypeScript + Tailwind.
- Public pages: landing, features, use cases, pricing, sample report.
- Auth pages: login, register, forgot password, reset password.
- Protected app: dashboard, new analysis, reports, market explorer, settings, admin.
- Report page includes valuation, comparables, cost approach, investment score, HBU, ROI, risks, and print/PDF-by-browser-print.
- Report data now includes a dedicated one-year forecast with conservative, base, and optimistic scenarios.
- Report data now includes an AI agent advisory layer with decision summary, negotiation range, walk-away price, next actions, due-diligence checklist, missing inputs, and questions to ask the seller or broker.
- Report data now includes a data evidence and model quality snapshot from `data_quality_report.json` and `model_metrics.json`.
- Report data now includes artifact traceability from `artifact_manifest.json`, including dataset/model hashes and key dependency versions.
- Report data now includes valuation reconciliation, showing approach-level values, weights, confidence, rationale, and the final reconciled value.
- Report data now includes one-year forecast backtest evidence from `forecast_metrics.json`.

Backend and model:

- FastAPI app in `src/ai_model/muasher_api.py`.
- Endpoints include `/predict`, `/full-report`, `/quick-analysis`, `/neighborhoods`, `/property-types`.
- XGBoost valuation model uses district, property type, area, plan, year, and month.
- Growth projection currently uses historical district/global growth rates from `prediction_stats.json`.
- Additional engines exist for regulations, feasibility, comparable search, market adjustments, cost approach, spatial features, and AI analysis.

Data:

- `src/ai_model/muasher_full_data.csv`
- 9,916 rows.
- 12 columns.
- Date range: 2019-01-01 to 2026-03-08.
- 109 districts.
- Current asset class: all rows are land only.
- Duplicate rows: 5,183.
- Rows where total price is less than `area * price_per_sqm * 0.65`: 8,110.
- Missing plan: 6,900.
- Missing parcel: 8,621.
- Latest 12 months rows: 1,289.

## Model Reality Check

Repeatable diagnostics are now available in:

- `src/ai_model/generate_quality_artifacts.py`
- `src/ai_model/data_quality_report.json`
- `src/ai_model/model_metrics.json`
- `src/ai_model/forecast_metrics.json`
- `src/ai_model/MODEL_CARD.md`
- `src/ai_model/artifact_manifest.json`
- `src/ai_model/training_metadata.json`
- `src/ai_model/smoke_test_api.py`

Run:

```bash
python src/ai_model/generate_quality_artifacts.py
```

Full project quality gate:

```bash
npm run verify
```

This runs TypeScript checking, Python syntax checks, quality artifact generation, model-card generation, an API smoke test for current value and one-year forecast, and the frontend production build.

The first evaluation result looked extremely strong:

- MAE: 25.21 SAR per sqm.
- RMSE: 68.94 SAR per sqm.
- R2: 0.9984.
- MAPE: 1.63%.

But this is not enough evidence that the model is production-ready, because the data has many duplicate rows and the original evaluation uses a random split. With duplicated market transactions, random split can leak almost-identical examples from training into test.

A stricter diagnostic was run without saving a new model:

| Evaluation | Train Rows | Test Rows | MAE | RMSE | R2 | MAPE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Deduplicated random split | 3,790 | 943 | 138.43 SAR/sqm | 201.53 | 0.9858 | 7.67% |
| Deduplicated time split, latest 12 months | 4,022 | 711 | 1,245.93 SAR/sqm | 1,705.36 | 0.1430 | 67.81% |
| District median baseline, same time split | 4,022 | 711 | 1,400.45 SAR/sqm | 1,807.88 | 0.0369 | 55.23% |

Conclusion:

The model captures patterns inside the historical dataset, but it is not yet robust enough for forward-looking valuation. The next serious model version must use time-based validation, deduplication, outlier handling, confidence intervals, and a professional comparable-adjustment layer.

## TAQEEM Alignment

Official/reference material reviewed:

- Saudi Authority for Accredited Valuers comprehensive valuation manual: https://taqeem.gov.sa/web/content/53979?download=true
- TAQEEM real estate valuation guidance/manual material: https://www.taqeem.gov.sa/web/content/portal.library/54/attachment_en?download=false
- TAQEEM real estate valuation material: https://www.taqeem.gov.sa/web/content/portal.library/64/attachment_en?download=false
- SPA note on compliance with statutory and professional requirements: https://www.spa.gov.sa/w1848624

The professional valuation workflow should support the three main approaches:

1. Market approach.
2. Income approach.
3. Cost approach.

For Jeddah land, the first serious product should mainly use the market approach, supported by:

- Comparable land transactions.
- Adjustments for date, district, area, plan, frontage, corner status, street width, shape, access, zoning/use, and development potential.
- Highest and best use logic.
- Explicit valuation date.
- Basis of value, usually market value unless another basis is selected.
- Assumptions and special assumptions.
- Uncertainty/confidence statement.
- Work file evidence: input data, selected comps, rejected comps, adjustments, calculations, and source references.

The current code already has pieces of this, but they need to become the core valuation engine instead of being secondary report decorations.

Important product/legal positioning:

Unless the platform is operated by licensed valuers and follows all regulatory requirements, the report should say it is an AI decision-support estimate, not an accredited valuation report.

## What Is Correct

1. Starting with Jeddah land only is the right scope.
2. Building a real dataset pipeline before expanding to apartments/villas is correct.
3. The report-first product direction is correct.
4. Map-based input is important and should stay.
5. Supabase persistence and user accounts are the right foundation.
6. Having fallback valuation when the model API is unavailable is useful for development.
7. Separating engines for valuation, regulations, feasibility, comparables, and reporting is the right architecture.

## What Is Wrong Or Risky

1. The current model is being trusted more than the evidence supports.
2. Random train/test split overstates accuracy.
3. The dataset has heavy duplication and questionable total-price fields.
4. The current prediction features are too thin for property-level valuation.
5. Coordinates, street width, corner status, land use, frontage, and parcel attributes are accepted by the API but not fully used in the trained model.
6. Growth prediction is too simple for a one-year forecast product.
7. Current Arabic text encoding is broken in many app/report files.
8. PDF export is browser print, not a controlled report renderer.
9. The report does not yet have a full TAQEEM-style scope, basis, assumptions, evidence file, and method reconciliation workflow.
10. Expanding to all Saudi Arabia before hardening Jeddah land would multiply data-quality problems.

## Product North Star

Muasher should become an AI real estate analyst that answers:

1. What is this property worth today?
2. What is the evidence behind that value?
3. What is the expected value after 12 months?
4. Is the asking price fair, high, or attractive?
5. What comparable transactions support the conclusion?
6. What are the risks and assumptions?
7. What is the highest and best use?
8. What should the user do next: buy, negotiate, hold, avoid, or request expert review?

The product should not only output a price. It should output a defendable decision.

## Recommended Build Order

### Phase 1: Jeddah Land Valuation Core

Goal: make land valuation credible before adding more asset classes.

Tasks:

- Fix Arabic encoding across UI, docs, Python messages, and report text.
- Build a repeatable data-cleaning pipeline.
- Deduplicate transactions and preserve duplicate reason where relevant.
- Add data-quality flags per transaction.
- Separate source total price from repaired total price.
- Use time-based model validation as the default.
- Save model metrics to a versioned artifact. Initial artifacts now exist in `src/ai_model/model_metrics.json`.
- Add model card: dataset period, features, target, validation method, metrics, limitations.
- Keep the report evidence section in sync with the generated quality artifacts.
- Make `/predict` return valuation date, data coverage, confidence score, and warning reasons.
- Build a true comparable selection engine for land.
- Add adjustment table as a first-class output, not optional report detail.
- Add reconciliation: model estimate + adjusted comparables + market median/range. Initial reconciliation now exists and should become more rigorous as income/cost evidence improves.

### Phase 2: TAQEEM-Aligned Report Workflow

Goal: make the report look and behave like a professional valuation workflow while staying legally positioned as AI support unless licensed.

Tasks:

- Add valuation purpose: purchase, sale, financing, internal advisory, inheritance, litigation support, etc.
- Add basis of value: market value by default.
- Add valuation date and report date.
- Add scope of work.
- Add assumptions and special assumptions.
- Add inspected/not inspected status.
- Add source list and data cut-off date.
- Add selected comparables and rejected comparables.
- Add adjustment explanation per comparable.
- Add method selection reason.
- Add final reconciliation narrative.
- Add uncertainty statement.
- Add professional disclaimer.
- Generate proper PDF with controlled layout.

### Phase 3: One-Year Forecast Engine

Goal: answer “after one year, how much will it be?” with uncertainty.

Current status:

- A dedicated one-year forecast object is now generated in the report.
- The forecast includes current estimated value, base 12-month value, conservative and optimistic scenarios, growth rate, confidence, method, rationale, and warnings.
- `/predict` returns `annual_growth_rate_percentage` and `one_year_forecast_price`.
- `forecast_metrics.json` now backtests the current forecast method against the latest 12 months and is shown in report evidence.

Tasks:

- Replace the current simple capped growth reference with a stronger forecast module.
- Use district-level time series where enough data exists.
- Fall back to city/segment trend where district data is thin.
- Return forecast range, not a single number.
- Include scenario outputs: conservative, base, optimistic.
- Track market momentum: transaction count, median price trend, liquidity.
- Validate forecast using walk-forward backtesting.

### Phase 4: AI Agent Layer

Goal: turn the platform from report generator into a real estate agent.

Current status:

- A first non-chat agent advisory layer is generated inside each new report.
- It converts valuation and forecast outputs into negotiation guidance, due-diligence steps, missing-input warnings, and seller/broker questions.

Tasks:

- Add chat interface over the report.
- Let the AI explain why price is high/low.
- Let the user ask: “What if I negotiate 10% down?”
- Let the user compare two plots.
- Let the agent produce a negotiation strategy.
- Let the agent identify missing information and ask follow-up questions.
- Add guardrails so the AI cannot invent sources or claim accreditation.

### Phase 5: Expansion To Other Asset Classes

Order:

1. Land in Jeddah.
2. Villas in Jeddah.
3. Apartments in Jeddah.
4. Commercial/income-producing assets in Jeddah.
5. Riyadh land.
6. Riyadh residential.
7. Makkah, Dammam, Khobar, Madinah.
8. Full Saudi coverage.

Reason:

Each asset class needs different valuation logic. Land is mostly market/HBU/residual. Apartments and villas need building age, condition, finishing, floor, parking, amenities, developer, and project quality. Income-producing commercial assets need income approach, leases, vacancy, cap rates, operating expenses, and DCF.

## Data Needed Next

For land:

- Parcel coordinates.
- District boundaries.
- Plan/parcel quality.
- Street width.
- Corner/intersection.
- Frontage direction and frontage length.
- Land shape.
- Zoning/land-use.
- Building regulations by parcel or district.
- Distance to main roads/services.
- Official transaction source metadata.

For villas/apartments later:

- Building age.
- Building area.
- Unit size.
- Number of rooms.
- Floor.
- Parking.
- Elevator.
- Condition.
- Finishing level.
- Project/developer.
- Rental evidence.
- Listing evidence, separated from closed transaction evidence.

## Immediate Engineering Tasks

1. Keep `src/ai_model/evaluate_model.py` aligned with training features.
2. Regenerate `model_metrics.json` from a time-based validation run after every data/model change.
3. Regenerate `data_quality_report.json` after every data preparation change.
4. Regenerate `MODEL_CARD.md` after every data/model change and review its limitations before shipping.
5. Add a “valuation source and confidence” block in the UI and report.
6. Fix Arabic encoding in `src/lib/i18n.tsx`, report labels, and Python strings.
7. Add a controlled PDF renderer instead of relying only on browser print.
8. Add tests for report building when the API is unavailable.
9. Add a warning in the report: “AI decision-support estimate, not an accredited valuation unless reviewed/signed by an accredited valuer.”

## Bottom Line

The current foundation is good. The next winning move is not to add more cities yet. The next winning move is to make Jeddah land valuation professionally defensible:

- clean data,
- transparent comparables,
- TAQEEM-aligned workflow,
- credible confidence ranges,
- controlled reports,
- clear legal positioning,
- then expand one asset class at a time.
