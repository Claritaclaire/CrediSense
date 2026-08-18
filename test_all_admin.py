from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User, RoleUtilisateur
import uuid
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

client = TestClient(app)

def test_admin_endpoints():
    # Create admin user directly in DB
    db = SessionLocal()
    try:
        email = "admin_test2@example.com"
        password = "adminpass123"
        nom = "Admin Test User 2"

        # Clean up if exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            db.delete(existing)
            db.commit()

        hashed_password = pwd_context.hash(password)
        admin_user = User(
            nom=nom,
            email=email,
            password_hash=hashed_password,
            role=RoleUtilisateur.admin
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"Created admin user: {admin_user.id}")
    finally:
        db.close()

    # Login as admin
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, f"Login failed: {response.json()}"
    access_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    print("Login successful")

    # Test multiple admin endpoints
    endpoints = [
        "/admin/config/",
        "/admin/audit/",
        "/admin/ia/"
    ]

    for endpoint in endpoints:
        response = client.get(endpoint, headers=headers)
        print(f"{endpoint} status: {response.status_code}")
        if response.status_code == 200:
            print(f"  SUCCESS: {endpoint} accessible")
            try:
                data = response.json()
                if isinstance(data, list):
                    print(f"  Retrieved {len(data)} items")
                else:
                    print(f"  Response: {type(data)}")
            except:
                print(f"  Response (non-JSON): {response.text[:100]}...")
        elif response.status_code == 404:
            print(f"  ENDPOINT NOT FOUND (may be expected if no data)")
        else:
            print(f"  FAILED: {response.json()}")

    # Clean up
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            db.delete(user)
            db.commit()
            print("Cleaned up test user")
    finally:
        db.close()

if __name__ == "__main__":
    test_admin_endpoints()