from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User, RoleUtilisateur
import uuid
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

client = TestClient(app)

def test_admin_access():
    # Create admin user directly in DB
    db = SessionLocal()
    try:
        email = "admin_test@example.com"
        password = "adminpass123"
        nom = "Admin Test User"

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

    # Test admin endpoint - should now work
    response = client.get("/admin/config/", headers=headers)
    print(f"Admin config endpoint status: {response.status_code}")
    if response.status_code == 200:
        print("SUCCESS: Admin can access admin endpoint")
        data = response.json()
        print(f"Retrieved {len(data)} configuration parameters")
    else:
        print(f"FAILED: {response.json()}")
        # For debugging, let's also check what user we get
        try:
            # Decode token to get user ID
            import base64
            import json
            token_parts = access_token.split('.')
            payload = token_parts[1]
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
                    print(f"User from DB: {user.id}, role: {user.role}")
                    print(f"Role type: {type(user.role)}")
                    print(f"Is admin? {user.role == RoleUtilisateur.admin}")
                else:
                    print("User not found in DB")
            finally:
                db.close()
        except Exception as e:
            print(f"Error debugging: {e}")

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
    test_admin_access()