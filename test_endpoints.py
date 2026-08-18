from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

tests = [
    ('GET /', 'get', '/'),
    ('GET /offres/', 'get', '/offres/'),
    ('POST /auth/login', 'post', '/auth/login', {'email': 'test@example.com', 'password': 'password123'}),
    ('GET /docs (Swagger)', 'get', '/docs'),
]

print('\n=== API Endpoint Tests ===\n')
for test in tests:
    name = test[0]
    method = test[1]
    path = test[2]
    data = test[3] if len(test) > 3 else None
    
    try:
        if method == 'get':
            r = client.get(path)
        else:
            r = client.post(path, json=data)
        
        status_symbol = '✓' if r.status_code < 400 else '✗'
        print(f'{status_symbol} {name:30} -> {r.status_code}')
        if r.status_code < 400 and r.headers.get('content-type') == 'application/json':
            result = r.json()
            if isinstance(result, dict):
                print(f'  Keys: {list(result.keys())[:3]}')
            elif isinstance(result, list):
                print(f'  Items: {len(result)}')
    except Exception as e:
        print(f'✗ {name:30} -> ERROR: {e}')

print('\n✓ Server is operational!\n')
