# -*- coding: utf-8 -*-
import os
import json
import urllib.request
import re
from datetime import datetime

def load_env_file():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    for _ in range(5):
        env_path = os.path.join(current_dir, '.env')
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, val = line.split('=', 1)
                            key = key.strip()
                            val = val.strip()
                            if val.startswith(('"', "'")) and val.endswith(('"', "'")):
                                val = val[1:-1]
                            if key and key not in os.environ:
                                os.environ[key] = val
                break
            except Exception as e:
                print(f"Warning: Failed to load .env from {env_path}: {e}")
        current_dir = os.path.dirname(current_dir)

load_env_file()

class AIAnalysisEngine:
    @staticmethod
    def generate_with_gemini(prompt: str, api_key: str) -> str:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            body = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 800
                }
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(body).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                return text
        except Exception as exc:
            print(f"Warning: Gemini API request failed: {exc}. Falling back to rule-based generation.")
            return None

    @staticmethod
    def get_full_analysis(data: dict) -> dict:
        neighborhood = data.get("neighborhood", "المنطقة")
        valuation = data.get("valuation", {})
        feasibility = data.get("feasibility", {})
        ranking = data.get("ranking", {})
        building_potential = data.get("building_potential", {})
        
        recommendation_data = feasibility.get("recommendation", {})
        score = recommendation_data.get("score", 70)
        roi = feasibility.get("performance", {}).get("roi_percent", 0.0)
        payback = feasibility.get("performance", {}).get("payback_years", 0.0)
        
        prop_type = valuation.get("property_type", "عقار")
        area = data.get("area", 0.0)
        est_price = valuation.get("total_current_price", 0)
        price_per_m = valuation.get("current_price_per_meter", 0)
        growth_rate = valuation.get("annual_growth_rate_percentage", 6.0)

        # Check for environment key
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        
        if api_key:
            prompt = f"""
            You are a professional real estate investment advisor certified under Saudi Authority for Accredited Valuers (TAQEEM) rules.
            Construct a comprehensive, high-quality, professional investment narrative memo for the following property in Arabic.
            
            Property details:
            - Neighborhood: {neighborhood} (Jeddah, Saudi Arabia)
            - Property Type: {prop_type}
            - Land Area: {area} sqm
            - Current Valued Price: {est_price} SAR (Price/Sqm: {price_per_m} SAR/sqm)
            - Annual Neighborhood Growth: {growth_rate}%
            - Best Development Use: {feasibility.get('hbu', [{}])[0].get('label', 'N/A')}
            - Feasibility ROI: {roi}%
            - Payback Period: {payback} years
            - Investment Score: {score}/100
            
            Instructions:
            - Write a detailed Executive Summary in Arabic only. Do not output English.
            - Provide a clear recommendation verdict based on the investment score.
            - Ensure the language is formal, advisory, and tailored for real estate investment committees.
            - SPECIFICALLY: Start directly with the narrative. Do NOT include any 'MEMORANDUM', 'To:', 'From:', 'Date:', or placeholder headers like '[Your Name/Firm Name]'.
            - SPECIFICALLY: Avoid markdown headers (like # or ##) or bold markers (like **) in the text. Use plain text paragraphs and simple lists.
            - Specify that the analysis is provided by 'مؤشر للاستشارات العقارية / Muasher AI Advisory'.
            """
            
            text = AIAnalysisEngine.generate_with_gemini(prompt, api_key)
            if text:
                # Post-process to remove markdown formatting, meta headers, and placeholders
                text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # strip bold
                text = re.sub(r'\[([^\]]*)\]', r'\1', text)       # strip brackets / placeholders
                # remove typical memo headers if they are generated
                for phrase in ["MEMORANDUM", "MEMORANDUM TO:", "To: Real Estate Investment Committee", "From: Certified Real Estate Investment", "From:", "To:", "Date:", "Subject:", "Certified Real Estate Investment Advisor"]:
                    text = re.sub(phrase, "", text, flags=re.IGNORECASE)
                # Clean up multiple newlines
                text = re.sub(r'\n{3,}', '\n\n', text).strip()
                return {
                    "executive_summary": text,
                    "pestel": {
                        "السياسي (Political)": "دعم حكومي كبير لمشاريع التطوير العمراني في جدة ضمن رؤية 2030 وتنظيمات وزارة البلديات والإسكان.",
                        "الاقتصادي (Economic)": f"نمو سنوي متوقع بنسبة {growth_rate}% في قيمة الأصول العقارية بالمنطقة مع توافق أوزان المقارنات.",
                        "الاجتماعي (Social)": "تحول ديموغرافي مستمر نحو المجمعات السكنية المغلقة والوحدات الذكية.",
                        "التقني (Technological)": "اعتماد منصات PropTech للتثمين والمتابعة الجغرافية والبلدية."
                    },
                    "roadmap": [
                        {"step": "الاستحواذ والتخطيط", "action": "إنهاء إجراءات الإفراغ وبدء التصاميم المعمارية والمطابقة البلدية", "duration": "2-3 أشهر"},
                        {"step": "التراخيص والمقاولات", "action": "استخراج رخصة البناء والتعاقد مع المقاول الرئيسي", "duration": "4-5 أشهر"},
                        {"step": "التنفيذ والإنشاء", "action": "بناء الهيكل الإنشائي والتشطيبات النهائية", "duration": "12-18 شهر"},
                        {"step": "التشغيل والخروج", "action": "بدء التأجير أو عرض الوحدات للبيع النهائي", "duration": "3-6 أشهر"}
                    ],
                    "recommendation": f"الاستمرار في المشروع مع التركيز على نموذج {feasibility.get('hbu', [{}])[0].get('label', 'التطوير السكني')} لتعظيم العائد."
                }

        # Fallback dynamic rule-based narrative
        if score >= 80:
            arabic_narrative = (
                f"يمثل هذا العقار ({prop_type}) في حي {neighborhood} فرصة استثمارية من الطراز الأول (Tier 1). "
                f"بمساحة تبلغ {area:,} متر مربع وقيمة تقديرية تبلغ {est_price:,} ريال سعودي، يظهر العقار جدوى اقتصادية ممتازة "
                f"بعائد على الاستثمار المتوقع يبلغ {roi}% وفترة استرداد رأس مال تقدر بـ {payback} سنة. "
                f"يدعم هذا التقييم معدل نمو سنوي قوي للحي يبلغ {growth_rate}% ومؤشر ثقة مرتفع بناءً على الصفقات المقارنة."
            )
        elif score >= 65:
            arabic_narrative = (
                f"تعتبر فرصة الاستثمار في حي {neighborhood} واعدة ومتوازنة. "
                f"العقار ({prop_type}) بمساحة {area:,} متر مربع وقيمة تقديرية {est_price:,} ريال سعودي "
                f"يحقق عائداً متوقعاً بنسبة {roi}% خلال فترة استرداد {payback} سنة. "
                f"المنطقة تشهد نمواً عقارياً مستقراً بنسبة {growth_rate}% سنوياً، مما يجعله ملائماً للمحافظ الاستثمارية المتوسطة."
            )
        else:
            arabic_narrative = (
                f"فرصة استثمارية متحفظة في حي {neighborhood}. "
                f"العقار ({prop_type}) بمساحة {area:,} متر مربع وقيمة تقديرية {est_price:,} ريال سعودي "
                f"يحقق عائداً يبلغ {roi}% مع فترة استرداد طويلة تصل إلى {payback} سنة. "
                f"نوصي بالتفاوض لخفض سعر الشراء أو تحسين مواصفات التطوير لرفع الجدوى الاقتصادية."
            )

        exec_summary = arabic_narrative

        return {
            "executive_summary": exec_summary,
            "pestel": {
                "السياسي (Political)": "دعم حكومي كبير لمشاريع التطوير العمراني في جدة ضمن رؤية 2030 وتنظيمات وزارة البلديات والإسكان.",
                "الاقتصادي (Economic)": f"نمو سنوي متوقع بنسبة {growth_rate}% في قيمة الأصول العقارية بالمنطقة مع توافق أوزان المقارنات.",
                "الاجتماعي (Social)": "تحول ديموغرافي مستمر نحو المجمعات السكنية المغلقة والوحدات الذكية.",
                "التقني (Technological)": "اعتماد منصات PropTech للتثمين والمتابعة الجغرافية والبلدية."
            },
            "roadmap": [
                {"step": "الاستحواذ والتخطيط", "action": "إنهاء إجراءات الإفراغ وبدء التصاميم المعمارية والمطابقة البلدية", "duration": "2-3 أشهر"},
                {"step": "التراخيص والمقاولات", "action": "استخراج رخصة البناء والتعاقد مع المقاول الرئيسي", "duration": "4-5 أشهر"},
                {"step": "التنفيذ والإنشاء", "action": "بناء الهيكل الإنشائي والتشطيبات النهائية", "duration": "12-18 شهر"},
                {"step": "التشغيل والخروج", "action": "بدء التأجير أو عرض الوحدات للبيع النهائي", "duration": "3-6 أشهر"}
            ],
            "recommendation": f"الاستمرار في المشروع مع التركيز على نموذج {feasibility.get('hbu', [{}])[0].get('label', 'التطوير السكني')} لتعظيم العائد."
        }
