import urllib.request, json

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYmQ5YjczNS04YTY3LTQzYzAtOWQ1OC0xYzE3OTU2ZjRlZDgiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3ODU4MDU0OTF9.lwTEgn52qmn58c20HNto9aX0ZMiBi7NCYUcEmQUNr_k"
url = "http://127.0.0.1:8000/admin/config/"
headers = {"Authorization": f"Bearer {token}"}
req = urllib.request.Request(url, headers=headers, method='GET')

with urllib.request.urlopen(req) as res:
    print('STATUS', res.status)
    print(res.read().decode('utf-8'))
