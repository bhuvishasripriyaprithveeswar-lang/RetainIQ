#!/usr/bin/env python
"""Test backend endpoints"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

print("=" * 60)
print("TESTING BACKEND ENDPOINTS")
print("=" * 60)

# Test 1: Health
print("\n[1] GET /health")
try:
    r = requests.get(f"{BASE_URL}/health")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
except Exception as e:
    print(f"Error: {e}")

# Test 2: Register
print("\n[2] POST /auth/register")
try:
    r = requests.post(f"{BASE_URL}/auth/register", json={
        "full_name": "Test User",
        "email": "test@retainiq.com",
        "password": "password123"
    })
    print(f"Status: {r.status_code}")
    if r.status_code == 201:
        print("Registered successfully")
    else:
        print(f"Response: {r.text}")
except Exception as e:
    print(f"Error: {e}")

# Test 3: Login
print("\n[3] POST /auth/login")
try:
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "test@retainiq.com",
        "password": "password123"
    })
    print(f"Status: {r.status_code}")
    data = r.json()
    if "access_token" in data:
        token = data["access_token"]
        print(f"Token: {token[:30]}...")
        print(f"User: {data['user']['email']}")
    else:
        print(f"Response: {data}")
except Exception as e:
    print(f"Error: {e}")

# Test 4: Analytics - Summary
print("\n[4] GET /analytics/summary")
try:
    r = requests.get(f"{BASE_URL}/analytics/summary")
    print(f"Status: {r.status_code}")
    data = r.json()
    print(f"Total Customers: {data['totalCustomers']}")
    print(f"Churn Count: {data['churnCount']}")
    print(f"Churn Rate: {data['churnRate']*100:.2f}%")
except Exception as e:
    print(f"Error: {e}")

# Test 5: Analytics - Churn by Age
print("\n[5] GET /analytics/churn-by-age")
try:
    r = requests.get(f"{BASE_URL}/analytics/churn-by-age")
    print(f"Status: {r.status_code}")
    data = r.json()
    print(f"Age brackets: {len(data)}")
    if data:
        print(f"Sample: {json.dumps(data[0], indent=2)}")
except Exception as e:
    print(f"Error: {e}")

# Test 6: Analytics - Insights
print("\n[6] GET /analytics/insights")
try:
    r = requests.get(f"{BASE_URL}/analytics/insights")
    print(f"Status: {r.status_code}")
    data = r.json()
    print(f"Insights count: {len(data)}")
    if data:
        print(f"Sample: {data[0]}")
except Exception as e:
    print(f"Error: {e}")

# Test 7: Predictions History (authenticated)
print("\n[7] GET /predictions/history (requires auth)")
try:
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "test@retainiq.com",
        "password": "password123"
    })
    token = r.json()["access_token"]
    
    r = requests.get(
        f"{BASE_URL}/predictions/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {r.status_code}")
    data = r.json()
    print(f"Predictions in history: {len(data)}")
    if data:
        print(f"Sample: {json.dumps(data[0], indent=2)}")
    else:
        print("(No predictions yet - expected on first run)")
except Exception as e:
    print(f"Error: {e}")

print("\n" + "=" * 60)
print("BACKEND VERIFICATION COMPLETE")
print("=" * 60)
