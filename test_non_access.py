from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User, RoleUtilisateur
import uuid
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

client = TestClient(app)

def test_non_admin_access_denied():
    # Create NON-ADMIN user (regular client)
    db = SessionLocal()
    try:
        email = "user_test@example.com"
        password = "userpass123"
        nom = "Regular User"

        # Clean up if exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            db.delete(existing)
            db.commit()

        hashed_password = pwd_context.hash(password)
        regular_user = User(
            nom=nom,
            email=email,
            password_hash=hashed_password,
            role=RoleUtilisateur.client  # NOT admin
        )
        db.add(regular_user)
        db.commit()
        db.refresh(regular_user)
        print(f"Created regular user: {regular_user.id}")
    finally:
        db.close()

    # Login as regular user
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, f"Login failed: {response.json()}"
    access_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    print("Login successful")

    # Test admin endpoint - should be DENIED
    response = client.get("/admin/config/", headers=headers)
    print(f"Admin config endpoint status: {response.status_code}")
    if response.status_code == 403:
        print("SUCCESS: Non-admin correctly denied access")
        print(f"Error message: {response.json().get('detail')}")
    else:
        print(f"UNEXPECTED: Expected 403, got {response.status_code}")

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
    test_non_admin_access_denied()