import psycopg2

try:
    print("Attempting raw psycopg2 connection...")
    conn = psycopg2.connect(
        host="localhost",
        database="credit_simulateur",
        user="user",
        password="claire",
        port=5432,
        client_encoding="UTF8"
    )
    print("✓ Connected successfully!")
    cursor = conn.cursor()
    cursor.execute("SELECT version()")
    print("PostgreSQL version:", cursor.fetchone())
    conn.close()
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
