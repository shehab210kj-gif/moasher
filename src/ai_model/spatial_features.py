# -*- coding: utf-8 -*-
"""
محرك هندسة البيانات الجغرافية - تقرير AI
Geospatial Feature Engineering Engine
"""

import math
from typing import Dict, Any

class SpatialFeatures:
    """
    محرك لحساب المسافات والميزات الجغرافية (Geospatial Features)
    لتحويل الإحداثيات (Lat/Lng) إلى ميزات رقمية مفيدة للتقييم والتنبؤ العالمي.
    """

    # إحداثيات النقاط المرجعية الرئيسية في مدينة جدة
    JEDDAH_LANDMARKS = {
        "cbd_tahlia": (21.5544, 39.1711),       # مركز الأعمال - شارع التحلية
        "coastline": (21.5433, 39.1125),        # واجهة الكورنيش البحرية
        "haramain_highway": (21.5651, 39.2222), # طريق الحرمين السريع
        "airport": (21.6796, 39.1565),           # مطار الملك عبد العزيز الدولي
        "jeddah_port": (21.4858, 39.1670)       # ميناء جدة الإسلامي
    }

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        حساب المسافة بين نقطتين بالإحداثيات الجغرافية بالكيلومتر باستخدام صيغة هافرسين
        """
        # تحويل الدرجات إلى راديان
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda / 2.0) ** 2

        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        r = 6371.0 # نصف قطر الأرض بالكيلومتر
        
        return round(r * c, 3)

    @classmethod
    def get_spatial_features(cls, lat: float, lng: float) -> Dict[str, float]:
        """
        استخراج جميع الميزات الجغرافية لنقطة معينة (Lat, Lng)
        """
        # إذا لم يتم تمرير إحداثيات صحيحة، نرجع قيم افتراضية
        if not lat or not lng or lat == 0 or lng == 0:
            return {
                "distance_to_cbd_km": 5.0,
                "distance_to_coast_km": 3.0,
                "distance_to_highway_km": 4.0,
                "distance_to_airport_km": 12.0,
                "distance_to_port_km": 10.0,
                "density_score": 5.0
            }

        features = {}
        for landmark, coords in cls.JEDDAH_LANDMARKS.items():
            dist = cls.haversine_distance(lat, lng, coords[0], coords[1])
            features[f"distance_to_{landmark.split('_')[0]}_km"] = dist

        # ميزة الكثافة الافتراضية بناءً على القرب من السنتر (CBD)
        dist_to_cbd = features.get("distance_to_cbd_km", 10.0)
        # الكثافة تقل كلما ابتعدنا عن المركز
        features["density_score"] = round(max(1.0, min(10.0, 10.0 - (dist_to_cbd / 3.0))), 1)

        return features
