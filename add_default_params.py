from app.database import SessionLocal
from app.models.system_setting import SystemParameter

DEFAULTS = [
    {"key": "base_interest_rate", "value": "0.05", "description": "Taux d'intérêt de base", "is_sensitive": False},
    {"key": "default_margin", "value": "0.02", "description": "Marge appliquée aux offres", "is_sensitive": False},
    {"key": "max_duration_months", "value": "360", "description": "Durée maximale en mois", "is_sensitive": False},
    {"key": "insurance_rate", "value": "0.01", "description": "Taux d'assurance standard", "is_sensitive": False},
    {"key": "dossier_fee", "value": "100", "description": "Frais fixe de dossier", "is_sensitive": False},
]


def main():
    db = SessionLocal()
    try:
        added = []
        for p in DEFAULTS:
            existing = db.query(SystemParameter).filter(SystemParameter.key == p["key"]).first()
            if existing:
                # update description/value if different
                changed = False
                if existing.value != p["value"]:
                    existing.value = p["value"]
                    changed = True
                if (existing.description or "") != p["description"]:
                    existing.description = p["description"]
                    changed = True
                if existing.is_sensitive != p["is_sensitive"]:
                    existing.is_sensitive = p["is_sensitive"]
                    changed = True
                if changed:
                    db.add(existing)
                    added.append(p["key"] + " (updated)")
            else:
                obj = SystemParameter(
                    key=p["key"], value=p["value"], description=p["description"], is_sensitive=p["is_sensitive"]
                )
                db.add(obj)
                added.append(p["key"])
        db.commit()
        print("Done. Added/updated:", added)
    except Exception as e:
        print("Error:", e)
    finally:
        db.close()


if __name__ == "__main__":
    main()
