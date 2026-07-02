import os
import pandas as pd
import numpy as np
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except:
    pass

# Get directory of the current script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# قراءة الملف الأصلي الجديد (الذي قمنا بسحبه وتنظيفه مبدئياً)
# تأكد من وضع ملف Jeddah_RealEstate_Final_Cleaned.xlsx في نفس المجلد
file_path = os.path.join(BASE_DIR, 'Jeddah_RealEstate_Final_Cleaned.xlsx')
df = pd.read_excel(file_path)

# تنظيف أسماء الأعمدة
df.columns = [c.strip() for c in df.columns]

# 1. الفلترة: جدة + (قطعة أرض أو شقة) + كامل العقار
allowed_types = ['قطعة أرض', 'شقة']
df_filtered = df[
    (df['المدينة'] == 'جدة') & 
    (df['نوع العقار'].isin(allowed_types)) & 
    (df['مشاع؟'] == 'كامل العقار')
].copy()

# 2. تنظيف البيانات الرقمية
def clean_numeric(x):
    if pd.isna(x): return np.nan
    if isinstance(x, str):
        x = x.replace(',', '').strip()
        if x == '' or x == '-': return np.nan
        try: return float(x)
        except: return np.nan
    return float(x)

# ⚠️ تم تحديث أسماء الأعمدة هنا
df_filtered['السعر (ريال)'] = df_filtered['السعر (ريال)'].apply(clean_numeric)
df_filtered['المساحة (م2)'] = df_filtered['المساحة (م2)'].apply(clean_numeric)
df_filtered['سعر المتر'] = df_filtered['سعر المتر'].apply(clean_numeric)

# حذف الصفوف غير المكتملة
df_filtered = df_filtered.dropna(subset=['السعر (ريال)', 'المساحة (م2)', 'سعر المتر', 'الحي', 'التاريخ'])

# 3. تنظيف متقدم: إزالة التكرارات تماماً لتفادي تسريب البيانات (Data Leakage)
df_filtered = df_filtered.drop_duplicates()

# إزالة القيم الشاذة (Outliers)
df_filtered = df_filtered[df_filtered['سعر المتر'] > 500]
q_high = df_filtered['سعر المتر'].quantile(0.99)
df_filtered = df_filtered[df_filtered['سعر المتر'] < q_high]

# 4. معالجة التواريخ
df_filtered['التاريخ'] = pd.to_datetime(df_filtered['التاريخ'])

# 5. حفظ البيانات النهائية
output_path = os.path.join(BASE_DIR, 'muasher_full_data.csv')
df_filtered.to_csv(output_path, index=False, encoding='utf-8-sig')

print(f"--- Full Data Statistics ---")
print(f"Total Rows: {len(df_filtered)}")
print(f"Property Types: {df_filtered['نوع العقار'].value_counts().to_dict()}")
print(f"Date Range: {df_filtered['التاريخ'].min().date()} to {df_filtered['التاريخ'].max().date()}")
print(f"Cleaned data saved to {output_path}")