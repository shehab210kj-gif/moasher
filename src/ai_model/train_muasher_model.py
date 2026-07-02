import json
import os
from datetime import datetime, timezone
from importlib import metadata

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBRegressor


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "muasher_full_data.csv")

MODEL_PATH = os.path.join(BASE_DIR, "valuation_model.pkl")
MODEL_NATIVE_PATH = os.path.join(BASE_DIR, "valuation_model.xgb.json")
LE_NEIGHBORHOOD_PATH = os.path.join(BASE_DIR, "le_neighborhood.pkl")
LE_TYPE_PATH = os.path.join(BASE_DIR, "le_type.pkl")
LE_PLAN_PATH = os.path.join(BASE_DIR, "le_plan.pkl")
PLAN_DEFAULTS_PATH = os.path.join(BASE_DIR, "plan_defaults.json")
PREDICTION_STATS_PATH = os.path.join(BASE_DIR, "prediction_stats.json")
TRAINING_METADATA_PATH = os.path.join(BASE_DIR, "training_metadata.json")


def dependency_version(package_name):
    try:
        return metadata.version(package_name)
    except metadata.PackageNotFoundError:
        return None


def to_json_safe(value):
    if isinstance(value, dict):
        return {str(key): to_json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [to_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [to_json_safe(item) for item in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return None if not np.isfinite(value) else float(value)
    return value


def load_training_data():
    df = pd.read_csv(DATA_PATH)
    if len(df.columns) < 12:
        raise ValueError("Expected at least 12 columns in muasher_full_data.csv")

    df = df.rename(
        columns={
            df.columns[0]: "date",
            df.columns[5]: "plan",
            df.columns[8]: "district",
            df.columns[9]: "property_type",
            df.columns[10]: "area_sqm",
            df.columns[11]: "price_per_sqm",
        }
    )
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["plan"] = df["plan"].fillna("unknown")
    df["area_sqm"] = pd.to_numeric(df["area_sqm"], errors="coerce")
    df["price_per_sqm"] = pd.to_numeric(df["price_per_sqm"], errors="coerce")
    df = df.dropna(subset=["date", "district", "property_type", "area_sqm", "price_per_sqm"])
    df = df[df["area_sqm"] > 0]
    df = df[df["price_per_sqm"] > 0]
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    return df


def train_model(df):
    le_neighborhood = LabelEncoder()
    le_type = LabelEncoder()
    le_plan = LabelEncoder()

    df = df.copy()
    df["neighborhood_encoded"] = le_neighborhood.fit_transform(df["district"])
    df["type_encoded"] = le_type.fit_transform(df["property_type"])
    df["plan_encoded"] = le_plan.fit_transform(df["plan"])

    feature_columns = [
        "neighborhood_encoded",
        "type_encoded",
        "area_sqm",
        "plan_encoded",
        "year",
        "month",
    ]
    X = df[feature_columns]
    y = df["price_per_sqm"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
    )

    model = XGBRegressor(
        n_estimators=500,
        learning_rate=0.03,
        max_depth=8,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    metrics = {
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "mae_sar_per_sqm": float(mean_absolute_error(y_test, predictions)),
        "rmse_sar_per_sqm": float(np.sqrt(mean_squared_error(y_test, predictions))),
        "r2": float(r2_score(y_test, predictions)),
        "mape_percent": float(np.mean(np.abs((y_test - predictions) / y_test)) * 100),
    }

    return model, le_neighborhood, le_type, le_plan, metrics, feature_columns


def build_prediction_stats(df):
    monthly_global = (
        df.groupby(df["date"].dt.to_period("M"))["price_per_sqm"]
        .mean()
        .reset_index()
        .sort_values("date")
    )
    first_price_global = monthly_global.iloc[0]["price_per_sqm"]
    last_price_global = monthly_global.iloc[-1]["price_per_sqm"]
    num_months_global = len(monthly_global)

    if num_months_global > 1 and first_price_global > 0:
        total_growth_global = (last_price_global - first_price_global) / first_price_global
        global_annual_growth_rate = (total_growth_global / num_months_global) * 12
    else:
        global_annual_growth_rate = 0.024

    global_annual_growth_rate = max(-0.05, min(0.15, global_annual_growth_rate))

    neighborhood_growth_rates = {}
    for district in df["district"].unique():
        district_df = df[df["district"] == district]
        district_monthly = (
            district_df.groupby(district_df["date"].dt.to_period("M"))["price_per_sqm"]
            .mean()
            .reset_index()
            .sort_values("date")
        )
        if len(district_monthly) < 3:
            continue
        first_price = district_monthly.iloc[0]["price_per_sqm"]
        last_price = district_monthly.iloc[-1]["price_per_sqm"]
        if first_price <= 0:
            continue
        total_growth = (last_price - first_price) / first_price
        annual_growth = (total_growth / len(district_monthly)) * 12
        neighborhood_growth_rates[district] = float(max(-0.05, min(0.20, annual_growth)))

    return {
        "global_annual_growth_rate": float(global_annual_growth_rate),
        "neighborhood_growth_rates": neighborhood_growth_rates,
        "last_market_avg": float(last_price_global),
        "num_data_months": int(num_months_global),
    }


def write_json(path, payload):
    with open(path, "w", encoding="utf-8") as file:
        json.dump(to_json_safe(payload), file, ensure_ascii=False, indent=2, allow_nan=False)
        file.write("\n")


def main():
    df = load_training_data()
    model, le_neighborhood, le_type, le_plan, metrics, feature_columns = train_model(df)
    prediction_stats = build_prediction_stats(df)
    plan_defaults = df.groupby("district")["plan"].agg(lambda values: values.value_counts().index[0]).to_dict()

    joblib.dump(model, MODEL_PATH)
    model.get_booster().save_model(MODEL_NATIVE_PATH)
    joblib.dump(le_neighborhood, LE_NEIGHBORHOOD_PATH)
    joblib.dump(le_type, LE_TYPE_PATH)
    joblib.dump(le_plan, LE_PLAN_PATH)
    write_json(PLAN_DEFAULTS_PATH, plan_defaults)
    write_json(PREDICTION_STATS_PATH, prediction_stats)

    metadata_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_file": os.path.basename(DATA_PATH),
        "rows": int(len(df)),
        "date_range": {
            "min": df["date"].min().isoformat(),
            "max": df["date"].max().isoformat(),
        },
        "target": "price_per_sqm",
        "features": feature_columns,
        "model_family": "XGBRegressor",
        "hyperparameters": model.get_params(),
        "metrics_random_split": metrics,
        "artifacts": {
            "valuation_model": os.path.basename(MODEL_PATH),
            "valuation_model_native": os.path.basename(MODEL_NATIVE_PATH),
            "le_neighborhood": os.path.basename(LE_NEIGHBORHOOD_PATH),
            "le_type": os.path.basename(LE_TYPE_PATH),
            "le_plan": os.path.basename(LE_PLAN_PATH),
            "plan_defaults": os.path.basename(PLAN_DEFAULTS_PATH),
            "prediction_stats": os.path.basename(PREDICTION_STATS_PATH),
        },
        "dependencies": {
            "pandas": dependency_version("pandas"),
            "numpy": dependency_version("numpy"),
            "scikit-learn": dependency_version("scikit-learn"),
            "xgboost": dependency_version("xgboost"),
            "joblib": dependency_version("joblib"),
        },
    }
    write_json(TRAINING_METADATA_PATH, metadata_payload)

    print("Training complete.")
    print(f"Rows: {len(df)}")
    print(f"Random split R2: {metrics['r2']:.4f}")
    print(f"Random split MAE: {metrics['mae_sar_per_sqm']:.2f} SAR/sqm")


if __name__ == "__main__":
    main()
