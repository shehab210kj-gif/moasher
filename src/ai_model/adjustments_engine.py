# -*- coding: utf-8 -*-
"""
محرك التسويات العقارية - تقرير AI
TAQEEM-Compliant Comparable Adjustments Engine
"""

from typing import Dict, Any, Optional

class AdjustmentResult:
    def __init__(self, adjustments: Dict[str, float], adjusted_price_per_sqm: float, net_adjustment: float):
        self.adjustments = adjustments
        self.adjusted_price_per_sqm = adjusted_price_per_sqm
        self.net_adjustment = net_adjustment

    def to_dict(self) -> Dict[str, Any]:
        return {
            "adjustments": {k: round(v * 100, 2) for k, v in self.adjustments.items()},
            "adjusted_price_per_sqm": round(self.adjusted_price_per_sqm, 2),
            "net_adjustment_percentage": round(self.net_adjustment * 100, 2)
        }

class AdjustmentEngine:
    """
    محرك حساب التسويات والمواءمة بين العقار المراد تقييمه والعقارات المقارنة
    يتوافق مع معايير الهيئة السعودية للمقيمين المعتمدين (تقييم) وأسلوب السوق
    """

    @staticmethod
    def calculate_time_adjustment(comp_date_str: str, subject_date_str: str, annual_growth_rate: float) -> float:
        """
        حساب تسوية ظروف السوق (التغير الزمني)
        """
        try:
            from datetime import datetime
            c_date = datetime.strptime(comp_date_str.split("T")[0], "%Y-%m-%d")
            s_date = datetime.strptime(subject_date_str.split("T")[0], "%Y-%m-%d")
            
            diff_days = (s_date - c_date).days
            diff_years = diff_days / 365.25
            
            # تسوية ظروف السوق = (1 + معدل النمو)^السنوات - 1
            adjustment = ((1 + annual_growth_rate) ** diff_years) - 1
            return max(-0.5, min(0.5, adjustment))
        except Exception:
            return 0.0

    @classmethod
    def compute_adjustments(
        cls,
        subject: Dict[str, Any],
        comparable: Dict[str, Any],
        annual_growth_rate: float = 0.06
    ) -> Optional[AdjustmentResult]:
        """
        حساب التسويات بين العقار المقيم (subject) والعقار المقارن (comparable).
        
        العقار المقارن يحتوي على:
        - price_per_sqm: سعر المتر الفعلي
        - area: المساحة بالمتر المربع
        - date: تاريخ الصفقة (YYYY-MM-DD)
        - transaction_type: نوع الصفقة (صفقة / صفقة بتمويل / صفقة بيع مرهون)
        
        العقار محل التقييم (subject) يحتوي على الخصائص المدخلة.
        """
        adjustments = {}
        comp_price_per_sqm = float(comparable.get("price_per_sqm", 0))
        if comp_price_per_sqm <= 0:
            return None

        # 1. تسوية شروط التمويل (Financing Terms)
        # الصفقات بتمويل أو مرهونة قد تحمل تضخماً طفيفاً في القيمة مقارنة بالنقدي الكاش
        tx_type = comparable.get("transaction_type", "صفقة")
        if "تمويل" in tx_type or "مرهون" in tx_type:
            # المقارن ممول (أعلى سعراً) ونريد تكييفه للـ Subject الكاش → نطرح 3%
            adjustments["financing"] = -0.03
        else:
            adjustments["financing"] = 0.0

        # 2. تسوية ظروف السوق (Market Conditions / Time)
        comp_date = comparable.get("date", "2026-01-01")
        subject_date = subject.get("valuation_date", "2026-05-31")
        adjustments["market_conditions"] = cls.calculate_time_adjustment(comp_date, subject_date, annual_growth_rate)

        # السعر بعد تسويات التمويل وظروف السوق (سعر البيع المعدل الأولي)
        base_adjusted_price = comp_price_per_sqm * (1 + adjustments["financing"] + adjustments["market_conditions"])

        # 3. تسوية الحقوق الملكية (Ownership Rights)
        # الملكية المطلقة vs المقيدة (مثل رهن أو إيجار طويل الأجل)
        sub_ownership = subject.get("ownership", "absolute")
        comp_ownership = comparable.get("ownership", "absolute")
        if sub_ownership == "absolute" and comp_ownership == "restricted":
            adjustments["ownership"] = 0.05
        elif sub_ownership == "restricted" and comp_ownership == "absolute":
            adjustments["ownership"] = -0.05
        else:
            adjustments["ownership"] = 0.0

        # 4. تسوية المساحة (Area Size / Economics of Scale)
        # القاعدة العقارية: كلما زادت المساحة قل سعر المتر
        sub_area = float(subject.get("area", 500))
        comp_area = float(comparable.get("area", 500))
        if comp_area > 0:
            ratio = sub_area / comp_area
            # إذا كان المقارن أصغر بكثير (سعر متره أعلى) نطرح تسوية، والعكس صحيح
            if ratio < 0.5: # العقار المراد تقييمه أصغر بنصف المساحة → +5%
                adjustments["area"] = 0.05
            elif ratio > 2.0: # العقار المراد تقييمه أكبر بالضعف → -5%
                adjustments["area"] = -0.05
            else:
                # علاقة مرونة لوغاريتمية بسيطة
                import math
                adjustments["area"] = max(-0.15, min(0.15, -0.08 * math.log(ratio)))
        else:
            adjustments["area"] = 0.0

        # 5. تسوية عدد الشوارع والزاوية (Corner vs Single Street)
        sub_corner = subject.get("is_corner", False)
        comp_corner = comparable.get("is_corner", False)
        if sub_corner and not comp_corner:
            # العقار المراد تقييمه زاوية والمقارن شارع واحد → نزيد 5% للمقارن ليرتفع لقيمته
            adjustments["streets"] = 0.05
        elif not sub_corner and comp_corner:
            # العقار المراد تقييمه شارع واحد والمقارن زاوية → نطرح 5% من المقارن
            adjustments["streets"] = -0.05
        else:
            adjustments["streets"] = 0.0

        # 6. تسوية اتجاه الواجهة (Frontage Orientation)
        # الواجهة الشمالية والشرقية مفضلة في المملكة على الجنوبية والغربية
        sub_frontage = subject.get("frontage", "east")
        comp_frontage = comparable.get("frontage", "east")
        
        pref = {"north": 3, "east": 3, "west": 1, "south": 0}
        sub_val = pref.get(sub_frontage, 1)
        comp_val = pref.get(comp_frontage, 1)
        
        # فرق بسيط 2% لكل مستوى أفضلية
        adjustments["frontage"] = (sub_val - comp_val) * 0.02

        # 7. تسوية سهولة الوصول وعرض الشارع (Accessibility & Street Width)
        sub_street_width = float(subject.get("street_width", 15))
        comp_street_width = float(comparable.get("street_width", 15))
        if comp_street_width > 0:
            width_diff = sub_street_width - comp_street_width
            # 1% لكل 5 أمتار فرق
            adjustments["accessibility"] = max(-0.1, min(0.1, (width_diff / 5.0) * 0.01))
        else:
            adjustments["accessibility"] = 0.0

        # 8. تسوية طبيعة الأرض (Terrain / Topography)
        sub_terrain = subject.get("terrain", "flat") # flat / depressed / elevated
        comp_terrain = comparable.get("terrain", "flat")
        
        terrain_map = {"flat": 0.0, "elevated": -0.03, "depressed": -0.06}
        sub_terr_val = terrain_map.get(sub_terrain, 0.0)
        comp_terr_val = terrain_map.get(comp_terrain, 0.0)
        
        # إذا كان subject أسوأ (منخفضة) ومقارن مستوي → نطرح تسوية
        adjustments["terrain"] = sub_terr_val - comp_terr_val

        # 9. تسوية حالة الصيانة والتشطيب وعمر المبنى (Building Age & Maintenance)
        sub_age = float(subject.get("building_age", 0))
        comp_age = float(comparable.get("building_age", 0))
        
        # تسوية عمر المبنى (فقط للعقارات المبنية)
        if subject.get("property_type") != "قطعة أرض":
            age_diff = comp_age - sub_age # إذا المقارن أقدم → نزيد قيمة المقارن
            adjustments["building_age"] = max(-0.2, min(0.2, age_diff * 0.01))
            
            # تسوية حالة الصيانة
            maintenance_map = {"excellent": 0.05, "good": 0.0, "fair": -0.05, "poor": -0.12}
            sub_maint = maintenance_map.get(subject.get("maintenance", "good"), 0.0)
            comp_maint = maintenance_map.get(comparable.get("maintenance", "good"), 0.0)
            adjustments["maintenance"] = sub_maint - comp_maint
        else:
            adjustments["building_age"] = 0.0
            adjustments["maintenance"] = 0.0

        # صافي التعديل (Net Adjustment)
        net_adjustment = sum(v for k, v in adjustments.items() if k not in ("financing", "market_conditions"))
        
        # التحقق من صلاحية المقارن: المقيّم المعتمد يستبعد العقار إذا تجاوز صافي التعديل 30-35%
        if abs(net_adjustment) > 0.35:
            # سنقوم بإرجاع النتيجة مع التنبيه بفلترة أو استبعاد العقار، ولكن لا نحذفه بالكامل ليرى المستخدم التفاصيل
            pass

        adjusted_price_per_sqm = base_adjusted_price * (1 + net_adjustment)

        return AdjustmentResult(
            adjustments=adjustments,
            adjusted_price_per_sqm=adjusted_price_per_sqm,
            net_adjustment=net_adjustment
        )
