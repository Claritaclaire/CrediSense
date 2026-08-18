import psycopg2
import os

# Try with different encoding approach
try:
    print("Attempting raw psycopg2 connection with encoding options...")
    
    # Method 1: Try with options parameter
    conn = psycopg2.connect(
        host="127.0.0.1",  # Use IP instead of hostname
        database="credit_simulateur",
        user="postgres",
        port=5432,
        client_encoding="LATIN1"  # Try LATIN1 since byte 0xe9 is 'é' in latin-1
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
