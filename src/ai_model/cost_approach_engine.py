# -*- coding: utf-8 -*-
"""
محرك أسلوب التكلفة - تقرير AI
TAQEEM-Compliant Cost Approach Engine
"""

from typing import Dict, Any

class CostApproachEngine:
    """
    أسلوب التكلفة المتوافق مع الهيئة السعودية للمقيمين المعتمدين (تقييم)
    المعادلة الأساسية: القيمة الإجمالية = قيمة الأرض + (تكلفة إحلال المباني - الإهلاك المتراكم)
    """

    @staticmethod
    def evaluate(
        land_area: float,
        land_price_per_sqm: float,
        building_area: float,
        cost_per_sqm: float = 2000.0,
        building_age: float = 0.0,
        economic_life: float = 50.0,
        extended_life_years: float = 0.0,
        maintenance_condition: str = "good"
    ) -> Dict[str, Any]:
        """
        حساب قيمة العقار باستخدام أسلوب التكلفة مع تفصيل الإهلاك.
        
        المعاملات:
        - land_area: مساحة الأرض (م²)
        - land_price_per_sqm: سعر المتر التقديري للأرض (مستخرج من أسلوب السوق)
        - building_area: المساحة المبنية الإجمالية (BUA)
        - cost_per_sqm: تكلفة الإنشاء التقديرية للمتر المربع (تكلفة الاستبدال أو الإحلال)
        - building_age: العمر الفعلي للمبنى (سنوات)
        - economic_life: العمر الاقتصادي للمبنى (الافتراضي 50 سنة للمباني الخرسانية)
        - extended_life_years: سنوات العمر الممتد نتيجة الصيانة أو الترميم
        - maintenance_condition: حالة الصيانة (excellent / good / fair / poor)
        """
        # 1. حساب قيمة الأرض
        land_value = land_area * land_price_per_sqm

        # 2. حساب تكلفة المباني الجديدة (Replacement Cost New)
        replacement_cost_new = building_area * cost_per_sqm

        # 3. حساب الإهلاك المتراكم (Accrued Depreciation) باستخدام طريقة العمر الممتد (Extended Life Method)
        # العمر الممتد (الأنسب للتقييم بموجب معايير تقييم)
        total_economic_life = economic_life + extended_life_years
        
        # العمر المتبقي للمبنى
        remaining_life = max(0.0, total_economic_life - building_age)
        
        # معدل الإهلاك المادي الأساسي بطريقة العمر الممتد
        if total_economic_life > 0:
            physical_depreciation_rate = min(0.85, building_age / total_economic_life)
        else:
            physical_depreciation_rate = 0.0

        # التقادم الوظيفي بناءً على حالة الصيانة والكفاءة التشغيلية للمبنى
        functional_factors = {
            "excellent": 0.02,  # تقادم وظيفي ضئيل
            "good": 0.05,       # تقادم وظيفي خفيف
            "fair": 0.12,       # تقادم وظيفي متوسط
            "poor": 0.25        # تقادم وظيفي مرتفع نتيجة الإهمال
        }
        functional_depreciation_rate = functional_factors.get(maintenance_condition, 0.05)
        
        # التقادم الاقتصادي/الخارجي (ثابت بنسبة صغيرة كعوامل موقعية عامة)
        economic_depreciation_rate = 0.03
        
        # إجمالي معدل الإهلاك (المادي + الوظيفي + الاقتصادي)
        total_depreciation_rate = max(0.0, min(0.95, physical_depreciation_rate + functional_depreciation_rate + economic_depreciation_rate))
        
        # مبالغ الإهلاك التفصيلية
        physical_dep = replacement_cost_new * physical_depreciation_rate
        functional_dep = replacement_cost_new * functional_depreciation_rate
        economic_dep = replacement_cost_new * economic_depreciation_rate
        
        # إجمالي مبلغ الإهلاك المتراكم
        total_depreciation_amount = replacement_cost_new * total_depreciation_rate
        
        # القيمة الحالية للمباني بعد خصم الإهلاك
        depreciated_building_value = max(0.05 * replacement_cost_new, replacement_cost_new - total_depreciation_amount)

        # 4. القيمة الإجمالية للعقار
        total_property_value = land_value + depreciated_building_value

        return {
            "land_value": round(land_value),
            "replacement_cost_new": round(replacement_cost_new),
            "depreciation_rate_percent": round(total_depreciation_rate * 100, 2),
            "total_depreciation_amount": round(total_depreciation_amount),
            "depreciated_building_value": round(depreciated_building_value),
            "total_property_value": round(total_property_value),
            "depreciation_breakdown": {
                "physical": round(physical_dep),
                "functional": round(functional_dep),
                "economic": round(economic_dep)
            },
            "parameters": {
                "building_age": building_age,
                "economic_life": economic_life,
                "extended_life_years": extended_life_years,
                "total_economic_life": total_economic_life,
                "remaining_life": remaining_life,
                "cost_per_sqm": cost_per_sqm,
                "depreciation_method": "العمر الممتد (Extended Life Method)"
            }
        }
