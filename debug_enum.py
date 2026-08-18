#!/usr/bin/env python3
"""Debug script to test enum comparison"""

import sys
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.models.user import User, RoleUtilisateur
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def test_enum_comparison():
    db = SessionLocal()
    try:
        # Create a test admin user directly in DB
        email = "debug_test@example.com"
        password = "testpassword123"
        nom = "Debug Test User"

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
        print(f"Created admin user with id: {admin_user.id}")
        print(f"User role: {admin_user.role}")
        print(f"User role type: {type(admin_user.role)}")
        print(f"User role value: {admin_user.role.value}")

        # Test various comparisons
        print("\n--- Comparison Tests ---")
        print(f"admin_user.role == RoleUtilisateur.admin: {admin_user.role == RoleUtilisateur.admin}")
        print(f"admin_role from enum: {RoleUtilisateur.admin}")
        print(f"admin_role value: {RoleUtilisateur.admin.value}")
        print(f"user role value: {admin_user.role.value}")
        print(f"Values equal: {admin_user.role.value == RoleUtilisateur.admin.value}")

        # Test the 'in' operator
        allowed_roles = [RoleUtilisateur.admin]
        print(f"\nadmin_user.role in allowed_roles: {admin_user.role in allowed_roles}")
        print(f"Allowed roles: {allowed_roles}")
        print(f"User role: {admin_user.role}")

        # Let's also check what the exiger_role function would do
        print(f"\n--- exiger_role simulation ---")
        if admin_user.role not in [RoleUtilisateur.admin]:
            print("ACCESS DENIED (simulated)")
        else:
            print("ACCESS GRANTED (simulated)")

    finally:
        db.close()

if __name__ == "__main__":
    test_enum_comparison()