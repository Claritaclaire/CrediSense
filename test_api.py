import requests
import json

base_url = "http://127.0.0.1:8000"

print("=== Test 1: Endpoint racine ===")
try:
    r = requests.get(f"{base_url}/", timeout=5)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

print("\n=== Test 2: Listing offres ===")
try:
    r = requests.get(f"{base_url}/offres/", timeout=5)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

print("\n=== Test 3: Register user ===")
try:
    payload = {
        "nom": "Test User",
        "email": "test@example.com",
        "password": "password123"
    }
    r = requests.post(f"{base_url}/auth/register", json=payload, timeout=5)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

print("\n=== Test 4: Swagger docs ===")
try:
    r = requests.get(f"{base_url}/docs", timeout=5)
    print(f"Status: {r.status_code}")
    print(f"Swagger UI available: True")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
