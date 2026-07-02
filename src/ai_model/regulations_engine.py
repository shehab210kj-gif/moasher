"""
محرك اشتراطات البناء - تقرير AI
Jeddah Building Regulations Engine

مصادر البيانات:
- كود البناء السعودي (SBC)
- اشتراطات أمانة جدة العامة
- أنظمة وزارة الشؤون البلدية والقروية
"""

# قاعدة بيانات اشتراطات البناء لأحياء جدة
# المصدر: الاشتراطات العامة لأمانة جدة + كود البناء السعودي
JEDDAH_REGULATIONS = {
    # === الاشتراطات الافتراضية (تطبق على أي حي غير مذكور) ===
    "_default_residential": {
        "zone_type": "سكني",
        "max_floors": 3,
        "max_height_meters": 12,
        "building_ratio_percent": 60,       # نسبة البناء من المساحة
        "floor_area_ratio": 1.8,            # معامل البناء FAR
        "front_setback_meters": 2,
        "side_setback_meters": 1.5,
        "rear_setback_meters": 2,
        "min_parking_per_unit": 1,
        "min_lot_area_sqm": 200,
        "max_lot_coverage_percent": 70,     # الحد الأقصى لتغطية الأرض (أرضي)
        "basement_allowed": True,
        "mezzanine_allowed": True,
        "rooftop_usage_percent": 30,
        "notes": "اشتراطات سكنية عامة - كود البناء السعودي"
    },
    "_default_commercial": {
        "zone_type": "تجاري",
        "max_floors": 5,
        "max_height_meters": 20,
        "building_ratio_percent": 70,
        "floor_area_ratio": 3.5,
        "front_setback_meters": 3,
        "side_setback_meters": 2,
        "rear_setback_meters": 2,
        "min_parking_per_unit": 2,
        "min_lot_area_sqm": 300,
        "max_lot_coverage_percent": 75,
        "basement_allowed": True,
        "mezzanine_allowed": True,
        "rooftop_usage_percent": 20,
        "notes": "اشتراطات تجارية عامة"
    },

    # === أحياء محددة (بيانات مخصصة) ===
    "الرويس": {
        "zone_type": "مختلط (سكني/تجاري) - منطقة إعادة تطوير",
        "max_floors": 7,
        "max_height_meters": 28,
        "building_ratio_percent": 65,
        "floor_area_ratio": 4.0,
        "front_setback_meters": 3,
        "side_setback_meters": 2,
        "rear_setback_meters": 2,
        "min_parking_per_unit": 1.5,
        "min_lot_area_sqm": 250,
        "max_lot_coverage_percent": 70,
        "basement_allowed": True,
        "mezzanine_allowed": True,
        "rooftop_usage_percent": 25,
        "notes": "حي الرويس منطقة إعادة تطوير - تخضع لتحديثات تنظيمية مستمرة من أمانة جدة. الأنظمة قد تتغير حسب المخطط المعتمد."
    },
    "الشاطئ": {
        "zone_type": "سكني فاخر",
        "max_floors": 4,
        "max_height_meters": 16,
        "building_ratio_percent": 50,
        "floor_area_ratio": 2.0,
        "front_setback_meters": 4,
        "side_setback_meters": 2,
        "rear_setback_meters": 3,
        "min_parking_per_unit": 2,
        "min_lot_area_sqm": 400,
        "max_lot_coverage_percent": 55,
        "basement_allowed": True,
        "mezzanine_allowed": False,
        "rooftop_usage_percent": 20,
        "notes": "منطقة فلل فاخرة - اشتراطات تصميمية مشددة"
    },
    "الحمدانية": {
        "zone_type": "سكني",
        "max_floors": 3,
        "max_height_meters": 12,
        "building_ratio_percent": 60,
        "floor_area_ratio": 1.8,
        "front_setback_meters": 2,
        "side_setback_meters": 1.5,
        "rear_setback_meters": 2,
        "min_parking_per_unit": 1,
        "min_lot_area_sqm": 200,
        "max_lot_coverage_percent": 65,
        "basement_allowed": True,
        "mezzanine_allowed": True,
        "rooftop_usage_percent": 30,
        "notes": "حي سكني شمال جدة - كثافة سكانية متوسطة"
    },
    "الزهراء": {
        "zone_type": "سكني/تجاري",
        "max_floors": 5,
        "max_height_meters": 20,
        "building_ratio_percent": 60,
        "floor_area_ratio": 3.0,
        "front_setback_meters": 3,
        "side_setback_meters": 2,
        "rear_setback_meters": 2,
        "min_parking_per_unit": 1.5,
        "min_lot_area_sqm": 250,
        "max_lot_coverage_percent": 65,
        "basement_allowed": True,
        "mezzanine_allowed": True,
        "rooftop_usage_percent": 25,
        "notes": "حي متعدد الاستخدامات وسط جدة"
    },
    "المحمدية": {
        "zone_type": "سكني راقي",
        "max_floors": 4,
        "max_height_meters": 16,
        "building_ratio_percent": 55,
        "floor_area_ratio": 2.2,
        "front_setback_meters": 3,
        "side_setback_meters": 2,
        "rear_setback_meters": 2,
        "min_parking_per_unit": 2,
        "min_lot_area_sqm": 300,
        "max_lot_coverage_percent": 60,
        "basement_allowed": True,
        "mezzanine_allowed": True,
        "rooftop_usage_percent": 25,
        "notes": "حي سكني راقي - اشتراطات تصميمية عالية"
    },
    "ابحر الشمالية": {
        "zone_type": "سكني/سياحي",
        "max_floors": 4,
        "max_height_meters": 16,
        "building_ratio_percent": 55,
        "floor_area_ratio": 2.2,
        "front_setback_meters": 3,
        "side_setback_meters": 2,
        "rear_setback_meters": 2.5,
        "min_parking_per_unit": 2,
        "min_lot_area_sqm": 350,
        "max_lot_coverage_percent": 60,
        "basement_allowed": True,
        "mezzanine_allowed": True,
        "rooftop_usage_percent": 30,
        "notes": "منطقة أبحر الشمالية - طابع سياحي وسكني فاخر"
    },
    "البساتين": {
        "zone_type": "سكني فاخر (قصور وفلل)",
        "max_floors": 2,
        "max_height_meters": 10,
        "building_ratio_percent": 45,
        "floor_area_ratio": 1.2,
        "front_setback_meters": 5,
        "side_setback_meters": 3,
        "rear_setback_meters": 4,
        "min_parking_per_unit": 3,
        "min_lot_area_sqm": 600,
        "max_lot_coverage_percent": 50,
        "basement_allowed": True,
        "mezzanine_allowed": False,
        "rooftop_usage_percent": 15,
        "notes": "منطقة سكنية منخفضة الكثافة - حي راقي جداً"
    },
    "المرجان": {
        "zone_type": "سكني/سياحي فاخر",
        "max_floors": 3,
        "max_height_meters": 12,
        "building_ratio_percent": 50,
        "floor_area_ratio": 1.5,
        "front_setback_meters": 4,
        "side_setback_meters": 2,
        "rear_setback_meters": 3,
        "min_parking_per_unit": 2,
        "min_lot_area_sqm": 500,
        "max_lot_coverage_percent": 55,
        "basement_allowed": True,
        "mezzanine_allowed": False,
        "rooftop_usage_percent": 20,
        "notes": "حي المرجان - إطلالات بحرية واشتراطات معمارية خاصة"
    },
    "الصفا": {
        "zone_type": "سكني/تجاري (كثافة عالية)",
        "max_floors": 6,
        "max_height_meters": 24,
        "building_ratio_percent": 65,
        "floor_area_ratio": 3.8,
        "front_setback_meters": 3,
        "side_setback_meters": 2,
        "rear_setback_meters": 2,
        "min_parking_per_unit": 1,
        "min_lot_area_sqm": 250,
        "max_lot_coverage_percent": 70,
        "basement_allowed": True,
        "mezzanine_allowed": True,
        "rooftop_usage_percent": 25,
        "notes": "حي الصفا - منطقة سكنية مكتظة ذات نشاط تجاري واسع"
    },
    "الروضة": {
        "zone_type": "سكني/تجاري راقي",
        "max_floors": 5,
        "max_height_meters": 20,
        "building_ratio_percent": 60,
        "floor_area_ratio": 3.2,
        "front_setback_meters": 3,
        "side_setback_meters": 2,
        "rear_setback_meters": 2,
        "min_parking_per_unit": 2,
        "min_lot_area_sqm": 400,
        "max_lot_coverage_percent": 65,
        "basement_allowed": True,
        "mezzanine_allowed": True,
        "rooftop_usage_percent": 25,
        "notes": "حي الروضة - منطقة حيوية تتطلب معايير تصميمية متميزة"
    },
}


def get_regulations(neighborhood: str, usage: str = "residential") -> dict:
    """
    استرجاع اشتراطات البناء لحي معين.
    
    Args:
        neighborhood: اسم الحي
        usage: نوع الاستخدام (residential / commercial)
    
    Returns:
        dict: اشتراطات البناء
    """
    # 1. ابحث عن بيانات مخصصة للحي
    if neighborhood in JEDDAH_REGULATIONS:
        regs = JEDDAH_REGULATIONS[neighborhood].copy()
        regs["source"] = "بيانات مخصصة للحي"
        return regs
    
    # 2. إذا الحي غير موجود، استخدم الافتراضي حسب الاستخدام
    if usage == "commercial":
        regs = JEDDAH_REGULATIONS["_default_commercial"].copy()
    else:
        regs = JEDDAH_REGULATIONS["_default_residential"].copy()
    
    regs["source"] = "اشتراطات عامة (كود البناء السعودي)"
    return regs


def calculate_building_potential(area_sqm: float, regulations: dict) -> dict:
    """
    حساب إمكانية البناء المتاحة بناءً على المساحة والأنظمة.
    
    Args:
        area_sqm: مساحة الأرض بالمتر المربع
        regulations: اشتراطات البناء
    
    Returns:
        dict: تفاصيل إمكانية البناء
    """
    building_ratio = regulations["building_ratio_percent"] / 100
    max_floors = regulations["max_floors"]
    far = regulations["floor_area_ratio"]
    
    # حساب المساحة القابلة للبناء (الدور الأرضي)
    ground_floor_area = area_sqm * building_ratio
    
    # الحد الأقصى لمساحة البناء الكلية (FAR)
    max_total_built = area_sqm * far
    
    # المساحة الفعلية المبنية (أقل قيمة بين FAR وتكرار الأدوار)
    total_built_area = min(ground_floor_area * max_floors, max_total_built)
    
    # عدد الأدوار الفعلي (قد يقل عن الأقصى بسبب FAR)
    effective_floors = min(max_floors, max_total_built / ground_floor_area) if ground_floor_area > 0 else 0
    
    # حساب عدد الوحدات التقريبي (متوسط 120م² للوحدة السكنية)
    avg_unit_size = 120
    estimated_units = int(total_built_area / avg_unit_size)
    
    # مساحة المواقف المطلوبة
    parking_required = int(estimated_units * regulations["min_parking_per_unit"])
    
    # الارتدادات تقلل من مساحة البناء الفعلية
    front = regulations["front_setback_meters"]
    side = regulations["side_setback_meters"]
    rear = regulations["rear_setback_meters"]
    
    return {
        "land_area_sqm": round(area_sqm, 1),
        "ground_floor_buildable_sqm": round(ground_floor_area, 1),
        "max_floors": max_floors,
        "effective_floors": round(effective_floors, 1),
        "total_built_area_sqm": round(total_built_area, 1),
        "floor_area_ratio": far,
        "estimated_residential_units": estimated_units,
        "parking_required": parking_required,
        "setbacks": {
            "front_m": front,
            "side_m": side,
            "rear_m": rear,
        },
        "basement_allowed": regulations.get("basement_allowed", False),
        "max_height_meters": regulations["max_height_meters"],
    }
