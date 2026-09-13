import sys
from pathlib import Path
import random

# Use absolute workspace path for backend
backend_dir = "c:/Users/MITHRA/RetainIQ/backend"
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.auth.database import engine, Base

# Make sure tables are created
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_endpoints():
    print("1. Testing Health Check...")
    r = client.get("/health")
    assert r.status_code == 200
    print("Health response:", r.json())

    # Generate a random email to prevent duplicate conflicts
    test_email = f"test_{random.randint(10000, 99999)}@example.com"
    test_pwd = "password123"
    
    print("\n2. Testing Registration...")
    r = client.post("/auth/register", json={
        "full_name": "Test User",
        "email": test_email,
        "password": test_pwd
    })
    assert r.status_code == 200 or r.status_code == 201
    print("Registration response:", r.json())

    print("\n3. Testing Login...")
    r = client.post("/auth/login", json={
        "email": test_email,
        "password": test_pwd
    })
    assert r.status_code == 200
    login_data = r.json()
    token = login_data["access_token"]
    print("Login success. Token retrieved:", token[:15] + "...")

    print("\n4. Testing /predict WITHOUT authentication (should fail with 401)...")
    r = client.post("/predict", json={
        "customer_id": None,
        "features": {
            "CreditScore": 600,
            "Geography": "Germany",
            "Gender": "Male",
            "Age": 40,
            "Tenure": 3,
            "Balance": 60000.0,
            "NumOfProducts": 2,
            "HasCrCard": 1,
            "IsActiveMember": 1,
            "EstimatedSalary": 50000.0
        }
    })
    assert r.status_code == 401
    print("Unauthenticated prediction rejected (401) correctly.")

    print("\n5. Testing /predict WITH authentication...")
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post("/predict", headers=headers, json={
        "customer_id": None,
        "features": {
            "CreditScore": 600,
            "Geography": "Germany",
            "Gender": "Male",
            "Age": 40,
            "Tenure": 3,
            "Balance": 60000.0,
            "NumOfProducts": 2,
            "HasCrCard": 1,
            "IsActiveMember": 1,
            "EstimatedSalary": 50000.0
        }
    })
    assert r.status_code == 200
    pred_data = r.json()
    generated_cust_id = pred_data["customer_id"]
    print("Prediction response probability:", pred_data["probability"])
    print("Generated Customer ID:", generated_cust_id)

    print("\n6. Testing /predictions/history...")
    r = client.get("/predictions/history", headers=headers)
    assert r.status_code == 200
    history = r.json()
    assert len(history) >= 1
    assert history[0]["customer_id"] == generated_cust_id
    print("History retrieved successfully. Count:", len(history))
    print("Latest entry:", history[0])

    print("\n7. Testing /analytics/churn-by-age...")
    r = client.get("/analytics/churn-by-age")
    assert r.status_code == 200
    churn_by_age = r.json()
    print("Churn by Age brackets count:", len(churn_by_age))
    print("Brackets data:", churn_by_age)

    print("\n8. Testing /analytics/insights...")
    r = client.get("/analytics/insights")
    assert r.status_code == 200
    insights = r.json()
    print("Dynamic insights count:", len(insights))
    for ins in insights:
        print(f"- [{ins['tag']}] {ins['text']}")

    print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_endpoints()
