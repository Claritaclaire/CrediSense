import psycopg

pairs = [
    ('postgres', 'postgres'),
    ('postgres', 'claire'),
    ('user', 'postgres'),
    ('user', 'claire'),
]

for user, pwd in pairs:
    try:
        conn = psycopg.connect(f'postgresql://{user}:{pwd}@localhost:5432/credit_simulateur')
        print('OK', user, pwd)
        conn.close()
        break
    except Exception as e:
        print('FAIL', user, pwd, '->', type(e).__name__, e)
