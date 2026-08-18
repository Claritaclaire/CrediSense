import requests

token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYmQ5YjczNS04YTY3LTQzYzAtOWQ1OC0xYzE3OTU2ZjRlZDgiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3ODU4MDU0OTF9.lwTEgn52qmn58c20HNto9aX0ZMiBi7NCYUcEmQUNr_k'
res = requests.get('http://127.0.0.1:8000/admin/config/', headers={'Authorization': f'Bearer {token}'})
print(res.status_code)
print(res.text)
