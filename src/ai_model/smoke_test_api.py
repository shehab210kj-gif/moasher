import os
import sys
import asyncio

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from muasher_api import PredictRequest, get_market_stats, predict  # noqa: E402


def assert_number(payload, key):
    value = payload.get(key)
    assert isinstance(value, (int, float)), f"{key} must be numeric, got {type(value).__name__}"
    assert value >= 0, f"{key} must be non-negative, got {value}"
    return value


async def test_predict_endpoint():
    payload = await predict(
        PredictRequest(
            city="جدة",
            district="الروضة",
            property_type="قطعة أرض",
            land_use="سكني",
            area_sqm=600,
            latitude=21.55,
            longitude=39.17,
            street_width=20,
            is_corner=False,
            asking_price=2_000_000,
        )
    )

    current_price = assert_number(payload, "estimated_total_price")
    assert_number(payload, "estimated_price_per_sqm")
    assert_number(payload, "fair_range_min")
    assert_number(payload, "fair_range_max")
    forecast_price = assert_number(payload, "one_year_forecast_price")
    growth_rate = payload.get("annual_growth_rate_percentage")
    market_context = payload.get("market_context")
    agent_advice = payload.get("agent_advice")
    methodology = payload.get("methodology")

    assert payload.get("confidence") in {"Low", "Medium", "High"}
    assert payload.get("model_version") == "xgboost-valuation-v1"
    assert payload.get("model_artifact") == "valuation_model.xgb.json"
    assert isinstance(payload.get("valuation_date"), str)
    assert isinstance(payload.get("warnings"), list)
    assert isinstance(growth_rate, (int, float))
    assert -20 <= growth_rate <= 30
    assert forecast_price > 0
    assert current_price > 0
    assert isinstance(market_context, dict)
    assert market_context.get("transactions_count", 0) > 0
    assert isinstance(agent_advice, dict)
    assert agent_advice.get("market_position") in {"Unknown", "Overpriced", "Undervalued", "Fair"}
    assert isinstance(agent_advice.get("next_actions"), list)
    assert agent_advice["next_actions"], "agent advice must include next actions"
    assert isinstance(methodology, dict)
    assert methodology.get("basis_of_value") == "Market Value"
    assert methodology.get("primary_approach") == "Market Approach"
    assert isinstance(methodology.get("assumptions"), list)
    assert isinstance(methodology.get("limiting_conditions"), list)


async def test_market_stats_endpoint():
    payload = await get_market_stats()

    assert_number(payload, "avg_price_per_meter")
    assert_number(payload, "median_price_per_meter")
    assert_number(payload, "total_transactions")
    assert_number(payload, "total_neighborhoods")
    assert_number(payload, "annual_growth_rate")

    assert payload["total_transactions"] > 0
    assert payload["total_neighborhoods"] > 0
    assert isinstance(payload.get("property_type_distribution"), dict)
    assert payload["property_type_distribution"], "property_type_distribution must not be empty"

    coverage = payload.get("data_coverage")
    assert isinstance(coverage, dict)
    assert coverage.get("source_file") == "muasher_full_data.csv"
    assert coverage.get("rows", 0) >= payload["total_transactions"]
    assert isinstance(payload.get("top_neighborhoods_by_price"), list)
    assert isinstance(payload.get("top_neighborhoods_by_transactions"), list)


if __name__ == "__main__":
    asyncio.run(test_predict_endpoint())
    asyncio.run(test_market_stats_endpoint())
    print("API smoke test passed: /predict returns valuation, forecast, market context, agent advice, methodology; /market-stats returns market intelligence.")
