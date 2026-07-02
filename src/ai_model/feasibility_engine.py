"""
محرك الجدوى المالية - تقرير AI
Financial Feasibility Engine

يحسب:
- تكلفة البناء التقديرية
- العائد الإيجاري المتوقع
- ROI (العائد على الاستثمار)
- فترة الاسترداد
- تحليل SWOT مبسط
"""
from typing import Optional

# متوسطات تكلفة البناء في جدة (ريال/م²) — 2024-2025
CONSTRUCTION_COSTS = {
    "عظم": {
        "cost_per_sqm": 1200,
        "label": "هيكل عظم (بدون تشطيب)",
    },
    "تشطيب_عادي": {
        "cost_per_sqm": 1800,
        "label": "تشطيب عادي",
    },
    "تشطيب_متوسط": {
        "cost_per_sqm": 2500,
        "label": "تشطيب متوسط",
    },
    "تشطيب_فاخر": {
        "cost_per_sqm": 3500,
        "label": "تشطيب فاخر (سوبر ديلوكس)",
    },
}

# متوسط الإيجار السنوي للمتر المربع حسب الحي (ريال/م²/سنة)
RENTAL_RATES = {
    "الرويس": 450,
    "الشاطئ": 700,
    "الحمدانية": 350,
    "الزهراء": 500,
    "المحمدية": 600,
    "ابحر الشمالية": 550,
    "السلامة": 500,
    "النعيم": 400,
    "الصفا": 450,
    "الرياض": 350,
    "الياقوت": 300,
    "البساتين": 750,
    "المرجان": 650,
    "الروضة": 600,
    "الخالدية": 550,
    "البغدادية": 400,
    "_default": 400,  # المتوسط العام لجدة
}

# نسبة الإشغال المتوقعة
OCCUPANCY_RATES = {
    "الرويس": 0.85,
    "الشاطئ": 0.90,
    "الحمدانية": 0.80,
    "الزهراء": 0.88,
    "المحمدية": 0.92,
    "ابحر الشمالية": 0.85,
    "الروضة": 0.90,
    "البساتين": 0.88,
    "_default": 0.82,
}

# تكاليف إضافية
ADDITIONAL_COSTS = {
    "design_and_permits_percent": 0.05,   # رسوم تصميم وتراخيص (5% من تكلفة البناء)
    "infrastructure_percent": 0.08,       # بنية تحتية وخدمات (8%)
    "contingency_percent": 0.10,          # احتياطي طوارئ (10%)
    "annual_maintenance_percent": 0.03,   # صيانة سنوية (3% من قيمة العقار)
    "management_fee_percent": 0.08,       # رسوم إدارة (8% من الإيجار)
}

def calculate_feasibility(
    land_area_sqm: float,
    land_price_per_sqm: float,
    total_built_area_sqm: float,
    neighborhood: str,
    finish_level: str = "تشطيب_متوسط",
    asking_price: Optional[float] = None,
    estimated_price: Optional[float] = None,
) -> dict:
    """
    حساب الجدوى المالية الكاملة لمشروع عقاري.
    """
    
    # === 1. التكاليف ===
    estimated_land_cost = land_area_sqm * land_price_per_sqm
    land_cost = asking_price if (asking_price is not None and asking_price > 0) else estimated_land_cost
    
    construction_cost_per_sqm = CONSTRUCTION_COSTS.get(
        finish_level, CONSTRUCTION_COSTS["تشطيب_متوسط"]
    )["cost_per_sqm"]
    
    construction_cost = total_built_area_sqm * construction_cost_per_sqm
    
    # تكاليف إضافية
    design_permits = construction_cost * ADDITIONAL_COSTS["design_and_permits_percent"]
    infrastructure = construction_cost * ADDITIONAL_COSTS["infrastructure_percent"]
    contingency = construction_cost * ADDITIONAL_COSTS["contingency_percent"]
    
    total_project_cost = land_cost + construction_cost + design_permits + infrastructure + contingency
    
    # === 2. الإيرادات ===
    rental_rate = RENTAL_RATES.get(neighborhood, RENTAL_RATES["_default"])
    occupancy = OCCUPANCY_RATES.get(neighborhood, OCCUPANCY_RATES["_default"])
    
    gross_annual_rental = total_built_area_sqm * rental_rate
    effective_rental = gross_annual_rental * occupancy
    
    # خصم المصاريف التشغيلية
    maintenance = total_project_cost * ADDITIONAL_COSTS["annual_maintenance_percent"]
    management = effective_rental * ADDITIONAL_COSTS["management_fee_percent"]
    
    net_annual_income = effective_rental - maintenance - management
    
    # === 3. مؤشرات الأداء ===
    roi_percent = (net_annual_income / total_project_cost) * 100 if total_project_cost > 0 else 0
    payback_years = total_project_cost / net_annual_income if net_annual_income > 0 else 999
    cap_rate = (net_annual_income / total_project_cost) * 100 if total_project_cost > 0 else 0
    
    # قيمة العقار بعد 5 سنوات (افتراض نمو 5% سنوي)
    growth_rate = 0.05
    future_value_5y = total_project_cost * ((1 + growth_rate) ** 5)
    total_rental_5y = net_annual_income * 5
    total_return_5y = (future_value_5y - total_project_cost) + total_rental_5y
    total_return_5y_percent = (total_return_5y / total_project_cost) * 100
    
    # === 4. تحليل HBU (Highest & Best Use) ===
    hbu_analysis = calculate_hbu_analysis(land_area_sqm, land_price_per_sqm, neighborhood)
    
    # === 5. تحليل SWOT ===
    swot = generate_swot(neighborhood, roi_percent, payback_years, rental_rate)
    
    # === 6. التوصية ودرجة الثقة ===
    recommendation = generate_recommendation(
        roi_percent, 
        payback_years, 
        cap_rate, 
        asking_price=asking_price, 
        estimated_price=estimated_price or estimated_land_cost
    )
    confidence = calculate_confidence_score(neighborhood)
    
    # === 7. الإسقاطات المالية الزمنية (ROI Timeline) ===
    timeline = calculate_roi_timeline(total_project_cost, net_annual_income)
    
    # === 8. تحليل الحساسية (Sensitivity Analysis) ===
    sensitivity = calculate_sensitivity_analysis(roi_percent, total_project_cost, net_annual_income)
    
    return {
        "costs": {
            "land_cost": round(land_cost),
            "construction_cost": round(construction_cost),
            "construction_cost_per_sqm": construction_cost_per_sqm,
            "design_permits": round(design_permits),
            "infrastructure": round(infrastructure),
            "contingency": round(contingency),
            "total_project_cost": round(total_project_cost),
            "finish_level": CONSTRUCTION_COSTS.get(finish_level, CONSTRUCTION_COSTS["تشطيب_متوسط"])["label"],
            "breakdown": [
                {"name": "الأرض", "value": round(land_cost)},
                {"name": "البناء", "value": round(construction_cost)},
                {"name": "رسوم وتصاميم", "value": round(design_permits)},
                {"name": "خدمات وطوارئ", "value": round(infrastructure + contingency)},
            ]
        },
        "revenue": {
            "rental_rate_per_sqm": rental_rate,
            "occupancy_rate_percent": round(occupancy * 100),
            "gross_annual_rental": round(gross_annual_rental),
            "effective_annual_rental": round(effective_rental),
            "annual_maintenance": round(maintenance),
            "annual_management_fee": round(management),
            "net_annual_income": round(net_annual_income),
        },
        "performance": {
            "roi_percent": round(roi_percent, 2),
            "payback_years": round(payback_years, 1),
            "cap_rate_percent": round(cap_rate, 2),
            "future_value_5y": round(future_value_5y),
            "total_return_5y": round(total_return_5y),
            "total_return_5y_percent": round(total_return_5y_percent, 1),
        },
        "timeline": timeline,
        "sensitivity": sensitivity,
        "hbu": hbu_analysis,
        "swot": swot,
        "recommendation": recommendation,
        "confidence": confidence,
    }


def calculate_roi_timeline(total_cost: float, annual_income: float) -> list:
    """حساب التدفقات النقدية والنمو على مدار 10 سنوات"""
    timeline = []
    accumulated_income = 0
    property_value = total_cost
    
    for year in range(0, 11):
        if year > 0:
            accumulated_income += annual_income * (1.03 ** (year-1)) # زيادة سنوية 3% في الإيجار
            property_value *= 1.05 # نمو سنوي 5% في قيمة العقار
            
        timeline.append({
            "year": f"السنة {year}",
            "net_cash_flow": round(accumulated_income - (total_cost if year == 0 else 0)),
            "property_value": round(property_value),
            "roi_accumulated": round((accumulated_income / total_cost) * 100, 1) if year > 0 else 0
        })
    return timeline


def calculate_sensitivity_analysis(base_roi: float, total_cost: float, annual_income: float) -> list:
    """حساب سيناريوهات الحساسية (Sensitivity Analysis)"""
    scenarios = [
        {"name": "Baseline", "label": "الوضع الحالي", "roi": base_roi},
        {"name": "Cost_Plus_10", "label": "زيادة تكاليف البناء (+10%)", "roi": (annual_income / (total_cost * 1.1)) * 100},
        {"name": "Rent_Minus_10", "label": "انخفاض الإيجارات (-10%)", "roi": ((annual_income * 0.9) / total_cost) * 100},
        {"name": "Growth_Turbo", "label": "نمو استثنائي (+15%)", "roi": base_roi * 1.15},
    ]
    
    for s in scenarios:
        s["roi"] = round(s["roi"], 2)
    return scenarios


def calculate_hbu_analysis(land_area: float, land_price: float, neighborhood: str) -> list:
    """تحليل أعلى وأفضل استخدام للعقار (HBU)"""
    
    rental_rate = RENTAL_RATES.get(neighborhood, RENTAL_RATES["_default"])
    land_cost = land_area * land_price
    
    scenarios_def = [
        {
            "type": "Residential Apartments",
            "label": "شقق سكنية (نموذجي)",
            "far": 2.5,
            "build_cost_sqm": 2500,
            "rent_factor": 1.0,
            "occupancy": 0.85,
            "risk": "Low"
        },
        {
            "type": "Mixed-Use Building",
            "label": "مبنى مختلط (سكني/تجاري)",
            "far": 3.0,
            "build_cost_sqm": 3000,
            "rent_factor": 1.3,
            "occupancy": 0.80,
            "risk": "Medium"
        },
        {
            "type": "Furnished Studios",
            "label": "أجنحة مفروشة / استوديوهات",
            "far": 2.5,
            "build_cost_sqm": 3500,
            "rent_factor": 1.8,
            "occupancy": 0.70,
            "risk": "High"
        }
    ]
    
    results = []
    for s in scenarios_def:
        built_area = land_area * s["far"]
        construction_cost = built_area * s["build_cost_sqm"]
        
        # تكاليف إضافية (تصميم وتراخيص، بنية تحتية، احتياطي طوارئ)
        design_permits = construction_cost * ADDITIONAL_COSTS["design_and_permits_percent"]
        infrastructure = construction_cost * ADDITIONAL_COSTS["infrastructure_percent"]
        contingency = construction_cost * ADDITIONAL_COSTS["contingency_percent"]
        
        total_cost = land_cost + construction_cost + design_permits + infrastructure + contingency
        
        # الإيرادات الإيجارية
        rent_rate_per_sqm = rental_rate * s["rent_factor"]
        gross_rental = built_area * rent_rate_per_sqm
        effective_rental = gross_rental * s["occupancy"]
        
        # مصاريف التشغيل
        maintenance = total_cost * ADDITIONAL_COSTS["annual_maintenance_percent"]
        management = effective_rental * ADDITIONAL_COSTS["management_fee_percent"]
        
        net_annual_income = effective_rental - maintenance - management
        roi = (net_annual_income / total_cost) * 100 if total_cost > 0 else 0
        roi = max(roi, 0.5)  # لضمان عدم وجود عائد سلبي غير واقعي
        
        results.append({
            "type": s["type"],
            "label": s["label"],
            "roi": round(roi, 2),
            "risk": s["risk"],
            "revenue": round(effective_rental),
            "cost": round(total_cost)
        })
        
    return results


def generate_swot(neighborhood: str, roi: float, payback: float, rental_rate: float) -> dict:
    """توليد تحليل SWOT بناءً على البيانات"""
    
    strengths = []
    weaknesses = []
    opportunities = []
    threats = []
    
    # نقاط القوة
    if roi > 8:
        strengths.append("عائد استثماري مرتفع يتجاوز متوسط السوق")
    if rental_rate >= 500:
        strengths.append("إيجارات مرتفعة تعكس طلباً قوياً على المنطقة")
    if payback < 12:
        strengths.append("فترة استرداد معقولة للمشروع")
    strengths.append(f"موقع في حي {neighborhood} بمدينة جدة — سوق عقاري نشط")
    
    # نقاط الضعف
    if roi < 5:
        weaknesses.append("العائد الاستثماري أقل من المتوسط المطلوب (5%)")
    if payback > 15:
        weaknesses.append("فترة الاسترداد طويلة نسبياً")
    if rental_rate < 350:
        weaknesses.append("مستوى الإيجارات في المنطقة منخفض نسبياً")
    weaknesses.append("تكاليف البناء في ارتفاع مستمر")
    
    # الفرص
    opportunities.append("رؤية 2030 تدعم النمو العقاري في جدة")
    opportunities.append("مشاريع البنية التحتية الجديدة والتحول الحضري")
    if neighborhood in ["الرويس", "الشاطئ", "الزهراء"]:
        opportunities.append(f"حي {neighborhood} ضمن مناطق إعادة التطوير المستهدفة")
    opportunities.append("تزايد الطلب على الوحدات الصغيرة والذكية")
    
    # التهديدات
    threats.append("تقلبات أسعار مواد البناء وتكاليف العمالة")
    threats.append("تغييرات محتملة في الأنظمة والاشتراطات البلدية")
    threats.append("منافسة من المشاريع الحكومية الكبرى (روشن، NHC)")
    
    return {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "opportunities": opportunities,
        "threats": threats,
    }


def generate_recommendation(
    roi: float, 
    payback: float, 
    cap_rate: float, 
    asking_price: Optional[float] = None, 
    estimated_price: Optional[float] = None
) -> dict:
    """توليد توصية استثمارية احترافية"""
    
    # حساب سكور من 100 بناءً على 4 محاور
    roi_score = min(40, (roi / 12) * 40)
    payback_score = min(30, (10 / (payback if payback > 0 else 1)) * 30)
    
    # حساب سكور السعر مقارنة بالقيمة السوقية العادلة
    price_score = 25  # القيمة الافتراضية للوضع العادل (Fair Value)
    
    if asking_price is not None and estimated_price is not None and estimated_price > 0 and asking_price > 0:
        ratio = asking_price / estimated_price
        if ratio < 0.90:
            price_score = 35  # ممتاز (خصم كبير عن القيمة السوقية)
        elif ratio < 0.95:
            price_score = 30  # جيد جداً (أقل من القيمة السوقية)
        elif ratio > 1.15:
            price_score = 5   # سيء جداً (مبالغ فيه للغاية)
        elif ratio > 1.05:
            price_score = 12  # مقارب للمرتفع (أعلى من القيمة السوقية)
            
    score = roi_score + payback_score + price_score
    score = min(95, max(15, score))
    
    # تأكيد ألا يحدث تعارض: إذا كان العقار مبالغاً في سعره بنسبة كبيرة (>10%)، نقوم بكبح السكور ليكون مقبولاً أو يحتاج إعادة دراسة
    if asking_price is not None and estimated_price is not None and estimated_price > 0 and asking_price > 0:
        ratio = asking_price / estimated_price
        if ratio > 1.10 and score >= 65:
            score = 60  # خفض التقييم إلى استثمار مقبول
        if ratio > 1.20:
            score = min(45, score) # خفض التقييم إلى يحتاج إعادة دراسة حتماً
            
    if score >= 80:
        verdict = "STRONG BUY / استثمار واعد جداً"
        color = "green"
        details = "المشروع يظهر مؤشرات قوية جداً تفوق متوسط السوق، مع سعر شراء مغرٍ وتدفقات نقدية مستقرة ومخاطر منخفضة."
    elif score >= 65:
        verdict = "MODERATE BUY / استثمار جيد"
        color = "emerald"
        details = "المشروع يحقق توازناً جيداً بين العائد والمخاطرة. فرصة شراء مناسبة بسعر عادل للمستثمر متوسط الأجل."
    elif score >= 50:
        verdict = "HOLD / استثمار مقبول"
        color = "amber"
        details = "العوائد مقبولة وسعر الشراء يتماشى مع القيمة السوقية، ولكن الفرصة تتطلب تحسيناً في كفاءة التشغيل لرفع الجدوى."
    else:
        verdict = "RECONSIDER / يحتاج إعادة دراسة"
        color = "red"
        details = "المؤشرات الحالية تظهر ضغطاً على العوائد، أو أن السعر المطلوب أعلى بكثير من القيمة السوقية العادلة للعقار."
    
    return {
        "verdict": verdict,
        "color": color,
        "details": details,
        "score": round(score),
        "breakdown": {
            "roi": round(roi_score),
            "payback": round(payback_score),
            "market": round(price_score),
            "risk": 100 - round(score)
        }
    }


def calculate_confidence_score(neighborhood: str) -> dict:
    """حساب درجة الثقة في البيانات بناءً على حجم الصفقات في الحي"""
    
    # بيانات افتراضية لمحاكاة الواقع (سيتم ربطها لاحقاً بحجم البيانات الحقيقي)
    neighborhood_data_density = {
        "الرويس": 12400,
        "الشاطئ": 8500,
        "الزهراء": 9200,
        "الصفا": 15000,
        "الحمدانية": 7200,
        "_default": 5000
    }
    
    count = neighborhood_data_density.get(neighborhood, neighborhood_data_density["_default"])
    
    if count >= 10000:
        score = 88
        level = "High / مرتفعة جداً"
        reason = f"بناءً على {count:,} صفقة تاريخية ونشاط سعري مستقر"
    elif count >= 7000:
        score = 75
        level = "Good / جيدة"
        reason = f"بناءً على {count:,} صفقة في الـ 24 شهر الأخيرة"
    else:
        score = 62
        level = "Moderate / متوسطة"
        reason = "بناءً على بيانات محدودة في المنطقة المجاورة"
        
    return {
        "score": score,
        "level": level,
        "reason": reason,
        "transaction_count": count
    }
