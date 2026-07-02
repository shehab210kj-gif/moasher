import json
import os
import hashlib
import sys
from importlib import metadata
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder
from xgboost import XGBRegressor


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "muasher_full_data.csv")
DATA_QUALITY_PATH = os.path.join(BASE_DIR, "data_quality_report.json")
MODEL_METRICS_PATH = os.path.join(BASE_DIR, "model_metrics.json")
FORECAST_METRICS_PATH = os.path.join(BASE_DIR, "forecast_metrics.json")
MODEL_CARD_PATH = os.path.join(BASE_DIR, "MODEL_CARD.md")
ARTIFACT_MANIFEST_PATH = os.path.join(BASE_DIR, "artifact_manifest.json")

TRACKED_ARTIFACTS = [
    "muasher_full_data.csv",
    "valuation_model.pkl",
    "valuation_model.xgb.json",
    "le_neighborhood.pkl",
    "le_type.pkl",
    "le_plan.pkl",
    "plan_defaults.json",
    "prediction_stats.json",
    "training_metadata.json",
    "data_quality_report.json",
    "model_metrics.json",
    "forecast_metrics.json",
]


def to_builtin(value):
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        if np.isnan(value) or np.isinf(value):
            return None
        return float(value)
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): to_builtin(item) for key, item in value.items()}
    if isinstance(value, list):
        return [to_builtin(item) for item in value]
    return value


def load_dataset():
    df = pd.read_csv(DATA_PATH)
    if len(df.columns) < 12:
        raise ValueError("Expected at least 12 columns in muasher_full_data.csv")

    return df.rename(
        columns={
            df.columns[0]: "date",
            df.columns[3]: "city",
            df.columns[5]: "plan",
            df.columns[6]: "parcel",
            df.columns[7]: "total_price",
            df.columns[8]: "district",
            df.columns[9]: "property_type",
            df.columns[10]: "area_sqm",
            df.columns[11]: "price_per_sqm",
        }
    )


def prepare_dataset(df):
    prepared = df.copy()
    prepared["date"] = pd.to_datetime(prepared["date"], errors="coerce")
    prepared["plan"] = prepared["plan"].fillna("unknown")
    prepared["parcel"] = prepared["parcel"].fillna("unknown")
    for column in ["total_price", "area_sqm", "price_per_sqm"]:
        prepared[column] = pd.to_numeric(prepared[column], errors="coerce")
    return prepared


def build_data_quality_report(df):
    expected_total = df["area_sqm"] * df["price_per_sqm"]
    valid_expected_total = expected_total > 0
    suspect_total_mask = valid_expected_total & (df["total_price"] < expected_total * 0.65)
    latest_date = df["date"].max()
    latest_12_months = latest_date - pd.DateOffset(months=12) if pd.notna(latest_date) else None
    latest_rows = int((df["date"] >= latest_12_months).sum()) if latest_12_months is not None else 0

    numeric_summary = {}
    for column in ["total_price", "area_sqm", "price_per_sqm"]:
        series = df[column].dropna()
        numeric_summary[column] = {
            "count": int(series.count()),
            "min": float(series.min()) if not series.empty else None,
            "p25": float(series.quantile(0.25)) if not series.empty else None,
            "median": float(series.median()) if not series.empty else None,
            "mean": float(series.mean()) if not series.empty else None,
            "p75": float(series.quantile(0.75)) if not series.empty else None,
            "max": float(series.max()) if not series.empty else None,
        }

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_file": os.path.relpath(DATA_PATH, BASE_DIR),
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "date_range": {
            "min": df["date"].min(),
            "max": df["date"].max(),
            "valid_dates": int(df["date"].notna().sum()),
        },
        "city_count": int(df["city"].nunique(dropna=True)),
        "district_count": int(df["district"].nunique(dropna=True)),
        "property_type_counts": df["property_type"].value_counts(dropna=False).head(20).to_dict(),
        "top_districts": df["district"].value_counts(dropna=False).head(20).to_dict(),
        "duplicate_rows": int(df.duplicated().sum()),
        "missing_values": {
            "date": int(df["date"].isna().sum()),
            "city": int(df["city"].isna().sum()),
            "district": int(df["district"].isna().sum()),
            "property_type": int(df["property_type"].isna().sum()),
            "plan": int((df["plan"] == "unknown").sum()),
            "parcel": int((df["parcel"] == "unknown").sum()),
            "total_price": int(df["total_price"].isna().sum()),
            "area_sqm": int(df["area_sqm"].isna().sum()),
            "price_per_sqm": int(df["price_per_sqm"].isna().sum()),
        },
        "quality_flags": {
            "zero_or_negative_total_price": int((df["total_price"] <= 0).sum()),
            "zero_or_negative_area": int((df["area_sqm"] <= 0).sum()),
            "zero_or_negative_price_per_sqm": int((df["price_per_sqm"] <= 0).sum()),
            "suspect_total_price_vs_area_times_price_per_sqm": int(suspect_total_mask.sum()),
            "latest_12_month_rows": latest_rows,
        },
        "numeric_summary": numeric_summary,
    }
    return to_builtin(report)


def evaluate_model(train, test):
    features = ["district", "property_type", "plan", "area_sqm", "year", "month"]
    target = "price_per_sqm"

    preprocessor = ColumnTransformer(
        [
            (
                "category",
                OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1),
                ["district", "property_type", "plan"],
            ),
            ("number", "passthrough", ["area_sqm", "year", "month"]),
        ]
    )
    model = XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
    )
    pipeline = Pipeline([("preprocessor", preprocessor), ("model", model)])
    pipeline.fit(train[features], train[target])
    predictions = pipeline.predict(test[features])

    actual = test[target]
    return {
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "mae_sar_per_sqm": float(mean_absolute_error(actual, predictions)),
        "rmse_sar_per_sqm": float(np.sqrt(mean_squared_error(actual, predictions))),
        "r2": float(r2_score(actual, predictions)),
        "mape_percent": float(np.mean(np.abs((actual - predictions) / actual)) * 100),
    }


def evaluate_baseline(train, test):
    medians = train.groupby(["district", "property_type"])["price_per_sqm"].median()
    global_median = train["price_per_sqm"].median()
    predictions = [
        medians.get((row["district"], row["property_type"]), global_median)
        for _, row in test.iterrows()
    ]
    actual = test["price_per_sqm"]
    return {
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "mae_sar_per_sqm": float(mean_absolute_error(actual, predictions)),
        "rmse_sar_per_sqm": float(np.sqrt(mean_squared_error(actual, predictions))),
        "r2": float(r2_score(actual, predictions)),
        "mape_percent": float(np.mean(np.abs((actual - predictions) / actual)) * 100),
    }


def build_model_metrics(df):
    model_df = df.dropna(
        subset=["date", "district", "property_type", "area_sqm", "price_per_sqm"]
    ).copy()
    model_df = model_df[model_df["area_sqm"] > 0]
    model_df = model_df[model_df["price_per_sqm"] > 0]
    model_df["plan"] = model_df["plan"].fillna("unknown")
    model_df["year"] = model_df["date"].dt.year
    model_df["month"] = model_df["date"].dt.month

    dedup = model_df.drop_duplicates()
    rng = np.random.default_rng(42)
    random_mask = rng.random(len(dedup)) < 0.8
    random_train = dedup[random_mask]
    random_test = dedup[~random_mask]

    latest_date = dedup["date"].max()
    cutoff = latest_date - pd.DateOffset(months=12)
    time_train = dedup[dedup["date"] < cutoff]
    time_test = dedup[dedup["date"] >= cutoff]

    metrics = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_file": os.path.relpath(DATA_PATH, BASE_DIR),
        "model_family": "xgboost_regressor_diagnostic",
        "target": "price_per_sqm",
        "features": ["district", "property_type", "plan", "area_sqm", "year", "month"],
        "notes": [
            "This diagnostic retrains an in-memory model only; it does not overwrite valuation_model.pkl.",
            "Time-based validation is the primary production-readiness signal.",
            "High random-split scores should be treated cautiously when duplicate transactions exist.",
        ],
        "dataset": {
            "rows_after_basic_filtering": int(len(model_df)),
            "deduplicated_rows": int(len(dedup)),
            "duplicate_rows_removed_for_diagnostics": int(len(model_df) - len(dedup)),
            "date_range": {
                "min": dedup["date"].min(),
                "max": dedup["date"].max(),
            },
            "time_split_cutoff": cutoff,
        },
        "evaluations": {
            "deduplicated_random_split": evaluate_model(random_train, random_test),
            "deduplicated_time_split_latest_12_months": evaluate_model(time_train, time_test),
            "baseline_district_type_median_time_split": evaluate_baseline(time_train, time_test),
        },
    }
    return to_builtin(metrics)


def annualized_growth(first_value, last_value, month_count):
    if first_value <= 0 or last_value <= 0 or month_count <= 1:
        return 0.035
    raw_growth = ((last_value - first_value) / first_value) / month_count * 12
    return max(-0.05, min(0.20, raw_growth))


def build_forecast_metrics(df):
    forecast_df = df.dropna(
        subset=["date", "district", "property_type", "price_per_sqm"]
    ).copy()
    forecast_df = forecast_df[forecast_df["price_per_sqm"] > 0]
    forecast_df = forecast_df.drop_duplicates()

    latest_date = forecast_df["date"].max()
    cutoff = latest_date - pd.DateOffset(months=12)
    train = forecast_df[forecast_df["date"] < cutoff]
    test = forecast_df[forecast_df["date"] >= cutoff]

    rows = []
    for (district, property_type), train_group in train.groupby(["district", "property_type"]):
        test_group = test[
            (test["district"] == district)
            & (test["property_type"] == property_type)
        ]
        if len(train_group) < 12 or len(test_group) < 3:
            continue

        monthly = (
            train_group
            .groupby(train_group["date"].dt.to_period("M"))["price_per_sqm"]
            .median()
            .sort_index()
        )
        if len(monthly) < 3:
            continue

        first_price = float(monthly.iloc[0])
        last_price = float(monthly.iloc[-1])
        growth = annualized_growth(first_price, last_price, len(monthly))
        actual = float(test_group["price_per_sqm"].median())
        predicted = float(last_price * (1 + growth))
        error = predicted - actual
        absolute_error = abs(error)
        absolute_percentage_error = absolute_error / actual * 100 if actual > 0 else None

        rows.append({
            "district": district,
            "property_type": property_type,
            "train_rows": int(len(train_group)),
            "test_rows": int(len(test_group)),
            "growth_rate_percentage": float(growth * 100),
            "training_last_median_price_per_sqm": last_price,
            "predicted_12m_median_price_per_sqm": predicted,
            "actual_12m_median_price_per_sqm": actual,
            "error_sar_per_sqm": error,
            "absolute_error_sar_per_sqm": absolute_error,
            "absolute_percentage_error": absolute_percentage_error,
        })

    if rows:
        errors = np.array([row["absolute_error_sar_per_sqm"] for row in rows], dtype=float)
        percentage_errors = np.array(
            [
                row["absolute_percentage_error"]
                for row in rows
                if row["absolute_percentage_error"] is not None
            ],
            dtype=float,
        )
        summary = {
            "segments_tested": int(len(rows)),
            "mae_sar_per_sqm": float(np.mean(errors)),
            "median_absolute_error_sar_per_sqm": float(np.median(errors)),
            "mape_percent": float(np.mean(percentage_errors)) if len(percentage_errors) else None,
            "median_ape_percent": float(np.median(percentage_errors)) if len(percentage_errors) else None,
        }
    else:
        summary = {
            "segments_tested": 0,
            "mae_sar_per_sqm": None,
            "median_absolute_error_sar_per_sqm": None,
            "mape_percent": None,
            "median_ape_percent": None,
        }

    return to_builtin({
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_file": os.path.relpath(DATA_PATH, BASE_DIR),
        "method": "Segment median backtest: train before latest 12 months, project 12 months using capped annualized growth, compare with actual latest-12-month median.",
        "cutoff_date": cutoff,
        "latest_date": latest_date,
        "growth_cap": {
            "min": -0.05,
            "max": 0.20,
            "fallback": 0.035,
        },
        "summary": summary,
        "segments": sorted(rows, key=lambda row: row["absolute_error_sar_per_sqm"], reverse=True)[:50],
    })


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def dependency_version(package_name):
    try:
        return metadata.version(package_name)
    except metadata.PackageNotFoundError:
        return None


def build_artifact_manifest():
    files = []
    for filename in TRACKED_ARTIFACTS:
        path = os.path.join(BASE_DIR, filename)
        if not os.path.exists(path):
            files.append({
                "path": filename,
                "exists": False,
                "size_bytes": None,
                "sha256": None,
            })
            continue

        files.append({
            "path": filename,
            "exists": True,
            "size_bytes": os.path.getsize(path),
            "sha256": sha256_file(path),
        })

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base_dir": BASE_DIR,
        "files": files,
        "dependencies": {
            "python": "{}.{}.{}".format(*sys.version_info[:3]),
            "pandas": dependency_version("pandas"),
            "numpy": dependency_version("numpy"),
            "scikit-learn": dependency_version("scikit-learn"),
            "xgboost": dependency_version("xgboost"),
            "joblib": dependency_version("joblib"),
            "fastapi": dependency_version("fastapi"),
        },
    }


def write_json(path, payload):
    with open(path, "w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)
        file.write("\n")


def build_model_card(data_quality, model_metrics, forecast_metrics, artifact_manifest):
    random_split = model_metrics["evaluations"]["deduplicated_random_split"]
    time_split = model_metrics["evaluations"]["deduplicated_time_split_latest_12_months"]
    baseline = model_metrics["evaluations"]["baseline_district_type_median_time_split"]
    property_types = ", ".join(
        f"{name}: {count}" for name, count in data_quality["property_type_counts"].items()
    )
    features = ", ".join(model_metrics["features"])
    forecast_summary = forecast_metrics["summary"]
    manifest_rows = "\n".join(
        f"| {item['path']} | {item['size_bytes'] if item['exists'] else 'missing'} | {item['sha256'][:12] if item['sha256'] else 'n/a'} |"
        for item in artifact_manifest["files"]
    )

    return f"""# Muasher Valuation Model Card

Generated at: {model_metrics["generated_at"]}

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
- Source file: {data_quality["source_file"]}.
- Date range: {data_quality["date_range"]["min"]} to {data_quality["date_range"]["max"]}.
- Rows: {data_quality["rows"]}.
- Deduplicated diagnostic rows: {model_metrics["dataset"]["deduplicated_rows"]}.
- District count: {data_quality["district_count"]}.
- Property type counts: {property_types}.

## Target And Features

- Target: {model_metrics["target"]}.
- Features: {features}.
- Model family: {model_metrics["model_family"]}.

The API prefers the native XGBoost artifact `valuation_model.xgb.json` and falls back to `valuation_model.pkl` if needed. This model card is generated from diagnostic retraining and validation; it does not overwrite the production artifact.

## Validation Summary

| Validation | Train Rows | Test Rows | MAE SAR/sqm | RMSE SAR/sqm | R2 | MAPE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Deduplicated random split | {random_split["train_rows"]} | {random_split["test_rows"]} | {random_split["mae_sar_per_sqm"]:.2f} | {random_split["rmse_sar_per_sqm"]:.2f} | {random_split["r2"]:.4f} | {random_split["mape_percent"]:.2f}% |
| Deduplicated latest-12-month time split | {time_split["train_rows"]} | {time_split["test_rows"]} | {time_split["mae_sar_per_sqm"]:.2f} | {time_split["rmse_sar_per_sqm"]:.2f} | {time_split["r2"]:.4f} | {time_split["mape_percent"]:.2f}% |
| District/type median baseline time split | {baseline["train_rows"]} | {baseline["test_rows"]} | {baseline["mae_sar_per_sqm"]:.2f} | {baseline["rmse_sar_per_sqm"]:.2f} | {baseline["r2"]:.4f} | {baseline["mape_percent"]:.2f}% |

The latest-12-month time split is the primary production-readiness signal. Random-split performance should be treated cautiously because duplicate or near-duplicate transactions can leak between train and test sets.

## Forecast Backtest Summary

Method: {forecast_metrics["method"]}

- Segments tested: {forecast_summary["segments_tested"]}.
- MAE SAR/sqm: {forecast_summary["mae_sar_per_sqm"] if forecast_summary["mae_sar_per_sqm"] is not None else "n/a"}.
- Median absolute error SAR/sqm: {forecast_summary["median_absolute_error_sar_per_sqm"] if forecast_summary["median_absolute_error_sar_per_sqm"] is not None else "n/a"}.
- MAPE: {forecast_summary["mape_percent"] if forecast_summary["mape_percent"] is not None else "n/a"}.
- Median APE: {forecast_summary["median_ape_percent"] if forecast_summary["median_ape_percent"] is not None else "n/a"}.

## Data Quality Flags

- Duplicate rows: {data_quality["duplicate_rows"]}.
- Missing plan: {data_quality["missing_values"]["plan"]}.
- Missing parcel: {data_quality["missing_values"]["parcel"]}.
- Zero or negative total price rows: {data_quality["quality_flags"]["zero_or_negative_total_price"]}.
- Suspect total price rows vs area * price per sqm: {data_quality["quality_flags"]["suspect_total_price_vs_area_times_price_per_sqm"]}.
- Latest 12 month rows: {data_quality["quality_flags"]["latest_12_month_rows"]}.

## Known Limitations

- The model currently does not fully use parcel coordinates, street width, frontage, corner status, land shape, zoning, utilities, or parcel-level regulatory constraints as trained features.
- The total price field in the current dataset has quality issues; price per sqm is the main target used for diagnostics.
- One-year forecast is currently directional and based on growth references, not a full walk-forward forecasting engine.
- The model is not yet validated across other Saudi cities or non-land asset classes.
- Formal TAQEEM-grade reliance requires a licensed valuer review process and a complete work file.

## Artifact Traceability

| Artifact | Size bytes | SHA256 prefix |
| --- | ---: | --- |
{manifest_rows}

Dependency versions:

- Python: {artifact_manifest["dependencies"]["python"]}
- pandas: {artifact_manifest["dependencies"]["pandas"]}
- numpy: {artifact_manifest["dependencies"]["numpy"]}
- scikit-learn: {artifact_manifest["dependencies"]["scikit-learn"]}
- xgboost: {artifact_manifest["dependencies"]["xgboost"]}
- joblib: {artifact_manifest["dependencies"]["joblib"]}
- fastapi: {artifact_manifest["dependencies"]["fastapi"]}

## Required Next Steps

1. Build a versioned data-cleaning pipeline with clear repair/exclusion rules.
2. Train and validate using time-based and geography/segment holdout splits.
3. Add parcel-level and planning features for land.
4. Add model version metadata and dependency versions to artifacts.
5. Build a stronger forecast engine with walk-forward backtesting.
6. Add separate model cards for villas, apartments, and income-producing assets when those asset classes are introduced.
"""


def write_text(path, content):
    with open(path, "w", encoding="utf-8") as file:
        file.write(content)


def main():
    raw = load_dataset()
    df = prepare_dataset(raw)
    data_quality = build_data_quality_report(df)
    model_metrics = build_model_metrics(df)
    forecast_metrics = build_forecast_metrics(df)

    write_json(DATA_QUALITY_PATH, data_quality)
    write_json(MODEL_METRICS_PATH, model_metrics)
    write_json(FORECAST_METRICS_PATH, forecast_metrics)
    artifact_manifest = build_artifact_manifest()
    write_json(ARTIFACT_MANIFEST_PATH, artifact_manifest)
    write_text(MODEL_CARD_PATH, build_model_card(data_quality, model_metrics, forecast_metrics, artifact_manifest))

    print(f"Wrote {DATA_QUALITY_PATH}")
    print(f"Wrote {MODEL_METRICS_PATH}")
    print(f"Wrote {FORECAST_METRICS_PATH}")
    print(f"Wrote {MODEL_CARD_PATH}")
    print(f"Wrote {ARTIFACT_MANIFEST_PATH}")
    print(
        "Primary time-split MAE:",
        round(
            model_metrics["evaluations"]["deduplicated_time_split_latest_12_months"][
                "mae_sar_per_sqm"
            ],
            2,
        ),
        "SAR/sqm",
    )


if __name__ == "__main__":
    main()
