from app.database import SessionLocal
from app import models

db = SessionLocal()
try:
    # Try to query SystemParameter - this should fail if table doesn't exist
    params = db.query(models.SystemParameter).all()
    print(f"Success: Retrieved {len(params)} system parameters")
except Exception as e:
    print(f"Error querying SystemParameter: {e}")
    print(f"Error type: {type(e)}")
finally:
    db.close()