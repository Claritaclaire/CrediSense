from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User, RoleUtilisateur
import uuid
from passlib.context import CryptContext

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
headers = {"Authorization": f"Bearer {access_token}"}

# 3. Try admin endpoint (should succeed)
response = client.get("/admin/config/", headers=headers)
print(f"Admin access: {response.status_code}")
if response.status_code != 200:
    print(f"Unexpected: expected 200, got {response.status_code}")
    print(f"Response: {response.json()}")
    exit(1)
else:
    print("SUCCESS: Admin can access the admin interface")
    # Show some data to confirm it's working
    data = response.json()
    print(f"Received {len(data)} configuration parameters")

# 4. Clean up: delete the user
db = SessionLocal()
try:
    user = db.query(User).filter(User.email == email).first()
    if user:
        db.delete(user)
        db.commit()
        print("Test admin user deleted")
finally:
    db.close()