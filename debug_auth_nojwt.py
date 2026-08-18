from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User, RoleUtilisateur
import uuid
from passlib.context import CryptContext
import base64
import json

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

client = TestClient(app)

# Generate random user
unique_id = uuid.uuid4().hex[:8]
email = f"admin_{unique_id}@example.com"
password = "adminpassword123"
nom = f"Admin User {unique_id}"

# 1. Create admin user directly in DB
db = SessionLocal()
try:
    # Check if user already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        db.delete(existing)
        db.commit()

    hashed_password = pwd_context.hash(password)
    admin_user = User(
        nom=nom,
        email=email,
        password_hash=hashed_password,
        role=RoleUtilisateur.admin  # Set role to admin directly
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    print(f"Created admin user with id: {admin_user.id}, role: {admin_user.role}")
finally:
    db.close()

# 2. Login as admin
response = client.post("/auth/login", json={"email": email, "password": password})
print(f"Login: {response.status_code}")
if response.status_code != 200:
    print(f"Login failed: {response.json()}")
    exit(1)
access_token = response.json()["access_token"]
print(f"Token: {access_token[:50]}...")
headers = {"Authorization": f"Bearer {access_token}"}

# 3. Decode token to see what's in it (without verification)
try:
    # Split the token and decode the payload
    parts = access_token.split('.')
    if len(parts) >= 2:
        # Add padding if needed
        payload = parts[1]
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += '=' * padding

        decoded = base64.urlsafe_b64decode(payload)
        payload_data = json.loads(decoded)
        print(f"Token payload: {payload_data}")
    else:
        print("Invalid token format")
except Exception as e:
    print(f"Error decoding token: {e}")

# 4. Try admin endpoint (should succeed if role is correct)
response = client.get("/admin/config/", headers=headers)
print(f"Admin access: {response.status_code}")
if response.status_code != 200:
    print(f"Unexpected: expected 200, got {response.status_code}")
    print(f"Response: {response.json()}")

    # Let's debug by checking what user get_current_user returns
    # Check the DB directly using the subject from the token
    try:
        parts = access_token.split('.')
        if len(parts) >= 2:
            payload = parts[1]
            padding = 4 - len(payload) % 4
            if padding != 4:
                payload += '=' * padding
            decoded = base64.urlsafe_b64decode(payload)
            payload_data = json.loads(decoded)
            user_id = payload_data.get("sub")

            db = SessionLocal()
            try:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    print(f"User from DB by token sub: {user.id}, role: {user.role}")
                    print(f"Role type: {type(user.role)}")
                    print(f"Role value: {user.role.value}")
                    print(f"Is admin? {user.role == RoleUtilisateur.admin}")
                    print(f"Expected admin role: {RoleUtilisateur.admin}")
                    print(f"Are they equal? {user.role == RoleUtilisateur.admin}")

                    # Let's also check what the exiger_role function would see
                    from app.models.user import RoleUtilisateur
                    allowed_roles = [RoleUtilisateur.admin]
                    print(f"Allowed roles: {allowed_roles}")
                    print(f"User role in allowed roles? {user.role in allowed_roles}")
                else:
                    print("User not found in DB")
            finally:
                db.close()
    except Exception as e:
        print(f"Error in debug: {e}")
else:
    print("SUCCESS: Admin can access the admin interface")
    # Show some data to confirm it's working
    data = response.json()
    print(f"Received {len(data)} configuration parameters")

# 5. Clean up: delete the user
db = SessionLocal()
try:
    user = db.query(User).filter(User.email == email).first()
    if user:
        db.delete(user)
        db.commit()
        print("Test admin user deleted")
finally:
    db.close()