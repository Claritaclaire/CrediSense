import psycopg

try:
    with psycopg.connect('postgresql://postgres:claire@localhost:5432/credit_simulateur') as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema='public'
                ORDER BY table_name
            """)
            tables = cur.fetchall()
            if tables:
                print('✓ Tables trouvées:')
                for table in tables:
                    print(f'  - {table[0]}')
            else:
                print('✗ Aucune table trouvée')
except Exception as e:
    print(f'✗ Erreur: {e}')
