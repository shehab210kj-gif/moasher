# Muasher Valuation Model Card

Generated at: 2026-06-24T06:24:53.441068+00:00

## Intended Use

This model is a decision-support component for estimating Jeddah land value per square meter and total land value inside the Muasher AI real estate analysis workflow.

It is intended to support:

- Current market value estimation for Jeddah land.
- Comparable-market analysis and report generation.
- One-year directional forecast scenarios.
- Negotiation and due-diligence guidance.

It is not, by itself, an accredited valuation report. Regulatory, financing, litigation, or formal valuation use should require review and sign-off by a licensed accredited valuer.

## Current Scope

- Geography: Jeddah only.
- Asset class: land only in the current dataset.
- Source file: muasher_full_data.csv.
- Date range: 2019-01-01T00:00:00 to 2026-03-08T00:00:00.
- Rows: 4746.
- Deduplicated diagnostic rows: 4746.
- District count: 109.
- Property type counts: قطعة أرض: 4746.

## Target And Features

- Target: price_per_sqm.
- Features: district, property_type, plan, area_sqm, year, month.
- Model family: xgboost_regressor_diagnostic.

The API prefers the native XGBoost artifact `valuation_model.xgb.json` and falls back to `valuation_model.pkl` if needed. This model card is generated from diagnostic retraining and validation; it does not overwrite the production artifact.

## Validation Summary

| Validation | Train Rows | Test Rows | MAE SAR/sqm | RMSE SAR/sqm | R2 | MAPE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Deduplicated random split | 3802 | 944 | 140.80 | 202.63 | 0.9858 | 7.76% |
| Deduplicated latest-12-month time split | 4035 | 711 | 1250.85 | 1713.88 | 0.1344 | 67.39% |
| District/type median baseline time split | 4035 | 711 | 1398.66 | 1802.91 | 0.0421 | 55.47% |

The latest-12-month time split is the primary production-readiness signal. Random-split performance should be treated cautiously because duplicate or near-duplicate transactions can leak between train and test sets.

## Forecast Backtest Summary

Method: Segment median backtest: train before latest 12 months, project 12 months using capped annualized growth, compare with actual latest-12-month median.

- Segments tested: 14.
- MAE SAR/sqm: 1379.9889548130125.
- Median absolute error SAR/sqm: 607.3209999999999.
- MAPE: 79.02989550205461.
- Median APE: 33.68421350011006.

## Data Quality Flags

- Duplicate rows: 0.
- Missing plan: 2804.
- Missing parcel: 4032.
- Zero or negative total price rows: 31.
- Suspect total price rows vs area * price per sqm: 3722.
- Latest 12 month rows: 711.

## Known Limitations

- The model currently does not fully use parcel coordinates, street width, frontage, corner status, land shape, zoning, utilities, or parcel-level regulatory constraints as trained features.
- The total price field in the current dataset has quality issues; price per sqm is the main target used for diagnostics.
- One-year forecast is currently directional and based on growth references, not a full walk-forward forecasting engine.
- The model is not yet validated across other Saudi cities or non-land asset classes.
- Formal TAQEEM-grade reliance requires a licensed valuer review process and a complete work file.

## Artifact Traceability

| Artifact | Size bytes | SHA256 prefix |
| --- | ---: | --- |
| muasher_full_data.csv | 697090 | 9ca5591e2272 |
| valuation_model.pkl | 3635663 | 313669e56f53 |
| valuation_model.xgb.json | 5100758 | 73f3b512a659 |
| le_neighborhood.pkl | 2514 | a7ccad248db8 |
| le_type.pkl | 490 | 9a9b42442788 |
| le_plan.pkl | 6542 | 7af82e2f9678 |
| plan_defaults.json | 3681 | e8683e626c1c |
| prediction_stats.json | 1757 | 79e9db7ff2d4 |
| training_metadata.json | 2287 | f40e557e52c3 |
| data_quality_report.json | 2059 | c09d3c522f01 |
| model_metrics.json | 1730 | 29d1c5643f47 |
| forecast_metrics.json | 7673 | 69a62e83b116 |

Dependency versions:

- Python: 3.14.5
- pandas: 3.0.3
- numpy: 2.4.6
- scikit-learn: 1.8.0
- xgboost: 3.2.0
- joblib: 1.5.3
- fastapi: 0.136.3

## Required Next Steps

1. Build a versioned data-cleaning pipeline with clear repair/exclusion rules.
2. Train and validate using time-based and geography/segment holdout splits.
3. Add parcel-level and planning features for land.
4. Add model version metadata and dependency versions to artifacts.
5. Build a stronger forecast engine with walk-forward backtesting.
6. Add separate model cards for villas, apartments, and income-producing assets when those asset classes are introduced.
