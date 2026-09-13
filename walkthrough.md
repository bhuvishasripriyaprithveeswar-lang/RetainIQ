# Walkthrough - RetainIQ Mock Data Removal & Dynamic Integration

This walkthrough details the work done to replace all mock, static, and illustrative components in RetainIQ with real data-driven services powered by your database, ML stacking models, and datasets.

---
.\venv\Scripts\python -m uvicorn app.main:app --port 8000 --reload

## Changes Implemented

### 1. Database Schema Updates
- **Prediction Record Table**: Added a `PredictionRecord` model (`prediction_history` table) in [`models.py`](file:///c:/Users/MITHRA/RetainIQ/backend/app/auth/models.py) to store prediction outcomes.
  - Columns: `id` (Auto-increment PK), `user_id` (Integer), `customer_id` (String), `prediction` (Integer), `probability` (Float), `segment` (String), `timestamp` (DateTime).

### 2. Backend API Endpoint Enhancements
- **JWT Enforced Predictions**: Integrated a bearer authentication dependency (`get_current_user`) in [`predict.py`](file:///c:/Users/MITHRA/RetainIQ/backend/app/routers/predict.py). Predictions are automatically saved under the logged-in user.
- **Customer ID Generation**: If no `customer_id` is passed, the backend automatically generates a `C-XXXXX` format code, saves it to the SQLite database, and returns it.
- **Predictions History Router**: Registered [`predictions.py`](file:///c:/Users/MITHRA/RetainIQ/backend/app/routers/predictions.py) exposing `GET /predictions/history` returning records specific to the authenticated user.
- **Dynamic Age Churn Cohorts**: Exposed `GET /analytics/churn-by-age` in [`router.py`](file:///c:/Users/MITHRA/RetainIQ/backend/app/analytics/router.py) mapping bins (Under 30, 30-39, 40-49, 50-59, 60+).
- **Dynamic AI Insights**: Exposed `GET /analytics/insights` returning real advisories generated dynamically from regional, activity, product, segment, and SHAP feature importance metrics.

### 3. Frontend Dynamic UI Wiring
- **Axios Interceptor**: Confirmed [`client.ts`](file:///c:/Users/MITHRA/RetainIQ/frontend/src/app/services/client.ts) interceptor automatically appends the user's JWT from storage.
- **Landing Page Stats**: Updated the Landing Page to fetch the total customer count, churn count, churn rate, and model accuracy metrics dynamically using public analytics APIs instead of hardcoding them.
- **Dashboard**:
  - Replaced the month-by-month mockup trend line chart with a **Churn Rate by Age Group** Area/Bar chart.
  - Wired **AI Insights** directly to the backend's computed alert list.
  - Wired **Recent Predictions** to the database history, displaying customer ID, risk score, segment, classification output, and timestamp.
- **Predict Customer Form**: Added a text field for "Customer ID (Optional)".
- **Reports**:
  - Replaced static KPI counters with real statistics calculated dynamically from the SQLite history array (Total runs, high-risk counts, average risk probability, record volume).
  - Wired the log table to display real records and preserved the CSV/PDF report download handlers.

---

## Verification Results

We executed the E2E verification test suite (`verify_retainiq.py`) using the virtual environment interpreter, verifying the following successful execution log:

```text
1. Testing Health Check...
Health response: {'status': 'ok', 'service': 'RetainIQ'}

2. Testing Registration...
Registration response: {'full_name': 'Test User', 'email': 'test_67585@example.com', 'id': 8, 'created_at': '2026-08-22T16:33:46.796257'}

3. Testing Login...
Login success. Token retrieved: eyJhbGciOiJIUzI...

4. Testing /predict WITHOUT authentication (should fail with 401)...
Unauthenticated prediction rejected (401) correctly.

5. Testing /predict WITH authentication...
Prediction response probability: 0.06715597331656711
Generated Customer ID: C-47367

6. Testing /predictions/history...
History retrieved successfully. Count: 1
Latest entry: {'id': 'P-1', 'customer_id': 'C-47367', 'prediction': 0, 'probability': 0.06715597331656711, 'segment': 'Low Engagement', 'timestamp': '2026-08-22T16:34:06.904058'}

7. Testing /analytics/churn-by-age...
Churn by Age brackets count: 5
Brackets data: [
  {'age_group': 'Under 30', 'total': 1641, 'churned': 124, 'churnRate': 0.0756}, 
  {'age_group': '30-39', 'total': 4346, 'churned': 473, 'churnRate': 0.1088}, 
  {'age_group': '40-49', 'total': 2618, 'churned': 806, 'churnRate': 0.3079}, 
  {'age_group': '50-59', 'total': 869, 'churned': 487, 'churnRate': 0.5604}, 
  {'age_group': '60+', 'total': 526, 'churned': 147, 'churnRate': 0.2795}
]

8. Testing /analytics/insights...
Dynamic insights count: 5
- [Critical] Highest regional churn rate is in Germany at 32.4%. (All regions: France (16.2%), Germany (32.4%), Spain (16.7%)).
- [Activity] Inactive members churn 12.6% more than active members (Inactive Churn: 26.9% vs. Active: 14.3%).
- [Products] Customers holding 4 product(s) represent the highest risk group with a 100.0% churn rate.
- [KMeans] The 'High Risk' behavioral cohort comprises 26.2% of the customer base (2,619 customers).
- [SHAP Feature] Explainable AI (SHAP) identifies 'Age' as the most critical driver of customer churn risk across the entire database.

ALL VERIFICATION TESTS PASSED SUCCESSFULLY!
```
