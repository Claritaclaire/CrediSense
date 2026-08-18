import urllib.request, json

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYmQ5YjczNS04YTY3LTQzYzAtOWQ1OC0xYzE3OTU2ZjRlZDgiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3ODU4MDU0OTF9.lwTEgn52qmn58c20HNto9aX0ZMiBi7NCYUcEmQUNr_k"
url = "http://127.0.0.1:8000/admin/config/"
headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
payload = {"key": "base_interest_rate", "value": "0.05", "description": "Taux de base", "is_sensitive": False}
req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')

try:
    with urllib.request.urlopen(req) as res:
        body = res.read().decode('utf-8')
        print('STATUS', res.status)
        print('BODY', body)
except urllib.error.HTTPError as e:
    print('ERROR', e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print('EXC', e)
