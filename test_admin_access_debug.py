from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User, RoleUtilisateur
import uuid

client = TestClient(app)

# Generate random user
unique_id = uuid.uuid4().hex[:8]
email = f"test_{unique_id}@example.com"
password = "testpassword123"
nom = f"Test User {unique_id}"

# 1. Register
response = client.post("/auth/register", json={"nom": nom, "email": email, "password": password})
print(f"Register: {response.status_code}")
if response.status_code != 201:
    print(f"Register failed: {response.json()}")
    exit(1)

# 2. Login
response = client.post("/auth/login", json={"email": email, "password": password})
print(f"Login: {response.status_code}")
if response.status_code != 200:
    print(f"Login failed: {response.json()}")
    exit(1)
access_token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {access_token}"}

# 3. Try admin endpoint (should fail)
response = client.get("/admin/config/", headers=headers)
print(f"Admin access before role change: {response.status_code}")
if response.status_code != 403:
    print(f"Unexpected: expected 403, got {response.status_code}")
    exit(1)

# 4. Update role to admin in the database
db = SessionLocal()
try:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print("User not found")
        exit(1)
    print(f"User role before update: {user.role}")
    user.role = RoleUtilisateur.admin
    db.commit()
    # Refresh to be sure
    db.refresh(user)
    print(f"User role after update: {user.role}")
finally:
    db.close()

# 5. Login again to get new token with admin role
response = client.post("/auth/login", json={"email": email, "password": password})
print(f"Login after role change: {response.status_code}")
if response.status_code != 200:
    print(f"Login failed: {response.json()}")
    exit(1)
access_token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {access_token}"}

# 6. Let's also check the user's role from the token by decoding? Not necessary, but we can get the user via /users/me if exists?
# Instead, let's get the user by id from the token in the database again to confirm.
# We'll decode the token to get the user id (without verification) and then query.
from jose import jwt
from app.config import settings
try:
    decoded = jwt.decode(access_token, settings.secret_key, algorithms=[settings.algorithm])
    user_id = decoded.get("sub")
    print(f"User ID from token: {user_id}")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            print(f"User role from DB after token: {user.role}")
        else:
            print("User not found from token")
    finally:
        db.close()
except Exception as e:
    print(f"Error decoding token: {e}")

# 7. Try admin endpoint again (should succeed)
response = client.get("/admin/config/", headers=headers)
print(f"Admin access after role change: {response.status_code}")
if response.status_code != 200:
    print(f"Unexpected: expected 200, got {response.status_code}")
    print(f"Response: {response.json()}")
    exit(1)

# 8. Clean up: delete the user (optional)
db = SessionLocal()
try:
    user = db.query(User).filter(User.email == email).first()
    if user:
        db.delete(user)
        db.commit()
        print("Test user deleted")
finally:
    db.close()

print("SUCCESS: Admin can access the admin interface")