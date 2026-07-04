import os
import psycopg2
from dotenv import load_dotenv

# Load .env from the backend-flask/ root (parent of scripts/)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("[Error] DATABASE_URL is not set in environment!")
    exit(1)

if "sslmode" not in DATABASE_URL:
    if "?" in DATABASE_URL:
        DATABASE_URL += "&sslmode=require"
    else:
        DATABASE_URL += "?sslmode=require"

try:
    print("Connecting to Supabase...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Check if admin1 already exists
    cur.execute("SELECT index_number, role, nic FROM users WHERE index_number = %s", ('admin1',))
    row = cur.fetchone()
    
    if row:
        print(f"Admin user 'admin1' already exists. Updating...")
        cur.execute(
            "UPDATE users SET nic = %s, role = %s, full_name = %s WHERE index_number = %s",
            ('admin12345', 'Lecturer', 'Admin One', 'admin1')
        )
    else:
        print("Creating new admin user 'admin1'...")
        cur.execute(
            "INSERT INTO users (index_number, registration_number, full_name, nic, role) VALUES (%s, %s, %s, %s, %s)",
            ('admin1', 'REG-ADMIN1', 'Admin One', 'admin12345', 'Lecturer')
        )
    
    conn.commit()
    print("[Success] Database transaction committed successfully!")
    
    cur.close()
    conn.close()
    print("Done!")
except Exception as e:
    print(f"[Error] Error occurred: {e}")
