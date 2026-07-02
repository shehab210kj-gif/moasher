# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import xgboost as xgb
import json
import os
import joblib
from datetime import datetime
from typing import Optional, List, Dict, Any

try:
    from .regulations_engine import get_regulations, calculate_building_potential
    from .feasibility_engine import calculate_feasibility, CONSTRUCTION_COSTS
    from .ai_analysis_engine import AIAnalysisEngine
    from .adjustments_engine import AdjustmentEngine
    from .comparable_search import ComparableSearch
    from .cost_approach_engine import CostApproachEngine
    from .spatial_features import SpatialFeatures
except ImportError:
    from regulations_engine import get_regulations, calculate_building_potential
    from feasibility_engine import calculate_feasibility, CONSTRUCTION_COSTS
    from ai_analysis_engine import AIAnalysisEngine
    from adjustments_engine import AdjustmentEngine
    from comparable_search import ComparableSearch
    from cost_approach_engine import CostApproachEngine
    from spatial_features import SpatialFeatures

# Get directory of the current script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI(title="Taqreer AI API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load valuation model. Prefer XGBoost's native artifact to avoid pickle
# compatibility issues across sklearn/xgboost versions, then fall back to joblib.
MODEL_PATH = os.path.join(BASE_DIR, 'valuation_model.pkl')
MODEL_NATIVE_PATH = os.path.join(BASE_DIR, 'valuation_model.xgb.json')

def load_valuation_model():
    if os.path.exists(MODEL_NATIVE_PATH):
        try:
            native_model = xgb.XGBRegressor()
            native_model.load_model(MODEL_NATIVE_PATH)
            return native_model, os.path.basename(MODEL_NATIVE_PATH)
        except Exception as exc:
            print(f"Warning: Could not load native valuation model: {exc}")

    try:
        return joblib.load(MODEL_PATH), os.path.basename(MODEL_PATH)
    except Exception as exc:
        print(f"Warning: Could not load valuation model: {exc}")
        return None, None

model, loaded_model_artifact = load_valuation_model()

def load_artifact(filename):
    try:
        return joblib.load(os.path.join(BASE_DIR, filename))
    except Exception as exc:
        print(f"Warning: Could not load {filename}: {exc}")
        return None

le_neighborhood = load_artifact('le_neighborhood.pkl')
le_type = load_artifact('le_type.pkl')
le_plan = load_artifact('le_plan.pkl')

try:
    with open(os.path.join(BASE_DIR, 'plan_defaults.json'), 'r', encoding='utf-8') as f:
        plan_defaults = json.load(f)
except Exception as exc:
    print(f"Warning: Could not load plan_defaults.json: {exc}")
    plan_defaults = {}

try:
    with open(os.path.join(BASE_DIR, 'prediction_stats.json'), 'r', encoding='utf-8') as f:
        prediction_stats = json.load(f)
except Exception as exc:
    print(f"Warning: Could not load prediction_stats.json: {exc}")
    prediction_stats = {}

MARKET_DATA_PATH = os.path.join(BASE_DIR, 'muasher_full_data.csv')
market_data_cache = None

def load_market_data():
    global market_data_cache
    if market_data_cache is not None:
        return market_data_cache.copy()

    df = pd.read_csv(MARKET_DATA_PATH)
    if len(df.columns) < 12:
        raise ValueError("Expected at least 12 columns in muasher_full_data.csv")

    df = df.rename(
        columns={
            df.columns[0]: "date",
            df.columns[3]: "city",
            df.columns[4]: "region",
            df.columns[5]: "plan",
            df.columns[7]: "total_price",
            df.columns[8]: "district",
            df.columns[9]: "property_type",
            df.columns[10]: "area_sqm",
            df.columns[11]: "price_per_sqm",
        }
    )
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["area_sqm"] = pd.to_numeric(df["area_sqm"], errors="coerce")
    df["price_per_sqm"] = pd.to_numeric(df["price_per_sqm"], errors="coerce")
    df["total_price"] = pd.to_numeric(df["total_price"], errors="coerce")
    df = df.dropna(subset=["date", "district", "property_type", "area_sqm", "price_per_sqm"])
    df = df[(df["area_sqm"] > 0) & (df["price_per_sqm"] > 0)]
    market_data_cache = df
    return df.copy()

def finite_number(value, default=0):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if not np.isfinite(number):
        return default
    return number

def round_number(value, digits=2):
    return round(finite_number(value), digits)

def summarize_market_slice(df):
    if df.empty:
        return {
            "avg_price_per_meter": 0,
            "median_price_per_meter": 0,
            "min_price_per_meter": 0,
            "max_price_per_meter": 0,
            "total_transactions": 0,
            "total_neighborhoods": 0,
            "total_area_sqm": 0,
            "total_value": 0,
        }

    total_value = df["total_price"].fillna(df["area_sqm"] * df["price_per_sqm"]).sum()
    return {
        "avg_price_per_meter": round_number(df["price_per_sqm"].mean()),
        "median_price_per_meter": round_number(df["price_per_sqm"].median()),
        "min_price_per_meter": round_number(df["price_per_sqm"].min()),
        "max_price_per_meter": round_number(df["price_per_sqm"].max()),
        "total_transactions": int(len(df)),
        "total_neighborhoods": int(df["district"].nunique()),
        "total_area_sqm": round_number(df["area_sqm"].sum()),
        "total_value": round_number(total_value),
    }

def top_group_records(df, group_field, metric_field, limit=10):
    if df.empty:
        return []

    grouped = (
        df.groupby(group_field)
        .agg(
            avg_price_per_meter=("price_per_sqm", "mean"),
            median_price_per_meter=("price_per_sqm", "median"),
            total_transactions=("price_per_sqm", "size"),
            total_area_sqm=("area_sqm", "sum"),
        )
        .reset_index()
        .sort_values(metric_field, ascending=False)
        .head(limit)
    )

    records = []
    for row in grouped.to_dict(orient="records"):
        records.append({
            group_field: row[group_field],
            "avg_price_per_meter": round_number(row["avg_price_per_meter"]),
            "median_price_per_meter": round_number(row["median_price_per_meter"]),
            "total_transactions": int(row["total_transactions"]),
            "total_area_sqm": round_number(row["total_area_sqm"]),
        })
    return records

def build_predict_market_context(request, estimated_price_per_sqm):
    try:
        df = load_market_data()
    except Exception:
        return None

    scoped = df[
        (df["city"] == request.city)
        & (df["district"] == request.district)
        & (df["property_type"] == request.property_type)
    ]
    fallback = df[
        (df["city"] == request.city)
        & (df["district"] == request.district)
    ]
    records = scoped if not scoped.empty else fallback
    summary = summarize_market_slice(records)

    district_median = summary["median_price_per_meter"]
    if district_median > 0:
        model_vs_market_pct = ((estimated_price_per_sqm - district_median) / district_median) * 100
    else:
        model_vs_market_pct = 0

    latest_date = df["date"].max()
    return {
        "city": request.city,
        "district": request.district,
        "property_type": request.property_type,
        "transactions_count": summary["total_transactions"],
        "district_avg_price_per_sqm": summary["avg_price_per_meter"],
        "district_median_price_per_sqm": summary["median_price_per_meter"],
        "district_min_price_per_sqm": summary["min_price_per_meter"],
        "district_max_price_per_sqm": summary["max_price_per_meter"],
        "model_vs_market_median_percentage": round_number(model_vs_market_pct),
        "data_date_min": df["date"].min().date().isoformat() if not df.empty else None,
        "data_date_max": latest_date.date().isoformat() if not df.empty and pd.notna(latest_date) else None,
    }

def build_predict_agent_advice(request, estimated_total_price, fair_min, fair_max, confidence, growth_rate_pct):
    asking_price = request.asking_price
    if asking_price is None or asking_price <= 0:
        return {
            "market_position": "Unknown",
            "recommendation": "Request asking price",
            "decision_summary": "No asking price was provided, so the API can estimate value but cannot judge whether the deal is attractive.",
            "suggested_offer_min": round(fair_min),
            "suggested_offer_max": round(fair_max),
            "walk_away_price": round(fair_max),
            "next_actions": [
                "Ask the seller or broker for an official asking price.",
                "Verify zoning, street width, frontage, and parcel constraints.",
                "Review the closest recent comparable land transactions before making an offer.",
            ],
        }

    over_under_pct = ((asking_price - estimated_total_price) / estimated_total_price) * 100 if estimated_total_price > 0 else 0
    if asking_price > fair_max:
        market_position = "Overpriced"
        recommendation = "Negotiate"
        decision_summary = f"Asking price is {round(abs(over_under_pct), 1)}% above the central estimate; negotiate before proceeding."
        offer_max = min(fair_max, estimated_total_price * 1.02)
    elif asking_price < fair_min:
        market_position = "Undervalued"
        recommendation = "Buy if due diligence passes"
        decision_summary = f"Asking price is {round(abs(over_under_pct), 1)}% below the central estimate; validate risks quickly."
        offer_max = min(fair_max, asking_price * 1.03)
    else:
        market_position = "Fair"
        recommendation = "Proceed with diligence"
        decision_summary = "Asking price is inside the estimated fair range; focus on evidence and transaction terms."
        offer_max = asking_price

    next_actions = [
        "Compare against the latest similar land transactions in the same district.",
        "Confirm title, plan, parcel number, zoning, street width, and access before committing.",
        "Use the fair range as the negotiation anchor rather than the asking price.",
    ]
    if confidence != "High":
        next_actions.append("Request additional evidence because model confidence is not high.")
    if growth_rate_pct < 0:
        next_actions.append("Treat the one-year forecast cautiously because the growth reference is negative.")

    return {
        "market_position": market_position,
        "recommendation": recommendation,
        "decision_summary": decision_summary,
        "asking_price": round_number(asking_price),
        "over_under_percentage": round_number(over_under_pct, 1),
        "suggested_offer_min": round(max(0, fair_min * 0.96)),
        "suggested_offer_max": round(max(0, offer_max)),
        "walk_away_price": round(fair_max),
        "next_actions": next_actions,
    }

def build_predict_methodology(request, valuation_date, market_context, confidence):
    comparable_count = 0
    data_date_min = None
    data_date_max = None
    if market_context:
        comparable_count = int(market_context.get("transactions_count") or 0)
        data_date_min = market_context.get("data_date_min")
        data_date_max = market_context.get("data_date_max")

    confidence_rationale = (
        "High confidence because the submitted district and property type have broad transaction evidence."
        if confidence == "High" and comparable_count >= 20
        else "Moderate confidence because the estimate depends on available district-level transaction evidence."
        if confidence == "Medium"
        else "Low confidence because one or more inputs, encoders, or comparable evidence are limited."
    )

    return {
        "basis_of_value": "Market Value",
        "valuation_date": valuation_date,
        "reporting_standard_reference": "TAQEEM-aligned decision-support workflow using IVS-style valuation concepts; not an accredited valuation unless reviewed and signed by a licensed valuer.",
        "primary_approach": "Market Approach",
        "supporting_approaches": ["Model Estimate", "Statistical Market Check"],
        "intended_use": "purchase decision support",
        "scope_of_work": f"Automated desktop valuation for {request.property_type} in {request.district}, {request.city}. The workflow estimates current value, one-year forecast, market context, and negotiation guidance from available transaction evidence.",
        "inspection_status": "No physical inspection was performed by the platform.",
        "data_cutoff": data_date_max,
        "data_period": {
            "from": data_date_min,
            "to": data_date_max,
        },
        "confidence_rationale": confidence_rationale,
        "assumptions": [
            "Submitted property attributes are accurate and complete.",
            "Available transaction records are relevant market evidence after cleaning and filtering.",
            "No independent legal, title, environmental, survey, or engineering inspection was performed.",
            "The one-year forecast is directional and not a guaranteed appreciation figure.",
        ],
        "limiting_conditions": [
            "This is an AI decision-support estimate, not an accredited valuation report by itself.",
            "Regulatory, lending, litigation, or formal reporting use requires review by an accredited valuer.",
            "Missing parcel coordinates, street attributes, or sparse comparable evidence may reduce reliability.",
        ],
    }

def safe_encode(encoder, value, field_name, warnings):
    if encoder is None:
        warnings.append(f"{field_name} encoder is unavailable; using encoded value 0.")
        return 0, None

    normalized = value if value not in [None, ""] else None
    classes = list(getattr(encoder, 'classes_', []))
    if normalized in classes:
        return int(encoder.transform([normalized])[0]), normalized

    fallback = classes[0] if classes else None
    if fallback is None:
        warnings.append(f"{field_name} encoder has no classes; using encoded value 0.")
        return 0, None

    warnings.append(f"Unknown {field_name} '{value}'. Used fallback label '{fallback}'.")
    return int(encoder.transform([fallback])[0]), fallback

def get_plan_for_district(district, fallback_district, warnings):
    plan = plan_defaults.get(district) or plan_defaults.get(fallback_district)
    if plan:
        return plan

    if le_plan is not None and len(getattr(le_plan, 'classes_', [])) > 0:
        fallback_plan = le_plan.classes_[0]
        warnings.append(f"No default plan found for district '{district}'. Used fallback plan '{fallback_plan}'.")
        return fallback_plan

    warnings.append("No plan encoder/default was available; using encoded plan value 0.")
    return None

@app.get("/")
async def root():
    return {"message": "مرحباً بك في تقرير AI - محرك الاستخبارات العقارية المتوافق مع TAQEEM", "version": "3.0"}

@app.get("/neighborhoods")
async def get_neighborhoods_list():
    from regulations_engine import JEDDAH_REGULATIONS
    names = [k for k in JEDDAH_REGULATIONS.keys() if not k.startswith("_")]
    return {"neighborhoods": sorted(names)}

@app.get("/property-types")
async def get_property_types():
    return {"property_types": ["قطعة أرض", "شقة", "فيلا", "عمارة"]}

@app.get("/market-stats")
async def get_market_stats(
    city: Optional[str] = None,
    district: Optional[str] = None,
    property_type: Optional[str] = None,
):
    try:
        df = load_market_data()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not load market data: {exc}")

    filtered = df
    if city:
        filtered = filtered[filtered["city"] == city]
    if district:
        filtered = filtered[filtered["district"] == district]
    if property_type:
        filtered = filtered[filtered["property_type"] == property_type]

    latest_date = df["date"].max()
    if pd.notna(latest_date):
        latest_12_months = df[df["date"] >= latest_date - pd.DateOffset(months=12)]
        latest_filtered = filtered[filtered["date"] >= latest_date - pd.DateOffset(months=12)]
    else:
        latest_12_months = df.iloc[0:0]
        latest_filtered = filtered.iloc[0:0]

    growth_rate = prediction_stats.get("global_annual_growth_rate", 0)
    if district:
        growth_rate = prediction_stats.get("neighborhood_growth_rates", {}).get(district, growth_rate)

    property_distribution = {
        str(key): int(value)
        for key, value in filtered["property_type"].value_counts().to_dict().items()
    }

    summary = summarize_market_slice(filtered)
    latest_summary = summarize_market_slice(latest_filtered)

    return {
        **summary,
        "annual_growth_rate": round_number(finite_number(growth_rate) * 100),
        "property_type_distribution": property_distribution,
        "filters": {
            "city": city,
            "district": district,
            "property_type": property_type,
        },
        "data_coverage": {
            "source_file": os.path.basename(MARKET_DATA_PATH),
            "date_min": df["date"].min().date().isoformat() if not df.empty else None,
            "date_max": latest_date.date().isoformat() if not df.empty and pd.notna(latest_date) else None,
            "rows": int(len(df)),
            "latest_12_months_rows": int(len(latest_12_months)),
        },
        "latest_12_months": latest_summary,
        "top_neighborhoods_by_price": top_group_records(filtered, "district", "avg_price_per_meter", limit=10),
        "top_neighborhoods_by_transactions": top_group_records(filtered, "district", "total_transactions", limit=10),
    }

class ValuationRequest(BaseModel):
    neighborhood: str
    property_type: str
    area: float
    usage: str = "residential"
    finish_level: str = "تشطيب_متوسط"
    lat: float = 21.5433
    lng: float = 39.1925
    asking_price: Optional[float] = None
    
    # New TAQEEM parameters
    purpose: Optional[str] = "purchase"
    ownership: Optional[str] = "absolute"
    terrain: Optional[str] = "flat"
    frontage: Optional[str] = "east"
    building_age: Optional[float] = 0.0
    maintenance: Optional[str] = "good"
    accessibility: Optional[str] = "main_street"
    is_corner: Optional[bool] = False
    street_width: Optional[float] = 15.0

class PredictRequest(BaseModel):
    city: str = "جدة"
    district: str
    property_type: str
    land_use: Optional[str] = None
    area_sqm: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    street_width: Optional[float] = None
    is_corner: Optional[bool] = False
    asking_price: Optional[float] = None

@app.post("/predict")
async def predict(request: PredictRequest):
    warnings = []

    if model is None:
        raise HTTPException(status_code=503, detail="Valuation model is not loaded")

    if request.area_sqm <= 0:
        raise HTTPException(status_code=400, detail="area_sqm must be greater than zero")

    if request.land_use is None:
        warnings.append("land_use was not provided; the current model does not use land_use directly.")
    if request.latitude is None or request.longitude is None:
        warnings.append("latitude/longitude were not provided; the current model is district-based and does not use coordinates directly.")
    if request.street_width is None:
        warnings.append("street_width was not provided; the current model does not use street width directly.")

    neighborhood_encoded, fallback_district = safe_encode(le_neighborhood, request.district, "district", warnings)
    type_encoded, _ = safe_encode(le_type, request.property_type, "property_type", warnings)
    plan_value = get_plan_for_district(request.district, fallback_district, warnings)
    plan_encoded, _ = safe_encode(le_plan, plan_value, "plan", warnings)

    now = datetime.utcnow()
    features = np.array([[
        neighborhood_encoded,
        type_encoded,
        float(request.area_sqm),
        plan_encoded,
        now.year,
        now.month,
    ]])

    try:
        predicted = float(model.predict(features)[0])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {exc}")

    estimated_price_per_sqm = max(0, round(predicted, 2))
    estimated_total_price = round(estimated_price_per_sqm * request.area_sqm, 2)
    range_factor = 0.18 if warnings else 0.12

    confidence = "High"
    if len(warnings) >= 3:
        confidence = "Low"
    elif warnings:
        confidence = "Medium"

    growth_rates = prediction_stats.get("neighborhood_growth_rates", {})
    growth_rate = growth_rates.get(request.district)
    if growth_rate is None and fallback_district:
        growth_rate = growth_rates.get(fallback_district)
    if growth_rate is None:
        growth_rate = prediction_stats.get("global_annual_growth_rate", 0.035)
        warnings.append("District growth rate was unavailable; used global market growth reference.")
    if growth_rate is not None:
        warnings.append(f"District annual growth reference: {round(float(growth_rate) * 100, 2)}%.")

    annual_growth_rate_percentage = round(float(growth_rate) * 100, 2)
    one_year_forecast_price = round(estimated_total_price * (1 + annual_growth_rate_percentage / 100), 2)
    fair_range_min = round(estimated_total_price * (1 - range_factor), 2)
    fair_range_max = round(estimated_total_price * (1 + range_factor), 2)
    market_context = build_predict_market_context(request, estimated_price_per_sqm)
    agent_advice = build_predict_agent_advice(
        request,
        estimated_total_price,
        fair_range_min,
        fair_range_max,
        confidence,
        annual_growth_rate_percentage,
    )
    methodology = build_predict_methodology(
        request,
        now.date().isoformat(),
        market_context,
        confidence,
    )

    return {
        "estimated_price_per_sqm": estimated_price_per_sqm,
        "estimated_total_price": estimated_total_price,
        "fair_range_min": fair_range_min,
        "fair_range_max": fair_range_max,
        "confidence": confidence,
        "model_version": "xgboost-valuation-v1",
        "model_artifact": loaded_model_artifact,
        "valuation_date": now.date().isoformat(),
        "annual_growth_rate_percentage": annual_growth_rate_percentage,
        "one_year_forecast_price": one_year_forecast_price,
        "market_context": market_context,
        "agent_advice": agent_advice,
        "methodology": methodology,
        "warnings": warnings,
    }

@app.post("/quick-analysis")
async def quick_analysis(request: ValuationRequest):
    regulations = get_regulations(request.neighborhood, request.usage)
    potential = calculate_building_potential(request.area, regulations)
    
    est_price_per_meter = 2500
    if request.neighborhood in ["الشاطئ", "البساتين"]: est_price_per_meter = 6000
    elif request.neighborhood in ["الرويس", "الزهراء"]: est_price_per_meter = 4500
    
    land_value = request.area * est_price_per_meter
    
    return {
        "neighborhood": request.neighborhood,
        "estimated_land_value": land_value,
        "max_floors": regulations["max_floors"],
        "best_use": "سكني" if request.usage == "residential" else "تجاري",
        "expected_roi": 8.5
    }

@app.post("/full-report")
async def generate_full_report(request: ValuationRequest):
    try:
        # 1. استخراج اشتراطات البناء وإمكانية التطوير
        regulations = get_regulations(request.neighborhood, request.usage)
        potential = calculate_building_potential(request.area, regulations)

        # 2. الحصول على معدل النمو لظروف السوق
        growth_rates = prediction_stats.get("neighborhood_growth_rates", {})
        growth_rate = growth_rates.get(request.neighborhood, 0.06)
        growth_rate_pct = growth_rate * 100 if abs(growth_rate) < 1.0 else growth_rate

        # 3. البحث عن المقارنات الحقيقية في قاعدة البيانات
        comparables_raw = ComparableSearch.search_comparables(
            neighborhood=request.neighborhood,
            property_type=request.property_type,
            subject_area=request.area,
            limit=3
        )

        # 4. حساب التسويات والموائمة (Market Approach Adjustments)
        subject_dict = {
            "valuation_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "property_type": request.property_type,
            "area": request.area,
            "ownership": request.ownership,
            "is_corner": request.is_corner,
            "frontage": request.frontage,
            "street_width": request.street_width,
            "terrain": request.terrain,
            "building_age": request.building_age,
            "maintenance": request.maintenance
        }

        comparables_with_adjustments = []
        total_similarity = 0.0
        adjusted_prices_weighted_sum = 0.0

        for comp in comparables_raw:
            adj_res = AdjustmentEngine.compute_adjustments(subject_dict, comp, growth_rate)
            if adj_res is None:
                continue
            
            # حساب سكور التشابه
            dist_km = comp.get("distance_km", 1.0)
            area_ratio = abs(request.area - comp.get("area", request.area)) / request.area
            net_adj = adj_res.net_adjustment
            
            similarity = 1.0 / (1.0 + (dist_km * 0.2) + (area_ratio * 0.3) + (abs(net_adj) * 0.5))
            total_similarity += similarity
            
            comparables_with_adjustments.append({
                "comp_data": comp,
                "adjustment_details": adj_res.to_dict(),
                "similarity": similarity
            })

        # حساب سعر المتر المرجح
        if total_similarity > 0:
            for item in comparables_with_adjustments:
                weight = item["similarity"] / total_similarity
                item["weight_percent"] = round(weight * 100, 2)
                adjusted_prices_weighted_sum += item["adjustment_details"]["adjusted_price_per_sqm"] * weight
            price_per_meter = round(adjusted_prices_weighted_sum)
        else:
            price_per_meter = 3500
            if request.neighborhood in ["الشاطئ", "البساتين", "المرجان"]: price_per_meter = 7200
            elif request.neighborhood in ["الرويس", "الزهراء", "الروضة"]: price_per_meter = 5400

        total_current_price = round(price_per_meter * request.area)

        # 5. حساب أسلوب التكلفة مع الإهلاك (Cost Approach)
        cost_approach_result = None
        if request.property_type != "قطعة أرض":
            built_area = potential.get("total_built_area_sqm", request.area * 1.8)
            cost_per_sqm_const = CONSTRUCTION_COSTS.get(
                request.finish_level, {"cost_per_sqm": 2500}
            )["cost_per_sqm"]
            cost_approach_result = CostApproachEngine.evaluate(
                land_area=request.area,
                land_price_per_sqm=price_per_meter * 0.7,  # تقديري لقيمة الأرض المنفصلة
                building_area=built_area,
                cost_per_sqm=cost_per_sqm_const,
                building_age=request.building_age,
                maintenance_condition=request.maintenance
            )

        # 6. السيولة العقارية للحي
        liquidity_levels = {
            "الرويس": {"status": "Hot", "label": "سيولة عالية جداً", "speed": "1-2 Months", "color": "red"},
            "الشاطئ": {"status": "Stable", "label": "سوق مستقر", "speed": "3-4 Months", "color": "blue"},
            "الصفا": {"status": "Active", "label": "نشاط مرتفع", "speed": "2-3 Months", "color": "orange"},
            "_default": {"status": "Normal", "label": "نشاط اعتيادي", "speed": "4-6 Months", "color": "slate"}
        }
        market_liquidity = liquidity_levels.get(request.neighborhood, liquidity_levels["_default"])

        valuation = {
            "neighborhood": request.neighborhood,
            "property_type": request.property_type,
            "area": request.area,
            "current_price_per_meter": price_per_meter,
            "total_current_price": total_current_price,
            "annual_growth_rate_percentage": round(growth_rate_pct, 2),
            "total_predicted_price_1year": round(total_current_price * (1 + growth_rate_pct / 100)),
            "market_min_price_per_meter": round(price_per_meter * 0.88),
            "market_max_price_per_meter": round(price_per_meter * 1.15),
            "liquidity": market_liquidity,
            "market_insight": f"يشهد حي {request.neighborhood} زخماً قوياً في حركة التداول العقاري، مع توجه واضح نحو المشاريع النوعية ذات الكثافة البنائية العالية وفقاً لمعايير التقييم العقاري المعتمدة.",
            "purpose": request.purpose,
            "valuation_method": "market_approach" if request.property_type == "قطعة أرض" else "cost_approach"
        }

        # 7. دراسة الجدوى المالية المحدثة
        feasibility = calculate_feasibility(
            land_area_sqm=request.area,
            land_price_per_sqm=price_per_meter,
            total_built_area_sqm=potential["total_built_area_sqm"],
            neighborhood=request.neighborhood,
            finish_level=request.finish_level,
            asking_price=request.asking_price,
            estimated_price=total_current_price
        )

        # صياغة المقارنات للتوافق التام مع الواجهة القديمة والجديدة
        comparables_old_format = []
        for idx, item in enumerate(comparables_with_adjustments[:3]):
            comp_data = item["comp_data"]
            comparables_old_format.append({
                "name": comp_data["name"],
                "distance": f"{comp_data['distance_km']}km",
                "price_sqm": comp_data["price_per_sqm"],
                "occupancy": "95%" if idx == 0 else "88%" if idx == 1 else "100%",
                "rent": round(feasibility["revenue"]["rental_rate_per_sqm"] * (1.1 if idx == 0 else 0.9 if idx == 1 else 1.2)),
                "date": comp_data["date"],
                "district": comp_data["district"],
                "area": comp_data["area"],
                "total_price": comp_data["total_price"]
            })

        # ترتيب الأحياء
        district_rankings = [
            {"neighborhood": "الشاطئ", "score": 9.2, "trend": "up"},
            {"neighborhood": "الرويس", "score": 8.5, "trend": "up"},
            {"neighborhood": "الزهراء", "score": 8.1, "trend": "stable"},
            {"neighborhood": "المحمدية", "score": 7.9, "trend": "stable"},
            {"neighborhood": "الصفا", "score": 6.5, "trend": "down"},
        ]
        current_rank = next((d for d in district_rankings if d["neighborhood"] == request.neighborhood), {"neighborhood": request.neighborhood, "score": 7.2, "trend": "stable"})

        # ميزات جغرافية
        spatial_features = SpatialFeatures.get_spatial_features(request.lat, request.lng)

        report_data = {
            "neighborhood": request.neighborhood,
            "area": request.area,
            "valuation": valuation,
            "regulations": regulations,
            "building_potential": potential,
            "feasibility": feasibility,
            "comparables": comparables_old_format,
            "comparables_adjustments_table": comparables_with_adjustments,
            "cost_approach": cost_approach_result,
            "spatial_features": spatial_features,
            "location": {
                "lat": request.lat,
                "lng": request.lng
            },
            "ranking": {
                "current": current_rank,
                "leaderboard": district_rankings[:3]
            }
        }

        ai_analysis = AIAnalysisEngine.get_full_analysis(report_data)

        return {
            **report_data,
            "ai_analysis": ai_analysis
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error generating report: {error_details}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

class ChatAgentRequest(BaseModel):
    report_data: Dict[str, Any]
    message: str
    history: Optional[List[Dict[str, str]]] = []

@app.post("/agent-chat")
async def agent_chat(request: ChatAgentRequest):
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return {"response": "عذراً، مفتاح GEMINI_API_KEY غير مكوّن في ملف البيئة .env. يرجى تهيئته للإجابة على استفساراتك عقارياً."}

    rd = request.report_data
    val = rd.get("valuation", {})
    feas = rd.get("feasibility", {})
    regs = rd.get("regulations", {})
    pot = rd.get("building_potential", {})
    
    context = {
        "neighborhood": rd.get("neighborhood"),
        "area": rd.get("area"),
        "property_type": val.get("property_type") or rd.get("property", {}).get("propertyType"),
        "current_price_per_meter": val.get("current_price_per_meter") or val.get("current_price_per_meter"),
        "total_current_price": val.get("total_current_price") or val.get("total_current_price"),
        "annual_growth_rate": val.get("annual_growth_rate_percentage"),
        "one_year_forecast": val.get("total_predicted_price_1year") or val.get("total_predicted_price_1year"),
        "recommendation": val.get("purpose") or val.get("recommendation"),
        "roi": feas.get("performance", {}).get("roi_percent"),
        "payback": feas.get("performance", {}).get("payback_years"),
        "swot": feas.get("swot", {}),
        "regulations": regs,
        "building_potential": pot
    }
    
    history_str = ""
    for turn in request.history or []:
        role = turn.get("role", "user")
        content = turn.get("content", "")
        history_str += f"{role}: {content}\n"

    prompt = f"""
    You are an expert real estate AI agent/advisor for 'Muasher AI' (مؤشر للاستشارات العقارية), certified under Saudi Authority for Accredited Valuers (TAQEEM) guidelines.
    Your goal is to assist the client in analyzing their property report, answering questions, simulating negotiations, explaining valuation rationale, or exploring feasibility.
    
    Here is the property context:
    {json.dumps(context, ensure_ascii=False, indent=2)}
    
    Chat History:
    {history_str}
    
    Current User Message: {request.message}
    
    Instructions:
    - Respond in clear, professional Arabic (العربية) with appropriate terms.
    - If the user asks why the price is high/low, explain using the comparables, cost approach, or location features.
    - Keep responses concise, helpful, and highly professional.
    - Clearly state that you are an AI assistant and that this is decision-support advice.
    """
    
    response_text = AIAnalysisEngine.generate_with_gemini(prompt, api_key)
    if not response_text:
        response_text = "عذراً، حدث خطأ أثناء الاتصال بنموذج الذكاء الاصطناعي. يرجى المحاولة مرة أخرى."
        
    return {"response": response_text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
