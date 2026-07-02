import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

import os

# Get directory of the current script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def evaluate():
    print("--- Muasher Model Evaluation ---")
    
    # 1. Load Data
    try:
        df = pd.read_csv(os.path.join(BASE_DIR, 'muasher_full_data.csv'))
    except Exception as e:
        print(f"Error loading data: {e}")
        return

    # 2. Load Models and Encoders
    try:
        valuation_model = joblib.load(os.path.join(BASE_DIR, 'valuation_model.pkl'))
        le_neighborhood = joblib.load(os.path.join(BASE_DIR, 'le_neighborhood.pkl'))
        le_type = joblib.load(os.path.join(BASE_DIR, 'le_type.pkl'))
        le_plan = joblib.load(os.path.join(BASE_DIR, 'le_plan.pkl'))
    except Exception as e:
        print(f"Error loading models: {e}")
        return

    # 3. Prepare Data
    df['التاريخ'] = pd.to_datetime(df['التاريخ'], errors='coerce')
    df = df.dropna(subset=['التاريخ', 'الحي', 'نوع العقار', 'المساحة (م2)', 'سعر المتر'])
    df['المخطط'] = df['المخطط'].fillna('غير محدد')

    df['year'] = df['التاريخ'].dt.year
    df['month'] = df['التاريخ'].dt.month
    df['neighborhood_encoded'] = le_neighborhood.transform(df['الحي'])
    df['type_encoded'] = le_type.transform(df['نوع العقار'])
    df['plan_encoded'] = le_plan.transform(df['المخطط'])

    X = df[['neighborhood_encoded', 'type_encoded', 'المساحة (م2)', 'plan_encoded', 'year', 'month']]
    y = df['سعر المتر']
    
    # Split data using the same random state as in training to get the same test set
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 4. Predict
    y_pred = valuation_model.predict(X_test)
    
    # 5. Calculate Metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
    
    print(f"\n[Valuation Model Metrics]")
    print(f"Mean Absolute Error (MAE): {mae:.2f} SAR")
    print(f"Root Mean Squared Error (RMSE): {rmse:.2f} SAR")
    print(f"R-squared (R2) Score: {r2:.4f}")
    print(f"Mean Absolute Percentage Error (MAPE): {mape:.2f}%")
    
    print("\n[Observations]")
    if r2 > 0.8:
        print("Accuracy: Excellent. The model explains most of the variance in prices.")
    elif r2 > 0.6:
        print("Accuracy: Good. The model is reliable for general estimations.")
    else:
        print("Accuracy: Moderate. More features (like building age, finishing quality) could help.")
        
    print(f"\nAverage Price per Meter in Data: {y.mean():.2f} SAR")
    print(f"Error Margin (MAE): ±{mae:.2f} SAR per meter")

if __name__ == "__main__":
    evaluate()
