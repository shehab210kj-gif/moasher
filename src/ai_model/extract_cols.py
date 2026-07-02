import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(BASE_DIR, 'Jeddah_RealEstate_Final_Cleaned.xlsx')

if os.path.exists(file_path):
    df = pd.read_excel(file_path)
    with open(os.path.join(BASE_DIR, 'columns.json'), 'w', encoding='utf-8') as f:
        import json
        json.dump(df.columns.tolist(), f, ensure_ascii=False)
    print("Columns saved to columns.json")
else:
    print("File not found")
