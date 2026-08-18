import requests
import json

base_url = "http://127.0.0.1:8000"

print("=== Test 1: Endpoint racine ===")
try:
    r = requests.get(f"{base_url}/", timeout=10)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

print("\n=== Test 2: Listing offres (avec detail erreur) ===")
try:
    r = requests.get(f"{base_url}/offres/", timeout=10)
    print(f"Status: {r.status_code}")
    print(f"Headers: {dict(r.headers)}")
    print(f"Text: {r.text[:500]}")
    try:
        print(f"JSON: {r.json()}")
    except:
        pass
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

print("\n=== Test 3: Health check - openapi.json ===")
try:
    r = requests.get(f"{base_url}/openapi.json", timeout=10)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"Routes available: {list(data.get('paths', {}).keys())}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
